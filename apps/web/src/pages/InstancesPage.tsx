import { useEffect, useState, useCallback } from 'react';
import { Plus, Smartphone, Wifi, WifiOff, QrCode, Trash2, RefreshCw } from 'lucide-react';
import { instancesService } from '../services/instances.service.ts';
import { useInstanceStore } from '../stores/instanceStore.ts';
import { useSocket } from '../hooks/useSocket.ts';
import { useToast } from '../hooks/useToast.ts';
import type { WhatsAppInstance } from '../types/index.ts';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { Card, CardBody } from '../components/ui/Card.tsx';
import { StatusBadge } from '../components/ui/Badge.tsx';
import { SkeletonCard } from '../components/ui/Skeleton.tsx';
import { formatDate } from '../lib/utils.ts';

export function InstancesPage() {
  const { instances, setInstances, addInstance, removeInstance } = useInstanceStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedQR, setSelectedQR] = useState<{ instanceId: string; qr: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { joinInstance, leaveInstance, onQR } = useSocket();
  const toast = useToast();

  useEffect(() => {
    instancesService
      .list()
      .then(setInstances)
      .catch(() => toast.error('Erro ao carregar instâncias'))
      .finally(() => setIsLoading(false));
  }, [setInstances]);

  useEffect(() => {
    const cleanup = onQR((data) => {
      setSelectedQR(data);
      setShowQRModal(true);
    });
    return cleanup;
  }, [onQR]);

  useEffect(() => {
    instances.forEach((inst) => {
      if (inst.status !== 'disconnected') {
        joinInstance(inst.id);
      }
    });
    return () => {
      instances.forEach((inst) => leaveInstance(inst.id));
    };
  }, [instances.length]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const instance = await instancesService.create(newName.trim());
      addInstance(instance);
      joinInstance(instance.id);
      setShowCreateModal(false);
      setNewName('');
      toast.success('Instância criada! Aguardando QR Code...');
    } catch {
      toast.error('Erro ao criar instância');
    } finally {
      setCreating(false);
    }
  };

  const handleConnect = async (instance: WhatsAppInstance) => {
    setActionLoading(instance.id);
    try {
      // Join socket room BEFORE the HTTP call so we never miss the QR event
      joinInstance(instance.id);
      await instancesService.connect(instance.id);
      toast.info('Aguardando QR Code...');

      // HTTP fallback: if socket event is missed, poll for QR
      let attempts = 0;
      const pollQR = async () => {
        if (attempts++ > 12) return;
        try {
          const res = await instancesService.getQR(instance.id);
          if (res?.qr) {
            setSelectedQR({ instanceId: instance.id, qr: res.qr });
            setShowQRModal(true);
          } else {
            setTimeout(() => void pollQR(), 2000);
          }
        } catch {
          setTimeout(() => void pollQR(), 2000);
        }
      };
      // Start polling after 3s only if modal hasn't opened yet
      setTimeout(() => {
        if (!showQRModal) void pollQR();
      }, 3000);
    } catch {
      toast.error('Erro ao conectar instância');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (instance: WhatsAppInstance) => {
    setActionLoading(instance.id);
    try {
      await instancesService.disconnect(instance.id);
      leaveInstance(instance.id);
      toast.success('Instância desconectada');
    } catch {
      toast.error('Erro ao desconectar instância');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (instance: WhatsAppInstance) => {
    if (!confirm(`Deletar a instância "${instance.name}"?`)) return;
    setActionLoading(instance.id);
    try {
      await instancesService.delete(instance.id);
      removeInstance(instance.id);
      toast.success('Instância deletada');
    } catch {
      toast.error('Erro ao deletar instância');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Instâncias WhatsApp</h1>
          <p className="text-text-secondary text-sm mt-1">Gerencie suas conexões WhatsApp</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={() => setShowCreateModal(true)}
        >
          Nova Instância
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : instances.length === 0 ? (
        <Card className="py-16">
          <div className="text-center">
            <Smartphone size={48} className="mx-auto mb-4 text-text-muted" />
            <h3 className="font-heading text-lg text-text-primary mb-2">Nenhuma instância</h3>
            <p className="text-text-secondary text-sm mb-4">
              Crie uma instância para conectar seu WhatsApp
            </p>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              Criar primeira instância
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {instances.map((instance) => (
            <Card key={instance.id} className="overflow-hidden">
              <CardBody className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-btn bg-green-500/10 flex items-center justify-center">
                      <Smartphone size={18} className="text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-text-primary">{instance.name}</h3>
                      {instance.phoneNumber && (
                        <p className="text-xs text-text-secondary">{instance.phoneNumber}</p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={instance.status} />
                </div>

                <p className="text-xs text-text-muted mb-4">
                  Criado em {formatDate(instance.createdAt)}
                </p>

                <div className="flex items-center gap-2">
                  {instance.status === 'disconnected' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Wifi size={14} />}
                      onClick={() => handleConnect(instance)}
                      loading={actionLoading === instance.id}
                      className="flex-1"
                    >
                      Conectar
                    </Button>
                  ) : instance.status === 'qr' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<QrCode size={14} />}
                      onClick={() => {
                        if (selectedQR?.instanceId === instance.id) {
                          setShowQRModal(true);
                        } else {
                          handleConnect(instance);
                        }
                      }}
                      className="flex-1"
                    >
                      Ver QR Code
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<WifiOff size={14} />}
                      onClick={() => handleDisconnect(instance)}
                      loading={actionLoading === instance.id}
                      className="flex-1"
                    >
                      Desconectar
                    </Button>
                  )}

                  {instance.status === 'qr' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleConnect(instance)}
                      loading={actionLoading === instance.id}
                      title="Recarregar QR"
                    >
                      <RefreshCw size={14} />
                    </Button>
                  )}

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(instance)}
                    loading={actionLoading === instance.id}
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
        title="Nova Instância"
      >
        <div className="space-y-4">
          <Input
            label="Nome da instância"
            placeholder="Ex: Principal, Vendas, Suporte..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={creating}
              disabled={!newName.trim()}
            >
              Criar
            </Button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="Escanear QR Code"
      >
        <div className="text-center space-y-4">
          <p className="text-text-secondary text-sm">
            Abra o WhatsApp no seu celular e escaneie o QR Code abaixo
          </p>
          {selectedQR ? (
            <div className="flex justify-center">
              <img
                src={selectedQR.qr}
                alt="QR Code"
                className="w-56 h-56 rounded-input border border-gold-muted bg-white p-2"
              />
            </div>
          ) : (
            <div className="w-56 h-56 mx-auto bg-bg-tertiary rounded-input border border-gold-muted flex items-center justify-center">
              <RefreshCw size={24} className="text-text-muted animate-spin" />
            </div>
          )}
          <p className="text-xs text-text-muted">
            O QR Code expira em 60 segundos. Se expirar, clique em recarregar.
          </p>
        </div>
      </Modal>
    </div>
  );
}
