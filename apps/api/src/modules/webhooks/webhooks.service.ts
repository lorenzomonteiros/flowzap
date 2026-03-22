import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import crypto from 'crypto';

interface CreateWebhookInput {
  name: string;
  url: string;
  secret?: string;
  events: string[];
}

interface UpdateWebhookInput {
  name?: string;
  url?: string;
  secret?: string;
  events?: string[];
  isActive?: boolean;
}

export class WebhooksService {
  constructor(private prisma: PrismaClient) {}

  async listWebhooks(userId: string) {
    return this.prisma.webhook.findMany({
      where: { userId },
      include: { _count: { select: { logs: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWebhook(webhookId: string, userId: string) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id: webhookId, userId },
    });
    if (!webhook) throw new Error('Webhook not found');
    return webhook;
  }

  async createWebhook(userId: string, input: CreateWebhookInput) {
    return this.prisma.webhook.create({
      data: {
        userId,
        name: input.name,
        url: input.url,
        secret: input.secret,
        events: input.events,
        isActive: true,
      },
    });
  }

  async updateWebhook(webhookId: string, userId: string, input: UpdateWebhookInput) {
    const webhook = await this.prisma.webhook.findFirst({ where: { id: webhookId, userId } });
    if (!webhook) throw new Error('Webhook not found');

    return this.prisma.webhook.update({
      where: { id: webhookId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.url !== undefined && { url: input.url }),
        ...(input.secret !== undefined && { secret: input.secret }),
        ...(input.events !== undefined && { events: input.events }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
  }

  async deleteWebhook(webhookId: string, userId: string) {
    const webhook = await this.prisma.webhook.findFirst({ where: { id: webhookId, userId } });
    if (!webhook) throw new Error('Webhook not found');

    await this.prisma.webhook.delete({ where: { id: webhookId } });
    return { success: true };
  }

  async testWebhook(webhookId: string, userId: string) {
    const webhook = await this.prisma.webhook.findFirst({ where: { id: webhookId, userId } });
    if (!webhook) throw new Error('Webhook not found');

    const payload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook from FlowZap' },
    };

    await this.deliverWebhook(webhook.id, 'test', payload);
    return { success: true };
  }

  async getWebhookLogs(webhookId: string, userId: string) {
    const webhook = await this.prisma.webhook.findFirst({ where: { id: webhookId, userId } });
    if (!webhook) throw new Error('Webhook not found');

    return this.prisma.webhookLog.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async deliverWebhook(webhookId: string, event: string, payload: Record<string, unknown>) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook || !webhook.isActive) return;
    if (!webhook.events.includes(event) && !webhook.events.includes('*')) return;

    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-FlowZap-Event': event,
    };

    if (webhook.secret) {
      const signature = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');
      headers['X-FlowZap-Signature'] = `sha256=${signature}`;
    }

    let statusCode: number | undefined;
    let response: string | undefined;

    try {
      const res = await axios.post(webhook.url, payload, { headers, timeout: 10000 });
      statusCode = res.status;
      response = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        statusCode = error.response?.status;
        response = error.message;
      } else {
        response = 'Unknown error';
      }
    }

    await this.prisma.webhookLog.create({
      data: {
        webhookId,
        event,
        statusCode,
        payload: payload as object,
        response,
      },
    });
  }

  async deliverToUserWebhooks(userId: string, event: string, payload: Record<string, unknown>) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { userId, isActive: true, events: { has: event } },
    });

    await Promise.allSettled(
      webhooks.map((webhook) => this.deliverWebhook(webhook.id, event, payload))
    );
  }
}
