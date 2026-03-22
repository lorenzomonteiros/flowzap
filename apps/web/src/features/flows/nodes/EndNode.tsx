import { Handle, Position, NodeProps } from '@xyflow/react';
import { StopCircle } from 'lucide-react';

export function EndNode({ selected }: NodeProps) {
  return (
    <div
      className={`bg-bg-secondary border rounded-card p-4 min-w-[140px] shadow-card transition-all ${
        selected ? 'border-red-400/60 shadow-[0_0_15px_rgba(248,113,113,0.2)]' : 'border-gold-muted'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gold !border-gold" />

      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded bg-red-500/10 flex items-center justify-center">
          <StopCircle size={14} className="text-red-400" />
        </div>
        <span className="text-sm font-medium text-red-400">Fim</span>
      </div>
    </div>
  );
}
