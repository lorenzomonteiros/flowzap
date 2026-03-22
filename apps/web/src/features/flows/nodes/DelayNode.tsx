import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock } from 'lucide-react';

interface DelayNodeData {
  delaySeconds?: number;
  [key: string]: unknown;
}

export function DelayNode({ data, selected }: NodeProps) {
  const nodeData = data as DelayNodeData;
  const seconds = nodeData.delaySeconds || 5;

  const formatDelay = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.floor(secs / 60)}min`;
    return `${Math.floor(secs / 3600)}h`;
  };

  return (
    <div
      className={`bg-bg-secondary border rounded-card p-4 min-w-[160px] shadow-card transition-all ${
        selected ? 'border-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'border-gold-muted'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gold !border-gold" />

      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded bg-amber-500/10 flex items-center justify-center">
          <Clock size={14} className="text-amber-400" />
        </div>
        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Esperar</span>
      </div>

      <p className="text-xl font-heading font-bold text-amber-400">
        {formatDelay(seconds)}
      </p>

      <Handle type="source" position={Position.Bottom} className="!bg-gold !border-gold" />
    </div>
  );
}
