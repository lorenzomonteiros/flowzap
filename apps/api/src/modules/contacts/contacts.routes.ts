import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ContactsService } from './contacts.service.js';

const createContactSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  name: z.string().optional(),
  email: z.string().email().optional(),
  tags: z.array(z.string()).optional(),
  variables: z.record(z.unknown()).optional(),
});

const updateContactSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  tags: z.array(z.string()).optional(),
  variables: z.record(z.unknown()).optional(),
  optOut: z.boolean().optional(),
});

const contactsRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new ContactsService(fastify.prisma);

  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const result = await service.listContacts(request.user.userId, {
        search: query['search'],
        tag: query['tag'],
        page: query['page'] ? parseInt(query['page']) : 1,
        limit: query['limit'] ? parseInt(query['limit']) : 50,
      });
      return reply.send({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list contacts';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.post('/', async (request, reply) => {
    try {
      const input = createContactSchema.parse(request.body);
      const contact = await service.createContact(request.user.userId, input);
      return reply.status(201).send({ success: true, data: contact });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create contact';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  fastify.post('/import', async (request, reply) => {
    try {
      const body = request.body as { contacts: unknown[] };
      const contacts = z.array(createContactSchema).parse(body.contacts);
      const result = await service.importContacts(request.user.userId, contacts);
      return reply.send({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import contacts';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const contact = await service.getContact(id, request.user.userId);
      return reply.send({ success: true, data: contact });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Contact not found';
      return reply.status(404).send({ success: false, error: message });
    }
  });

  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const input = updateContactSchema.parse(request.body);
      const contact = await service.updateContact(id, request.user.userId, input);
      return reply.send({ success: true, data: contact });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update contact';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await service.deleteContact(id, request.user.userId);
      return reply.send({ success: true, data: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete contact';
      return reply.status(400).send({ success: false, error: message });
    }
  });
};

export default contactsRoutes;
