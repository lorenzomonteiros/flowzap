import { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { X, Settings } from 'lucide-react';
import { Input, Textarea } from '../../components/ui/Input.tsx';
import { Button } from '../../components/ui/Button.tsx';

interface NodeConfigPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  const [localData, setLocalData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (node) {
      setLocalData(node.data as Record<string, unknown>);
    }
  }, [node?.id]);

  if (!node) return null;

  const handleSave = () => {
    onUpdate(node.id, localData);
  };

  const update = (key: string, value: unknown) => {
    setLocalData((prev) => ({ ...prev, [key]: value }));
  };

  const renderConfig = () => {
    switch (node.type) {
      case 'trigger':
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">Tipo de Gatilho</label>
              <select
                value={(localData['triggerType'] as string) || 'manual'}
                onChange={(e) => update('triggerType', e.target.value)}
                className="w-full bg-bg-tertiary border border-gold-muted rounded-input px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/40"
              >
                <option value="manual">Manual</option>
                <option value="keyword">Palavra-chave</option>
                <option value="new-contact">Novo Contato</option>
                <option value="schedule">Agendado</option>
              </select>
            </div>
            {(localData['triggerType'] as string) === 'keyword' && (
              <Input
                label="Palavra-chave"
                placeholder="Ex: OI, INICIO, AJUDA"
                value={(localData['keyword'] as string) || ''}
                onChange={(e) => update('keyword', e.target.value)}
              />
            )}
          </div>
        );

      case 'textMessage':
        return (
          <div className="space-y-4">
            <Textarea
              label="Mensagem"
              placeholder="Digite a mensagem... Use {{nome}}, {{telefone}} para variáveis"
              value={(localData['text'] as string) || ''}
              onChange={(e) => update('text', e.target.value)}
              rows={6}
            />
            <div className="p-3 bg-bg-tertiary rounded-input border border-gold-muted">
              <p className="text-xs text-text-secondary font-medium mb-2">Variáveis disponíveis:</p>
              <div className="flex flex-wrap gap-1.5">
                {['{{nome}}', '{{telefone}}', '{{email}}'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => update('text', ((localData['text'] as string) || '') + v)}
                    className="text-xs bg-gold/10 text-gold border border-gold/20 rounded px-2 py-0.5 hover:bg-gold/20 transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'delay':
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">Tempo de espera</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={86400}
                  value={(localData['delaySeconds'] as number) || 5}
                  onChange={(e) => update('delaySeconds', parseInt(e.target.value))}
                  className="flex-1 bg-bg-tertiary border border-gold-muted rounded-input px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/40"
                />
                <span className="text-sm text-text-secondary">segundos</span>
              </div>
              <div className="flex gap-2 mt-2">
                {[5, 30, 60, 300, 3600].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update('delaySeconds', s)}
                    className="text-xs bg-bg-tertiary border border-gold-muted rounded px-2 py-1 text-text-secondary hover:text-gold hover:border-gold/30 transition-colors"
                  >
                    {s < 60 ? `${s}s` : s < 3600 ? `${s / 60}min` : `${s / 3600}h`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'condition':
        return (
          <div className="space-y-4">
            <Input
              label="Campo"
              placeholder="Ex: nome, tag, variavel"
              value={(localData['field'] as string) || ''}
              onChange={(e) => update('field', e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">Operador</label>
              <select
                value={(localData['operator'] as string) || 'equals'}
                onChange={(e) => update('operator', e.target.value)}
                className="w-full bg-bg-tertiary border border-gold-muted rounded-input px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/40"
              >
                <option value="equals">é igual a</option>
                <option value="notEquals">não é igual a</option>
                <option value="contains">contém</option>
                <option value="notContains">não contém</option>
                <option value="startsWith">começa com</option>
              </select>
            </div>
            <Input
              label="Valor"
              placeholder="Valor para comparar"
              value={(localData['value'] as string) || ''}
              onChange={(e) => update('value', e.target.value)}
            />
          </div>
        );

      case 'addTag':
        return (
          <div className="space-y-4">
            <Input
              label="Tag"
              placeholder="Ex: cliente, lead, qualificado"
              value={(localData['tag'] as string) || ''}
              onChange={(e) => update('tag', e.target.value)}
            />
          </div>
        );

      case 'saveVariable':
        return (
          <div className="space-y-4">
            <Input
              label="Nome da variável"
              placeholder="Ex: produto, plano, interesse"
              value={(localData['variableName'] as string) || ''}
              onChange={(e) => update('variableName', e.target.value)}
            />
            <Input
              label="Valor"
              placeholder="Valor a salvar"
              value={(localData['variableValue'] as string) || ''}
              onChange={(e) => update('variableValue', e.target.value)}
            />
          </div>
        );

      case 'webhook':
        return (
          <div className="space-y-4">
            <Input
              label="URL"
              placeholder="https://..."
              value={(localData['url'] as string) || ''}
              onChange={(e) => update('url', e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">Método</label>
              <select
                value={(localData['method'] as string) || 'POST'}
                onChange={(e) => update('method', e.target.value)}
                className="w-full bg-bg-tertiary border border-gold-muted rounded-input px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/40"
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
              </select>
            </div>
          </div>
        );

      case 'end':
        return (
          <div className="text-center py-4">
            <p className="text-text-secondary text-sm">Este nó encerra o fluxo.</p>
            <p className="text-text-muted text-xs mt-1">Sem configurações necessárias.</p>
          </div>
        );

      default:
        return <p className="text-text-secondary text-sm">Sem configurações disponíveis.</p>;
    }
  };

  const typeLabels: Record<string, string> = {
    trigger: 'Gatilho',
    textMessage: 'Mensagem de Texto',
    delay: 'Espera',
    condition: 'Condição',
    addTag: 'Adicionar Tag',
    saveVariable: 'Salvar Variável',
    webhook: 'Webhook',
    end: 'Fim',
  };

  return (
    <div className="w-72 bg-bg-secondary border-l border-gold-muted h-full flex flex-col animate-slide-in-right">
      <div className="px-4 py-4 border-b border-gold-muted flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={14} className="text-gold" />
          <h3 className="font-heading text-sm font-semibold text-text-primary">
            {typeLabels[node.type || ''] || 'Configurar Bloco'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {renderConfig()}
      </div>

      <div className="p-4 border-t border-gold-muted">
        <Button variant="primary" size="sm" className="w-full" onClick={handleSave}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
