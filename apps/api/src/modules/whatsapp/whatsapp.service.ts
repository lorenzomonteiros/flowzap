import { PrismaClient } from '@prisma/client';
import { WhatsAppManager } from './whatsapp.manager.js';

export class WhatsAppService {
  constructor(
    private prisma: PrismaClient,
    private manager: WhatsAppManager
  ) {}

  async createInstance(userId: string, name: string) {
    const instance = await this.prisma.whatsAppInstance.create({
      data: { userId, name, status: 'disconnected' },
    });
    // Don't auto-connect — user explicitly clicks "Conectar"
    return instance;
  }

  getInstanceQR(instanceId: string): string | null {
    return this.manager.getInstanceQR(instanceId);
  }

  async listInstances(userId: string) {
    return this.prisma.whatsAppInstance.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInstance(instanceId: string, userId: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { id: instanceId, userId },
    });
    if (!instance) throw new Error('Instance not found');
    return instance;
  }

  async connectInstance(instanceId: string, userId: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { id: instanceId, userId },
    });
    if (!instance) throw new Error('Instance not found');

    await this.manager.initInstance(instanceId);
    return { success: true };
  }

  async disconnectInstance(instanceId: string, userId: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { id: instanceId, userId },
    });
    if (!instance) throw new Error('Instance not found');

    await this.manager.disconnectInstance(instanceId);
    return { success: true };
  }

  async deleteInstance(instanceId: string, userId: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { id: instanceId, userId },
    });
    if (!instance) throw new Error('Instance not found');

    try {
      await this.manager.disconnectInstance(instanceId);
    } catch {
      // ignore if already disconnected
    }

    await this.prisma.whatsAppInstance.delete({ where: { id: instanceId } });
    return { success: true };
  }

  async sendMessage(instanceId: string, userId: string, to: string, text: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { id: instanceId, userId },
    });
    if (!instance) throw new Error('Instance not found');

    await this.manager.sendTextMessage(instanceId, to, text);

    const contact = await this.prisma.contact.findFirst({
      where: { phone: to, userId },
    });

    await this.prisma.message.create({
      data: {
        instanceId,
        contactId: contact?.id,
        direction: 'outbound',
        type: 'text',
        content: { text },
        status: 'sent',
        sentAt: new Date(),
      },
    });

    return { success: true };
  }
}
