import { useEffect, useState } from 'react';
import { Users, Plus, Search, Trash2, Edit, Tag, Phone } from 'lucide-react';
import { contactsService } from '../services/contacts.service.ts';
import { useToast } from '../hooks/useToast.ts';
import type { Contact } from '../types/index.ts';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { SkeletonTable } from '../components/ui/Skeleton.tsx';
import { formatDate, formatPhone } from '../lib/utils.ts';

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [form, setForm] = useState({ phone: '', name: '', email: '', tags: '' });
  const [formLoading, setFormLoading] = useState(false);
  const toast = useToast();

  const load = async (p = 1, s = search) => {
    setIsLoading(true);
    try {
      const result = await contactsService.list({ search: s, page: p, limit: 50 });
      setContacts(result.contacts);
      setTotal(result.total);
      setPages(result.pages);
      setPage(p);
    } catch {
      toast.error('Erro ao carregar contatos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(1, search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreate = () => {
    setEditingContact(null);
    setForm({ phone: '', name: '', email: '', tags: '' });
    setShowModal(true);
  };

  const openEdit = (contact: Contact) => {
    setEditingContact(contact);
    setForm({
      phone: contact.phone,
      name: contact.name || '',
      email: contact.email || '',
      tags: contact.tags.join(', '),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.phone.trim()) return;
    setFormLoading(true);
    try {
      const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
      const payload = {
        phone: form.phone.trim(),
        name: form.name.trim() || undefined,
        email: form.email.trim() || undefined,
        tags,
      };

      if (editingContact) {
        const updated = await contactsService.update(editingContact.id, payload);
        setContacts((prev) => prev.map((c) => (c.id === editingContact.id ? updated : c)));
        toast.success('Contato atualizado');
      } else {
        const created = await contactsService.create(payload);
        setContacts((prev) => [created, ...prev]);
        setTotal((t) => t + 1);
        toast.success('Contato criado');
      }
      setShowModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar contato';
      toast.error(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (contact: Contact) => {
    if (!confirm(`Deletar o contato ${contact.name || contact.phone}?`)) return;
    setActionLoading(contact.id);
    try {
      await contactsService.delete(contact.id);
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      setTotal((t) => t - 1);
      toast.success('Contato deletado');
    } catch {
      toast.error('Erro ao deletar contato');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Contatos</h1>
          <p className="text-text-secondary text-sm mt-1">{total} contato{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64">
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={14} />}
            />
          </div>
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>
            Novo Contato
          </Button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={10} />
      ) : contacts.length === 0 ? (
        <Card className="py-16">
          <div className="text-center">
            <Users size={48} className="mx-auto mb-4 text-text-muted" />
            <h3 className="font-heading text-lg text-text-primary mb-2">
              {search ? 'Nenhum contato encontrado' : 'Nenhum contato'}
            </h3>
            <p className="text-text-secondary text-sm mb-4">
              {search ? 'Tente outros termos' : 'Adicione contatos para automatizar'}
            </p>
            {!search && (
              <Button variant="primary" onClick={openCreate}>
                Adicionar contato
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="bg-bg-secondary border border-gold-muted rounded-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold-muted">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Contato
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Telefone
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wide hidden md:table-cell">
                  Tags
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wide hidden lg:table-cell">
                  Criado em
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-muted">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-bg-tertiary transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold text-sm font-bold">
                        {(contact.name || contact.phone).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {contact.name || '—'}
                        </p>
                        {contact.email && (
                          <p className="text-xs text-text-secondary">{contact.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} className="text-text-muted" />
                      <span className="text-sm text-text-primary">{formatPhone(contact.phone)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="gold" size="sm">
                          <Tag size={10} />
                          {tag}
                        </Badge>
                      ))}
                      {contact.tags.length > 3 && (
                        <Badge variant="default" size="sm">+{contact.tags.length - 3}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-text-secondary">{formatDate(contact.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(contact)}
                        title="Editar"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(contact)}
                        loading={actionLoading === contact.id}
                        title="Deletar"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gold-muted">
              <p className="text-sm text-text-secondary">
                Página {page} de {pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => load(page - 1)}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => load(page + 1)}
                  disabled={page === pages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingContact ? 'Editar Contato' : 'Novo Contato'}
      >
        <div className="space-y-4">
          <Input
            label="Telefone *"
            placeholder="5511999999999"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
          <Input
            label="Nome"
            placeholder="Nome do contato"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            placeholder="email@exemplo.com"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
          <Input
            label="Tags (separadas por vírgula)"
            placeholder="cliente, lead, premium"
            value={form.tags}
            onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={formLoading}
              disabled={!form.phone.trim()}
            >
              {editingContact ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
