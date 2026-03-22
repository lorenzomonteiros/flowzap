import { PrismaClient } from '@prisma/client';

interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface FlowTrigger {
  type: string;
  config: Record<string, unknown>;
}

interface CreateFlowInput {
  name: string;
  description?: string;
  trigger: FlowTrigger;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

interface UpdateFlowInput {
  name?: string;
  description?: string;
  trigger?: FlowTrigger;
  nodes?: FlowNode[];
  edges?: FlowEdge[];
  isActive?: boolean;
}

export class FlowsService {
  constructor(private prisma: PrismaClient) {}

  async listFlows(userId: string) {
    return this.prisma.flow.findMany({
      where: { userId },
      include: {
        _count: { select: { executions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getFlow(flowId: string, userId: string) {
    const flow = await this.prisma.flow.findFirst({
      where: { id: flowId, userId },
    });
    if (!flow) throw new Error('Flow not found');
    return flow;
  }

  async createFlow(userId: string, input: CreateFlowInput) {
    return this.prisma.flow.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        trigger: input.trigger as object,
        nodes: input.nodes as object,
        edges: input.edges as object,
        isActive: false,
      },
    });
  }

  async updateFlow(flowId: string, userId: string, input: UpdateFlowInput) {
    const flow = await this.prisma.flow.findFirst({ where: { id: flowId, userId } });
    if (!flow) throw new Error('Flow not found');

    return this.prisma.flow.update({
      where: { id: flowId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.trigger !== undefined && { trigger: input.trigger as object }),
        ...(input.nodes !== undefined && { nodes: input.nodes as object }),
        ...(input.edges !== undefined && { edges: input.edges as object }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
  }

  async deleteFlow(flowId: string, userId: string) {
    const flow = await this.prisma.flow.findFirst({ where: { id: flowId, userId } });
    if (!flow) throw new Error('Flow not found');

    await this.prisma.flow.delete({ where: { id: flowId } });
    return { success: true };
  }

  async toggleFlow(flowId: string, userId: string) {
    const flow = await this.prisma.flow.findFirst({ where: { id: flowId, userId } });
    if (!flow) throw new Error('Flow not found');

    return this.prisma.flow.update({
      where: { id: flowId },
      data: { isActive: !flow.isActive },
    });
  }

  async getFlowExecutions(flowId: string, userId: string) {
    const flow = await this.prisma.flow.findFirst({ where: { id: flowId, userId } });
    if (!flow) throw new Error('Flow not found');

    return this.prisma.flowExecution.findMany({
      where: { flowId },
      include: { contact: true },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  async getDashboardStats(userId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      activeFlows,
      totalContacts,
      messagesToday,
      recentExecutions,
      dailyMessages,
    ] = await Promise.all([
      this.prisma.flow.count({ where: { userId, isActive: true } }),
      this.prisma.contact.count({ where: { userId } }),
      this.prisma.message.count({
        where: {
          instance: { userId },
          createdAt: { gte: startOfDay },
        },
      }),
      this.prisma.flowExecution.findMany({
        where: { flow: { userId } },
        include: { flow: { select: { name: true } }, contact: { select: { name: true, phone: true } } },
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
      this.prisma.message.groupBy({
        by: ['createdAt'],
        where: {
          instance: { userId },
          createdAt: { gte: sevenDaysAgo },
        },
        _count: true,
      }),
    ]);

    const deliveredMessages = await this.prisma.message.count({
      where: { instance: { userId }, status: 'sent' },
    });
    const totalMessages = await this.prisma.message.count({
      where: { instance: { userId } },
    });
    const deliveryRate = totalMessages > 0 ? Math.round((deliveredMessages / totalMessages) * 100) : 0;

    return {
      activeFlows,
      totalContacts,
      messagesToday,
      deliveryRate,
      recentExecutions,
      dailyMessages,
    };
  }
}
