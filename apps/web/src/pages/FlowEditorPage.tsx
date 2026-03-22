import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Save, Play, Pause, Loader2 } from 'lucide-react';
import { flowsService } from '../services/flows.service.ts';
import { useFlowStore } from '../stores/flowStore.ts';
import { useToast } from '../hooks/useToast.ts';
import type { Flow } from '../types/index.ts';
import { Button } from '../components/ui/Button.tsx';
import { Toggle } from '../components/ui/Toggle.tsx';
import { NodePalette } from '../features/flows/NodePalette.tsx';
import { NodeConfigPanel } from '../features/flows/NodeConfigPanel.tsx';
import { TriggerNode } from '../features/flows/nodes/TriggerNode.tsx';
import { TextMessageNode } from '../features/flows/nodes/TextMessageNode.tsx';
import { DelayNode } from '../features/flows/nodes/DelayNode.tsx';
import { ConditionNode } from '../features/flows/nodes/ConditionNode.tsx';
import { EndNode } from '../features/flows/nodes/EndNode.tsx';
import { generateId } from '../lib/utils.ts';

const nodeTypesMap = {
  trigger: TriggerNode,
  textMessage: TextMessageNode,
  delay: DelayNode,
  condition: ConditionNode,
  end: EndNode,
};

function FlowEditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [flowName, setFlowName] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [dragData, setDragData] = useState<{ type: string; data: Record<string, unknown> } | null>(null);
  const reactFlow = useReactFlow();
  const toast = useToast();
  const { updateFlow } = useFlowStore();

  useEffect(() => {
    if (!id) return;
    flowsService
      .get(id)
      .then((f) => {
        setFlow(f);
        setFlowName(f.name);
        setIsActive(f.isActive);
        setNodes(f.nodes as Node[]);
        setEdges(f.edges as Edge[]);
      })
      .catch(() => {
        toast.error('Fluxo não encontrado');
        navigate('/flows');
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, style: { stroke: '#D4AF37', strokeWidth: 2 } }, eds)
      ),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleDragStart = useCallback((type: string, defaultData: Record<string, unknown>) => {
    setDragData({ type, data: defaultData });
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!dragData) return;

      const bounds = event.currentTarget.getBoundingClientRect();
      const position = reactFlow.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNode: Node = {
        id: `${dragData.type}-${generateId()}`,
        type: dragData.type,
        position,
        data: { ...dragData.data },
      };

      setNodes((nds) => [...nds, newNode]);
      setDragData(null);
    },
    [dragData, reactFlow, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleUpdateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data } : n))
      );
      setSelectedNode((prev) => (prev?.id === nodeId ? { ...prev, data } : prev));
      toast.success('Bloco atualizado');
    },
    [setNodes, toast]
  );

  const handleSave = async () => {
    if (!id || !flow) return;
    setIsSaving(true);
    try {
      const updated = await flowsService.update(id, {
        name: flowName,
        nodes: nodes as unknown[],
        edges: edges as unknown[],
        trigger: flow.trigger,
      });
      setFlow(updated);
      updateFlow(id, updated);
      toast.success('Fluxo salvo!');
    } catch {
      toast.error('Erro ao salvar fluxo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (!id) return;
    try {
      const updated = await flowsService.update(id, { isActive: checked });
      setIsActive(updated.isActive);
      updateFlow(id, { isActive: updated.isActive });
      toast.success(updated.isActive ? 'Fluxo ativado' : 'Fluxo desativado');
    } catch {
      toast.error('Erro ao atualizar fluxo');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary">
        <Loader2 size={32} className="text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Top Bar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-bg-secondary border-b border-gold-muted z-10">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft size={14} />}
          onClick={() => navigate('/flows')}
        >
          Voltar
        </Button>

        <div className="flex-1">
          <input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="bg-transparent text-text-primary font-heading font-semibold text-lg focus:outline-none border-b border-transparent focus:border-gold/40 px-1 transition-colors"
            onBlur={handleSave}
          />
        </div>

        <div className="flex items-center gap-3">
          <Toggle
            checked={isActive}
            onChange={handleToggle}
            label={isActive ? 'Ativo' : 'Inativo'}
            size="sm"
          />
          <Button
            variant="primary"
            size="sm"
            leftIcon={isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            onClick={handleSave}
            loading={isSaving}
          >
            Salvar
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex flex-1 overflow-hidden">
        <NodePalette onDragStart={handleDragStart} />

        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypesMap}
            fitView
            deleteKeyCode="Delete"
            defaultEdgeOptions={{
              style: { stroke: '#D4AF37', strokeWidth: 2 },
              animated: true,
            }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              color="rgba(212,175,55,0.12)"
              gap={24}
              size={1.5}
            />
            <Controls />
            <MiniMap
              nodeColor="#D4AF37"
              maskColor="rgba(10,10,10,0.8)"
            />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-text-secondary text-sm">Arraste blocos da esquerda para o canvas</p>
                <p className="text-text-muted text-xs mt-1">ou use o atalho Delete para remover blocos</p>
              </div>
            </div>
          )}
        </div>

        <NodeConfigPanel
          node={selectedNode}
          onUpdate={handleUpdateNodeData}
          onClose={() => setSelectedNode(null)}
        />
      </div>
    </div>
  );
}

export function FlowEditorPage() {
  return (
    <ReactFlowProvider>
      <FlowEditorInner />
    </ReactFlowProvider>
  );
}
