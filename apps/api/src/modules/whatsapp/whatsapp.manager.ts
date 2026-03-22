import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  BaileysEventMap,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { Server as SocketServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import pino from 'pino';

interface InstanceState {
  socket: WASocket;
  qr?: string;
  status: string;
}

const SESSION_BASE_DIR = process.env.SESSIONS_DIR || './sessions';

export class WhatsAppManager {
  private instances: Map<string, InstanceState> = new Map();

  constructor(
    private io: SocketServer,
    private prisma: PrismaClient
  ) {}

  getInstanceQR(instanceId: string): string | null {
    return this.instances.get(instanceId)?.qr ?? null;
  }

  /**
   * Terminates any active socket for this instance, removes all its event
   * listeners (preventing stale-handler race conditions), and deletes session
   * files so the next connection starts completely fresh.
   */
  async clearSession(instanceId: string): Promise<void> {
    const existing = this.instances.get(instanceId);
    if (existing) {
      // Delete from map FIRST so the identity check in event handlers
      // recognises this socket as stale and ignores all its future events.
      this.instances.delete(instanceId);
      try { existing.socket.end(new Error('session_cleared')); } catch { /* ignore */ }
    }

    const sessionDir = path.join(SESSION_BASE_DIR, instanceId);
    try { await fs.rm(sessionDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  async initInstance(instanceId: string, freshStart = false): Promise<void> {
    if (!freshStart) {
      const existing = this.instances.get(instanceId);
      if (
        existing &&
        (existing.status === 'connecting' ||
          existing.status === 'qr' ||
          existing.status === 'connected')
      ) {
        return;
      }
    }

    const instance = await this.prisma.whatsAppInstance.findUnique({
      where: { id: instanceId },
    });
    if (!instance) throw new Error('Instance not found');

    await this.prisma.whatsAppInstance.update({
      where: { id: instanceId },
      data: { status: 'connecting' },
    });
    this.io.to(`instance:${instanceId}`).emit('status', { instanceId, status: 'connecting' });

    const sessionDir = path.join(SESSION_BASE_DIR, instanceId);
    await fs.mkdir(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const logger = pino({ level: 'silent' });

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger,
      browser: ['FlowZap', 'Chrome', '1.0.0'],
      connectTimeoutMs: 60000,
      retryRequestDelayMs: 250,
    });

    // Store the socket immediately
    this.instances.set(instanceId, { socket: sock, status: 'connecting' });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on(
      'connection.update',
      async (update: BaileysEventMap['connection.update']) => {
        // CRITICAL: Check this socket is still the active one before acting.
        // This prevents stale handlers from a replaced socket from corrupting state.
        const current = this.instances.get(instanceId);
        if (!current || current.socket !== sock) {
          return; // This socket was replaced — ignore all its events
        }

        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const QRCode = await import('qrcode');
            const qrDataUrl = await QRCode.toDataURL(qr);

            // Guard again after async operation
            const stillCurrent = this.instances.get(instanceId);
            if (!stillCurrent || stillCurrent.socket !== sock) return;

            this.instances.set(instanceId, { socket: sock, qr: qrDataUrl, status: 'qr' });
            this.io.to(`instance:${instanceId}`).emit('qr', { instanceId, qr: qrDataUrl });
            this.io.to(`instance:${instanceId}`).emit('status', { instanceId, status: 'qr' });
            await this.prisma.whatsAppInstance.update({
              where: { id: instanceId },
              data: { status: 'qr' },
            });
          } catch (err) {
            console.error(`[WhatsApp] Failed to generate QR for ${instanceId}:`, err);
          }
        }

        if (connection === 'close') {
          const errorCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const isLoggedOut = errorCode === DisconnectReason.loggedOut;
          const shouldReconnect = !isLoggedOut;

          console.error(
            `[WhatsApp] Instance ${instanceId} closed. Code: ${errorCode}, reconnect: ${shouldReconnect}`
          );

          this.instances.delete(instanceId);

          this.io.to(`instance:${instanceId}`).emit('status', {
            instanceId,
            status: 'disconnected',
          });
          await this.prisma.whatsAppInstance.update({
            where: { id: instanceId },
            data: { status: 'disconnected', phoneNumber: null },
          });

          // Only auto-reconnect for established sessions that dropped unexpectedly.
          // Never loop on fresh (no-session) connection failures.
          if (shouldReconnect && errorCode !== undefined) {
            setTimeout(() => {
              void this.initInstance(instanceId);
            }, 5000);
          }
        } else if (connection === 'open') {
          const phoneNumber = sock.user?.id?.split(':')[0] || '';

          this.instances.set(instanceId, { socket: sock, status: 'connected' });
          this.io.to(`instance:${instanceId}`).emit('status', {
            instanceId,
            status: 'connected',
            phoneNumber,
          });
          await this.prisma.whatsAppInstance.update({
            where: { id: instanceId },
            data: { status: 'connected', phoneNumber },
          });
        }
      }
    );

    sock.ev.on('messages.upsert', async ({ messages }) => {
      // Guard: only process if this socket is still active
      const current = this.instances.get(instanceId);
      if (!current || current.socket !== sock) return;

      for (const msg of messages) {
        if (!msg.key.fromMe && msg.message) {
          const from = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || '';
          const content =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            '';

          this.io.to(`instance:${instanceId}`).emit('message', {
            instanceId,
            from,
            content,
            timestamp: msg.messageTimestamp,
          });

          try {
            const instanceRecord = await this.prisma.whatsAppInstance.findUnique({
              where: { id: instanceId },
            });
            const contact = await this.prisma.contact.findFirst({
              where: { phone: from, userId: instanceRecord?.userId },
            });

            await this.prisma.message.create({
              data: {
                instanceId,
                contactId: contact?.id,
                direction: 'inbound',
                type: 'text',
                content: { text: content },
                status: 'received',
                sentAt: new Date(),
              },
            });
          } catch (err) {
            console.error(`[WhatsApp] Failed to save message for ${instanceId}:`, err);
          }
        }
      }
    });
  }

  async disconnectInstance(instanceId: string): Promise<void> {
    const state = this.instances.get(instanceId);
    if (state) {
      this.instances.delete(instanceId); // Remove first so identity check ignores stale events
      try { await state.socket.logout(); } catch { /* ignore */ }
    }

    const sessionDir = path.join(SESSION_BASE_DIR, instanceId);
    try { await fs.rm(sessionDir, { recursive: true, force: true }); } catch { /* ignore */ }

    await this.prisma.whatsAppInstance.update({
      where: { id: instanceId },
      data: { status: 'disconnected', phoneNumber: null },
    });
  }

  async sendTextMessage(instanceId: string, to: string, text: string): Promise<void> {
    const state = this.instances.get(instanceId);
    if (!state || state.status !== 'connected') {
      throw new Error('Instance not connected');
    }

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    await state.socket.sendMessage(jid, { text });
  }

  getInstanceStatus(instanceId: string): string {
    return this.instances.get(instanceId)?.status || 'disconnected';
  }

  async initAllInstances(): Promise<void> {
    // On startup, reset any stuck "connecting"/"qr" instances to disconnected
    // (they lost their in-memory socket state when the server restarted)
    await this.prisma.whatsAppInstance.updateMany({
      where: { status: { in: ['connecting', 'qr'] } },
      data: { status: 'disconnected' },
    });

    // Only auto-reconnect instances that were fully connected before restart
    const instances = await this.prisma.whatsAppInstance.findMany({
      where: { status: 'connected' },
    });

    for (const instance of instances) {
      try {
        await this.initInstance(instance.id);
      } catch (error) {
        console.error(`Failed to init instance ${instance.id}:`, error);
      }
    }
  }
}
