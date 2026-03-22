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

  async initInstance(instanceId: string): Promise<void> {
    const instance = await this.prisma.whatsAppInstance.findUnique({
      where: { id: instanceId },
    });
    if (!instance) throw new Error('Instance not found');

    const sessionDir = path.join(SESSION_BASE_DIR, instanceId);
    await fs.mkdir(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const logger = pino({ level: 'silent' });

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger,
      browser: ['FlowZap', 'Chrome', '1.0.0'],
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
        await this.prisma.whatsAppInstance.update({
          where: { id: instanceId },
          data: { status: 'qr' },
        });
      }

      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

        this.io.to(`instance:${instanceId}`).emit('status', {
          instanceId,
          status: 'disconnected',
        });
        await this.prisma.whatsAppInstance.update({
          where: { id: instanceId },
          data: { status: 'disconnected', phoneNumber: null },
        });
        this.instances.delete(instanceId);

        if (shouldReconnect) {
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
      await state.socket.logout();
      this.instances.delete(instanceId);
    }

    const sessionDir = path.join(SESSION_BASE_DIR, instanceId);
    try {
      await fs.rm(sessionDir, { recursive: true });
    } catch {
      // ignore if doesn't exist
    }

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
