import { Worker, Queue, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { WhatsAppManager } from '../modules/whatsapp/whatsapp.manager.js';

interface FlowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

interface ExecutionJobData {
  flowId: string;
  contactId: string;
  executionId: string;
  currentNodeId: string;
  variables: Record<string, unknown>;
  instanceId: string;
}

const QUEUE_NAME = 'flow-execution';

export let flowQueue: Queue<ExecutionJobData>;

export function createFlowExecutionWorker(
  prisma: PrismaClient,
  manager: WhatsAppManager,
  redisUrl: string
) {
  const connection = { url: redisUrl };

  flowQueue = new Queue<ExecutionJobData>(QUEUE_NAME, { connection });

  const worker = new Worker<ExecutionJobData>(
    QUEUE_NAME,
    async (job: Job<ExecutionJobData>) => {
      const { flowId, contactId, executionId, currentNodeId, variables, instanceId } = job.data;

      try {
        const flow = await prisma.flow.findUnique({ where: { id: flowId } });
        if (!flow) throw new Error('Flow not found');

        const nodes = flow.nodes as unknown as FlowNode[];
        const edges = flow.edges as unknown as FlowEdge[];

        const currentNode = nodes.find((n) => n.id === currentNodeId);
        if (!currentNode) {
          await prisma.flowExecution.update({
            where: { id: executionId },
            data: { status: 'completed', completedAt: new Date() },
          });
          return;
        }

        await prisma.flowExecution.update({
          where: { id: executionId },
          data: { currentNode: currentNodeId },
        });

        const contact = await prisma.contact.findUnique({ where: { id: contactId } });
        if (!contact) throw new Error('Contact not found');

        let nextNodeId: string | undefined;

        switch (currentNode.type) {
          case 'textMessage': {
            const text = interpolateVariables(
              (currentNode.data['text'] as string) || '',
              { ...variables, name: contact.name, phone: contact.phone }
            );
            await manager.sendTextMessage(instanceId, contact.phone, text);
            await prisma.message.create({
              data: {
                instanceId,
                contactId,
                direction: 'outbound',
                type: 'text',
                content: { text },
                status: 'sent',
                sentAt: new Date(),
              },
            });
            nextNodeId = getNextNode(edges, currentNodeId);
            break;
          }

          case 'delay': {
            const delayMs = ((currentNode.data['delaySeconds'] as number) || 5) * 1000;
            const nextEdge = edges.find((e) => e.source === currentNodeId);
            if (nextEdge) {
              await flowQueue.add(
                'execute-node',
                { flowId, contactId, executionId, currentNodeId: nextEdge.target, variables, instanceId },
                { delay: delayMs }
              );
            } else {
              await prisma.flowExecution.update({
                where: { id: executionId },
                data: { status: 'completed', completedAt: new Date() },
              });
            }
            return;
          }

          case 'condition': {
            const field = (currentNode.data['field'] as string) || '';
            const operator = (currentNode.data['operator'] as string) || 'equals';
            const value = currentNode.data['value'] as string;
            const allVars = { ...variables, name: contact.name, phone: contact.phone };
            const actual = (allVars as Record<string, unknown>)[field];

            let conditionMet = false;
            switch (operator) {
              case 'equals': conditionMet = String(actual) === String(value); break;
              case 'contains': conditionMet = String(actual).includes(String(value)); break;
              case 'notEquals': conditionMet = String(actual) !== String(value); break;
              default: conditionMet = false;
            }

            const handle = conditionMet ? 'true' : 'false';
            const condEdge = edges.find((e) => e.source === currentNodeId && e.sourceHandle === handle);
            nextNodeId = condEdge?.target;
            break;
          }

          case 'addTag': {
            const tag = (currentNode.data['tag'] as string) || '';
            if (tag && !contact.tags.includes(tag)) {
              await prisma.contact.update({
                where: { id: contactId },
                data: { tags: { push: tag } },
              });
            }
            nextNodeId = getNextNode(edges, currentNodeId);
            break;
          }

          case 'saveVariable': {
            const varName = (currentNode.data['variableName'] as string) || '';
            const varValue = (currentNode.data['variableValue'] as string) || '';
            if (varName) {
              variables[varName] = varValue;
              await prisma.contact.update({
                where: { id: contactId },
                data: { variables: { ...(contact.variables as object), [varName]: varValue } },
              });
            }
            nextNodeId = getNextNode(edges, currentNodeId);
            break;
          }

          case 'end':
          default: {
            await prisma.flowExecution.update({
              where: { id: executionId },
              data: { status: 'completed', completedAt: new Date() },
            });
            return;
          }
        }

        if (nextNodeId) {
          await flowQueue.add('execute-node', {
            flowId, contactId, executionId, currentNodeId: nextNodeId, variables, instanceId,
          });
        } else {
          await prisma.flowExecution.update({
            where: { id: executionId },
            data: { status: 'completed', completedAt: new Date() },
          });
        }
      } catch (error) {
        await prisma.flowExecution.update({
          where: { id: executionId },
          data: {
            status: 'failed',
            completedAt: new Date(),
          },
        });
        throw error;
      }
    },
    { connection }
  );

  return { worker, flowQueue };
}

function getNextNode(edges: FlowEdge[], currentNodeId: string): string | undefined {
  return edges.find((e) => e.source === currentNodeId)?.target;
}

function interpolateVariables(text: string, variables: Record<string, unknown>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] !== undefined ? String(variables[key]) : match;
  });
}

export async function startFlowExecution(
  prisma: PrismaClient,
  flowId: string,
  contactId: string,
  instanceId: string
) {
  const flow = await prisma.flow.findUnique({ where: { id: flowId } });
  if (!flow || !flow.isActive) throw new Error('Flow not found or inactive');

  const nodes = flow.nodes as unknown as FlowNode[];
  const startNode = nodes.find((n) => n.type === 'trigger');
  if (!startNode) throw new Error('No trigger node found');

  const execution = await prisma.flowExecution.create({
    data: {
      flowId,
      contactId,
      status: 'running',
      currentNode: startNode.id,
    },
  });

  const nextEdge = (flow.edges as unknown as FlowEdge[]).find((e) => e.source === startNode.id);
  if (!nextEdge) {
    await prisma.flowExecution.update({
      where: { id: execution.id },
      data: { status: 'completed', completedAt: new Date() },
    });
    return execution;
  }

  await flowQueue.add('execute-node', {
    flowId,
    contactId,
    executionId: execution.id,
    currentNodeId: nextEdge.target,
    variables: {},
    instanceId,
  });

  return execution;
}
