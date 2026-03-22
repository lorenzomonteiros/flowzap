import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

interface ConditionNodeData {
  field?: string;
  operator?: string;
  value?: string;
  [key: string]: unknown;
}

const operatorLabels: Record<string, string> = {
  equals: 'é igual a',
  notEquals: 'não é igual a',
  contains: 'contém',
  notContains: 'não contém',
  startsWith: 'começa com',
};

export function ConditionNode({ data, selected }: NodeProps) {
  const nodeData = data as ConditionNodeData;

  return (
    <div
      className={`bg-bg-secondary border rounded-card p-4 min-w-[200px] shadow-card transition-all ${
        selected ? 'border-purple-400/60 shadow-[0_0_15px_rgba(192,132,252,0.2)]' : 'border-gold-muted'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gold !border-gold" />

      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded bg-purple-500/10 flex items-center justify-center">
          <GitBranch size={14} className="text-purple-400" />
        </div>
        <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Condição</span>
      </div>

      {nodeData.field ? (
        <p className="text-sm text-text-primary">
          <span className="text-gold">{nodeData.field}</span>
          {' '}
          <span className="text-text-secondary">{operatorLabels[nodeData.operator || 'equals']}</span>
          {' '}
          <span className="text-text-primary">"{nodeData.value}"</span>
        </p>
      ) : (
        <p className="text-sm text-text-muted italic">Clique para configurar...</p>
      )}

      {/* True handle */}
      <div className="flex justify-between mt-3 text-xs text-text-secondary">
        <span className="text-green-400">Sim</span>
        <span className="text-red-400">Não</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '25%' }}
        className="!bg-green-500 !border-green-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '75%' }}
        className="!bg-red-500 !border-red-500"
      />
    </div>
  );
}
