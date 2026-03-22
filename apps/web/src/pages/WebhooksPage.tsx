import { useEffect, useState } from 'react';
import { Webhook, Plus, Trash2, Edit, Play, CheckCircle, XCircle, Eye } from 'lucide-react';
import api from '../lib/axios.ts';
import { useToast } from '../hooks/useToast.ts';
import type { Webhook as WebhookType, WebhookLog } from '../types/index.ts';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { Card, CardBody } from '../components/ui/Card.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { Toggle } from '../components/ui/Toggle.tsx';
import { SkeletonCard } from '../components/ui/Skeleton.tsx';
import { formatDateTime } from '../lib/utils.ts';

const AVAILABLE_EVENTS = [
  { value: 'message.received', label: 'Mensagem Recebida' },
  { value: 'message.sent', label: 'Mensagem Enviada' },
  { value: 'contact.created', label: 'Contato Criado' },
  { value: 'flow.execution.started', label: 'Execução Iniciada' },
  { value: 'flow.execution.completed', label: 'Execução Concluída' },
  { value: 'flow.execution.failed', label: 'Execução Falhou' },
  { value: '*', label: 'Todos os Eventos' },
];

export function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', url: '', secret: '', events: [] as string[] });
  const [formLoading, setFormLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api
      .get<{ success: boolean; data: WebhookType[] }>('/webhooks')
      .then((r) => setWebhooks(r.data.data || []))
      .catch(() => toast.error('Erro ao carregar webhooks'))
      .finally(() => setIsLoading(false));
  }, []);

  const openCreate = () => {
    setEditingWebhook(null);
    setForm({ name: '', url: '', secret: '', events: [] });
    setShowModal(true);
  };

  const openEdit = (wh: WebhookType) => {
    setEditingWebhook(wh);
    setForm({ name: wh.name, url: wh.url, secret: wh.secret || '', events: wh.events });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.url || form.events.length === 0) return;
    setFormLoading(true);
    try {
      const payload = {
        name: form.name,
        url: form.url,
        secret: form.secret || undefined,
        events: form.events,
      };

      if (editingWebhook) {
        const r = await api.put<{ success: boolean; data: WebhookType }>(
          `/webhooks/${editingWebhook.id}`,
          payload
        );
        setWebhooks((prev) =>
          prev.map((w) => (w.id === editingWebhook.id ? r.data.data! : w))
        );
        toast.success('Webhook atualizado');
      } else {
        const r = await api.post<{ success: boolean; data: WebhookType }>('/webhooks', payload);
        setWebhooks((prev) => [r.data.data!, ...prev]);
        toast.success('Webhook criado');
      }
      setShowModal(false);
    } catch {
      toast.error('Erro ao salvar webhook');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (wh: WebhookType) => {
    if (!confirm(`Deletar o webhook "${wh.name}"?`)) return;
    setActionLoading(wh.id);
    try {
      await api.delete(`/webhooks/${wh.id}`);
      setWebhooks((prev) => prev.filter((w) => w.id !== wh.id));
      toast.success('Webhook deletado');
    } catch {
      toast.error('Erro ao deletar webhook');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTest = async (wh: WebhookType) => {
    setActionLoading(wh.id + '-test');
    try {
      await api.post(`/webhooks/${wh.id}/test`);
      toast.success('Webhook de teste enviado!');
    } catch {
      toast.error('Erro ao testar webhook');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (wh: WebhookType) => {
    try {
      const r = await api.put<{ success: boolean; data: WebhookType }>(`/webhooks/${wh.id}`, {
        isActive: !wh.isActive,
      });
      setWebhooks((prev) => prev.map((w) => (w.id === wh.id ? r.data.data! : w)));
    } catch {
      toast.error('Erro ao atualizar webhook');
    }
  };

  const handleViewLogs = async (wh: WebhookType) => {
    setShowLogsModal(true);
    setLogsLoading(true);
    try {
      const r = await api.get<{ success: boolean; data: WebhookLog[] }>(`/webhooks/${wh.id}/logs`);
      setLogs(r.data.data || []);
    } catch {
      toast.error('Erro ao carregar logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const toggleEvent = (event: string) => {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Webhooks</h1>
          <p className="text-text-secondary text-sm mt-1">Receba notificações em tempo real</p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>
          Novo Webhook
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : webhooks.length === 0 ? (
        <Card className="py-16">
          <div className="text-center">
            <Webhook size={48} className="mx-auto mb-4 text-text-muted" />
            <h3 className="font-heading text-lg text-text-primary mb-2">Nenhum webhook</h3>
            <p className="text-text-secondary text-sm mb-4">
              Configure webhooks para receber notificações de eventos
            </p>
            <Button variant="primary" onClick={openCreate}>
              Criar webhook
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {webhooks.map((wh) => (
            <Card key={wh.id}>
              <CardBody className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-btn bg-orange-500/10 flex items-center justify-center">
                      <Webhook size={16} className="text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-text-primary">{wh.name}</h3>
                      <p className="text-xs text-text-secondary truncate max-w-[200px]">{wh.url}</p>
                    </div>
                  </div>
                  <Toggle checked={wh.isActive} onChange={() => handleToggleActive(wh)} size="sm" />
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {wh.events.slice(0, 3).map((ev) => (
                    <Badge key={ev} variant="default" size="sm">{ev}</Badge>
                  ))}
                  {wh.events.length > 3 && (
                    <Badge variant="default" size="sm">+{wh.events.length - 3}</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Edit size={14} />}
                    onClick={() => openEdit(wh)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Play size={14} />}
                    onClick={() => handleTest(wh)}
                    loading={actionLoading === wh.id + '-test'}
                    title="Testar"
                  >
                    Testar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Eye size={14} />}
                    onClick={() => handleViewLogs(wh)}
                  >
                    Logs
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(wh)}
                    loading={actionLoading === wh.id}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            placeholder="Ex: Notificações de vendas"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="URL"
            placeholder="https://seu-servidor.com/webhook"
            value={form.url}
            onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
          />
          <Input
            label="Segredo (opcional)"
            placeholder="Para verificar assinatura"
            value={form.secret}
            onChange={(e) => setForm((p) => ({ ...p, secret: e.target.value }))}
          />
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">Eventos</label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_EVENTS.map((ev) => (
                <label key={ev.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.events.includes(ev.value)}
                    onChange={() => toggleEvent(ev.value)}
                    className="accent-gold"
                  />
                  <span className="text-sm text-text-secondary">{ev.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={formLoading}
              disabled={!form.name || !form.url || form.events.length === 0}
            >
              {editingWebhook ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Logs Modal */}
      <Modal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        title="Logs do Webhook"
        size="xl"
      >
        {logsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-bg-tertiary rounded animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-text-secondary text-sm py-8">Nenhum log registrado</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-input border border-gold-muted text-sm"
              >
                {log.statusCode && log.statusCode < 300 ? (
                  <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle size={14} className="text-red-400 flex-shrink-0" />
                )}
                <Badge variant={log.statusCode && log.statusCode < 300 ? 'success' : 'danger'} size="sm">
                  {log.statusCode || 'ERR'}
                </Badge>
                <span className="text-text-secondary">{log.event}</span>
                <span className="text-text-muted ml-auto">{formatDateTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
