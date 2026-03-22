import { PrismaClient } from '@prisma/client';

interface CreateContactInput {
  phone: string;
  name?: string;
  email?: string;
  tags?: string[];
  variables?: Record<string, unknown>;
}

interface UpdateContactInput {
  name?: string;
  email?: string;
  tags?: string[];
  variables?: Record<string, unknown>;
  optOut?: boolean;
}

interface ListContactsOptions {
  search?: string;
  tag?: string;
  page?: number;
  limit?: number;
}

export class ContactsService {
  constructor(private prisma: PrismaClient) {}

  async listContacts(userId: string, options: ListContactsOptions = {}) {
    const { search, tag, page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(search && {
        OR: [
          { phone: { contains: search } },
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(tag && { tags: { has: tag } }),
    };

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { contacts, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getContact(contactId: string, userId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, userId },
    });
    if (!contact) throw new Error('Contact not found');
    return contact;
  }

  async createContact(userId: string, input: CreateContactInput) {
    const existing = await this.prisma.contact.findFirst({
      where: { userId, phone: input.phone },
    });
    if (existing) throw new Error('Contact with this phone already exists');

    return this.prisma.contact.create({
      data: {
        userId,
        phone: input.phone,
        name: input.name,
        email: input.email,
        tags: input.tags || [],
        variables: (input.variables || {}) as object,
      },
    });
  }

  async updateContact(contactId: string, userId: string, input: UpdateContactInput) {
    const contact = await this.prisma.contact.findFirst({ where: { id: contactId, userId } });
    if (!contact) throw new Error('Contact not found');

    return this.prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.tags !== undefined && { tags: input.tags }),
        ...(input.variables !== undefined && { variables: input.variables as object }),
        ...(input.optOut !== undefined && { optOut: input.optOut }),
      },
    });
  }

  async deleteContact(contactId: string, userId: string) {
    const contact = await this.prisma.contact.findFirst({ where: { id: contactId, userId } });
    if (!contact) throw new Error('Contact not found');

    await this.prisma.contact.delete({ where: { id: contactId } });
    return { success: true };
  }

  async importContacts(userId: string, contacts: CreateContactInput[]) {
    const results = { created: 0, skipped: 0, errors: 0 };

    for (const contact of contacts) {
      try {
        const existing = await this.prisma.contact.findFirst({
          where: { userId, phone: contact.phone },
        });
        if (existing) {
          results.skipped++;
          continue;
        }

        await this.prisma.contact.create({
          data: {
            userId,
            phone: contact.phone,
            name: contact.name,
            email: contact.email,
            tags: contact.tags || [],
            variables: (contact.variables || {}) as object,
          },
        });
        results.created++;
      } catch {
        results.errors++;
      }
    }

    return results;
  }
}
