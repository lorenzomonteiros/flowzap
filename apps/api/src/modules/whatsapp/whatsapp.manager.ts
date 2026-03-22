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

  async clearSession(instanceId: string): Promise<void> {
    // Terminate any active socket first
    const existing = this.instances.get(instanceId);
    if (existing) {
      try { existing.socket.end(undefined); } catch { /* ignore */ }
      this.instances.delete(instanceId);
    }
    // Remove session files so Baileys starts completely fresh
    const sessionDir = path.join(SESSION_BASE_DIR, instanceId);
    try { await fs.rm(sessionDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  async initInstance(instanceId: string, freshStart = false): Promise<void> {
    if (!freshStart) {
      // Guard: don't double-init if already connecting or in qr state
      const existing = this.instances.get(instanceId);
      if (existing && (existing.status === 'connecting' || existing.status === 'qr' || existing.status === 'connected')) {
        return;
      }
    }

    const instance = await this.prisma.whatsAppInstance.findUnique({
      where: { id: instanceId },
    });
    if (!instance) throw new Error('Instance not found');

    // Update DB and emit status immediately so UI reflects connecting state
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
      connectTimeoutMs: 30000,
    });

    this.instances.set(instanceId, { socket: sock, status: 'connecting' });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update: BaileysEventMap['connection.update']) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const QRCode = await import('qrcode');
        const qrDataUrl = await QRCode.toDataURL(qr);
        this.instances.set(instanceId, { socket: sock, qr: qrDataUrl, status: 'qr' });
        this.io.to(`instance:${instanceId}`).emit('qr', { instanceId, qr: qrDataUrl });
        this.io.to(`instance:${instanceId}`).emit('status', { instanceId, status: 'qr' });
        await this.prisma.whatsAppInstance.update({
          where: { id: instanceId },
          data: { status: 'qr' },
        });
      }

      if (connection === 'close') {
        const errorCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = errorCode !== DisconnectReason.loggedOut;

        console.error(`[WhatsApp] Instance ${instanceId} disconnected. Code: ${errorCode}, shouldReconnect: ${shouldReconnect}`);

        this.io.to(`instance:${instanceId}`).emit('status', {
          instanceId,
          status: 'disconnected',
        });
        await this.prisma.whatsAppInstance.update({
          where: { id: instanceId },
          data: { status: 'disconnected', phoneNumber: null },
        });
        this.instances.delete(instanceId);

        // Only auto-reconnect if we had a valid session (connected before),
        // never loop on fresh QR connection failures
        if (shouldReconnect && errorCode !== DisconnectReason.restartRequired) {
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
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (!msg.key.fromMe && msg.message) {
          const from = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || '';
          const content = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

          this.io.to(`instance:${instanceId}`).emit('message', {
            instanceId,
            from,
            content,
            timestamp: msg.messageTimestamp,
          });

          const instanceRecord = await this.prisma.whatsAppInstance.findUnique({ where: { id: instanceId } });
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
        }
      }
    });
  }

  async disconnectInstance(instanceId: string): Promise<void> {
    const state = this.instances.get(instanceId);
    if (state) {
      try { await state.socket.logout(); } catch { /* ignore */ }
      this.instances.delete(instanceId);
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
    const state = this.instances.get(instanceId);
    return state?.status || 'disconnected';
  }

  async initAllInstances(): Promise<void> {
    const instances = await this.prisma.whatsAppInstance.findMany({
      where: { status: { not: 'disconnected' } },
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
