import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';

interface TextMessageNodeData {
  text?: string;
  [key: string]: unknown;
}

export function TextMessageNode({ data, selected }: NodeProps) {
  const nodeData = data as TextMessageNodeData;
  const text = nodeData.text as string | undefined;

  return (
    <div
      className={`bg-bg-secondary border rounded-card p-4 min-w-[200px] max-w-[280px] shadow-card transition-all ${
        selected ? 'border-blue-400/60 shadow-[0_0_15px_rgba(96,165,250,0.2)]' : 'border-gold-muted'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gold !border-gold" />

      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded bg-blue-500/10 flex items-center justify-center">
          <MessageSquare size={14} className="text-blue-400" />
        </div>
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Mensagem</span>
      </div>

      <p className="text-sm text-text-primary line-clamp-3">
        {text || <span className="text-text-muted italic">Clique para configurar...</span>}
      </p>

      <Handle type="source" position={Position.Bottom} className="!bg-gold !border-gold" />
    </div>
  );
}
