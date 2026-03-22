import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  GitBranch,
  Play,
  Pause,
  Trash2,
  Edit,
  Search,
  Zap,
} from 'lucide-react';
import { flowsService } from '../services/flows.service.ts';
import { useFlowStore } from '../stores/flowStore.ts';
import { useToast } from '../hooks/useToast.ts';
import type { Flow } from '../types/index.ts';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { Card, CardBody } from '../components/ui/Card.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { Toggle } from '../components/ui/Toggle.tsx';
import { SkeletonCard } from '../components/ui/Skeleton.tsx';
import { formatRelativeTime } from '../lib/utils.ts';

export function FlowsPage() {
  const { flows, setFlows, updateFlow, removeFlow } = useFlowStore();
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDesc, setNewFlowDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    flowsService
      .list()
      .then(setFlows)
      .catch(() => toast.error('Erro ao carregar fluxos'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newFlowName.trim()) return;
    setCreating(true);
    try {
      const flow = await flowsService.create({
        name: newFlowName.trim(),
        description: newFlowDesc.trim() || undefined,
        trigger: { type: 'manual', config: {} },
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 300, y: 100 },
            data: { label: 'Início', triggerType: 'manual' },
          },
        ],
        edges: [],
      });
      setFlows([flow, ...flows]);
      setShowCreateModal(false);
      setNewFlowName('');
      setNewFlowDesc('');
      navigate(`/flows/${flow.id}/edit`);
    } catch {
      toast.error('Erro ao criar fluxo');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (flow: Flow) => {
    setActionLoading(flow.id);
    try {
      const updated = await flowsService.toggle(flow.id);
      updateFlow(flow.id, { isActive: updated.isActive });
      toast.success(updated.isActive ? 'Fluxo ativado' : 'Fluxo desativado');
    } catch {
      toast.error('Erro ao atualizar fluxo');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (flow: Flow) => {
    if (!confirm(`Deletar o fluxo "${flow.name}"?`)) return;
    setActionLoading(flow.id);
    try {
      await flowsService.delete(flow.id);
      removeFlow(flow.id);
      toast.success('Fluxo deletado');
    } catch {
      toast.error('Erro ao deletar fluxo');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = flows.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Fluxos de Automação</h1>
          <p className="text-text-secondary text-sm mt-1">
            {flows.length} fluxo{flows.length !== 1 ? 's' : ''} •{' '}
            {flows.filter((f) => f.isActive).length} ativo{flows.filter((f) => f.isActive).length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64">
            <Input
              placeholder="Buscar fluxos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={14} />}
            />
          </div>
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={() => setShowCreateModal(true)}
          >
            Novo Fluxo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-16">
          <div className="text-center">
            <GitBranch size={48} className="mx-auto mb-4 text-text-muted" />
            <h3 className="font-heading text-lg text-text-primary mb-2">
              {search ? 'Nenhum fluxo encontrado' : 'Nenhum fluxo criado'}
            </h3>
            <p className="text-text-secondary text-sm mb-4">
              {search ? 'Tente outros termos de busca' : 'Crie seu primeiro fluxo de automação'}
            </p>
            {!search && (
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                Criar primeiro fluxo
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((flow) => (
            <Card key={flow.id} hover>
              <CardBody className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-btn flex items-center justify-center ${
                        flow.isActive ? 'bg-gold/10' : 'bg-bg-tertiary'
                      }`}
                    >
                      <Zap size={16} className={flow.isActive ? 'text-gold' : 'text-text-muted'} />
                    </div>
                    <div>
                      <h3 className="font-medium text-text-primary">{flow.name}</h3>
                      {flow.description && (
                        <p className="text-xs text-text-secondary mt-0.5">{flow.description}</p>
                      )}
                    </div>
                  </div>
                  <Toggle
                    checked={flow.isActive}
                    onChange={() => handleToggle(flow)}
                    disabled={actionLoading === flow.id}
                    size="sm"
                  />
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Badge variant={flow.isActive ? 'success' : 'default'}>
                    {flow.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {flow._count && (
                    <Badge variant="info">
                      {flow._count.executions} execuç{flow._count.executions !== 1 ? 'ões' : 'ão'}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-text-muted mb-4">
                  Atualizado {formatRelativeTime(flow.updatedAt)}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Edit size={14} />}
                    onClick={() => navigate(`/flows/${flow.id}/edit`)}
                    className="flex-1"
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(flow)}
                    loading={actionLoading === flow.id}
                    title={flow.isActive ? 'Pausar' : 'Ativar'}
                  >
                    {flow.isActive ? <Pause size={14} /> : <Play size={14} />}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(flow)}
                    loading={actionLoading === flow.id}
                    title="Deletar"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Novo Fluxo"
      >
        <div className="space-y-4">
          <Input
            label="Nome do fluxo"
            placeholder="Ex: Boas-vindas, Qualificação..."
            value={newFlowName}
            onChange={(e) => setNewFlowName(e.target.value)}
          />
          <Input
            label="Descrição (opcional)"
            placeholder="Descreva o objetivo deste fluxo"
            value={newFlowDesc}
            onChange={(e) => setNewFlowDesc(e.target.value)}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={creating}
              disabled={!newFlowName.trim()}
            >
              Criar e Editar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
