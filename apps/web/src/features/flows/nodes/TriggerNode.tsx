import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';

interface TriggerNodeData {
  label?: string;
  triggerType?: string;
  [key: string]: unknown;
}

export function TriggerNode({ data, selected }: NodeProps) {
  const nodeData = data as TriggerNodeData;

  const triggerLabels: Record<string, string> = {
    manual: 'Manual',
    keyword: 'Palavra-chave',
    schedule: 'Agendado',
    webhook: 'Webhook',
    'new-contact': 'Novo Contato',
  };

  return (
    <div
      className={`bg-bg-secondary border rounded-card p-4 min-w-[180px] shadow-card transition-all ${
        selected
          ? 'border-gold shadow-gold'
          : 'border-gold/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded bg-gold/20 flex items-center justify-center">
          <Zap size={14} className="text-gold" />
        </div>
        <span className="text-xs font-semibold text-gold uppercase tracking-wide">Gatilho</span>
      </div>
      <p className="text-sm font-medium text-text-primary">
        {nodeData.label || triggerLabels[nodeData.triggerType as string] || 'Início'}
      </p>
      {nodeData.triggerType === 'keyword' && Boolean(nodeData['keyword']) && (
        <p className="text-xs text-text-secondary mt-1">&quot;{String(nodeData['keyword'])}&quot;</p>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gold !border-gold"
      />
    </div>
  );
}
