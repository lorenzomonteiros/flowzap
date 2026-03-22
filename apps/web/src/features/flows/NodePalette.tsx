import { MessageSquare, Clock, GitBranch, StopCircle, Tag, Variable, Webhook, Image } from 'lucide-react';

interface NodeType {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  defaultData: Record<string, unknown>;
}

const nodeTypes: NodeType[] = [
  {
    type: 'textMessage',
    label: 'Mensagem de Texto',
    description: 'Envia uma mensagem de texto',
    icon: <MessageSquare size={16} />,
    color: 'text-blue-400 bg-blue-500/10',
    defaultData: { text: '' },
  },
  {
    type: 'delay',
    label: 'Espera',
    description: 'Aguarda um tempo antes de continuar',
    icon: <Clock size={16} />,
    color: 'text-amber-400 bg-amber-500/10',
    defaultData: { delaySeconds: 5 },
  },
  {
    type: 'condition',
    label: 'Condição',
    description: 'Bifurca o fluxo com base em uma condição',
    icon: <GitBranch size={16} />,
    color: 'text-purple-400 bg-purple-500/10',
    defaultData: { field: '', operator: 'equals', value: '' },
  },
  {
    type: 'addTag',
    label: 'Adicionar Tag',
    description: 'Adiciona uma tag ao contato',
    icon: <Tag size={16} />,
    color: 'text-green-400 bg-green-500/10',
    defaultData: { tag: '' },
  },
  {
    type: 'saveVariable',
    label: 'Salvar Variável',
    description: 'Salva um valor em uma variável',
    icon: <Variable size={16} />,
    color: 'text-cyan-400 bg-cyan-500/10',
    defaultData: { variableName: '', variableValue: '' },
  },
  {
    type: 'webhook',
    label: 'Webhook',
    description: 'Dispara uma requisição HTTP',
    icon: <Webhook size={16} />,
    color: 'text-orange-400 bg-orange-500/10',
    defaultData: { url: '', method: 'POST' },
  },
  {
    type: 'end',
    label: 'Fim',
    description: 'Encerra o fluxo',
    icon: <StopCircle size={16} />,
    color: 'text-red-400 bg-red-500/10',
    defaultData: {},
  },
];

interface NodePaletteProps {
  onDragStart: (type: string, defaultData: Record<string, unknown>) => void;
}

export function NodePalette({ onDragStart }: NodePaletteProps) {
  return (
    <div className="w-64 bg-bg-secondary border-r border-gold-muted h-full flex flex-col">
      <div className="px-4 py-4 border-b border-gold-muted">
        <h3 className="font-heading text-sm font-semibold text-text-primary">Blocos</h3>
        <p className="text-xs text-text-secondary mt-0.5">Arraste para o canvas</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {nodeTypes.map((nt) => (
          <div
            key={nt.type}
            draggable
            onDragStart={() => onDragStart(nt.type, nt.defaultData)}
            className="flex items-start gap-3 p-3 bg-bg-tertiary border border-gold-muted rounded-btn cursor-grab active:cursor-grabbing hover:border-gold/30 transition-all hover:bg-[#222] select-none"
          >
            <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${nt.color}`}>
              {nt.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">{nt.label}</p>
              <p className="text-xs text-text-secondary mt-0.5">{nt.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
