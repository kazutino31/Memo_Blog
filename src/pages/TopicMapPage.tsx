import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import dagre from "dagre";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  topicNodes,
  topicEdges,
  relationLabels,
  type TopicNode as TopicNodeData,
} from "@/content/topicGraph";

const nodeWidth = 220;
const nodeHeight = 80;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

const HANDLE_STYLE = {
  opacity: 0,
  width: 1,
  height: 1,
  minWidth: 1,
  minHeight: 1,
  border: "none",
};

function TopicNodeCard({ data }: NodeProps) {
  const node = data as unknown as TopicNodeData & {
    onOpen: (slug: string) => void;
  };
  return (
    <div
      className="w-55 cursor-pointer rounded-lg border border-(--rule-strong) bg-(--paper) px-4 py-3 shadow-sm transition-colors hover:border-(--accent-ink) hover:shadow-md"
      onClick={() => node.onOpen(node.slug)}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={HANDLE_STYLE}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        style={HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={HANDLE_STYLE}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        style={HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={HANDLE_STYLE}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={HANDLE_STYLE}
      />

      <div className="mb-1 text-[15px] font-semibold text-[(--ink)] font-[(--serif)]">
        {node.title}
      </div>
      <div className="text-[12px] leading-snug text-[(--ink-soft)]">
        {node.category}
      </div>
    </div>
  );
}

const nodeTypes = { topic: TopicNodeCard };

export default function TopicMapPage() {
  const navigate = useNavigate();

  const handleOpen = useCallback(
    (slug: string) => navigate(`/notes/${slug}`),
    [navigate],
  );

  const initialNodes: Node[] = useMemo(
    () =>
      topicNodes.map((n) => ({
        id: n.id,
        type: "topic",
        position: { x: 0, y: 0 },
        data: { ...n, onOpen: handleOpen },
      })),
    [handleOpen],
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      topicEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: relationLabels[e.relation],
        labelStyle: { fill: "var(--ink-soft)", fontSize: 12 },
        labelBgStyle: { fill: "var(--paper)", fillOpacity: 0.9 },
        style: { stroke: "var(--rule-strong)" },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "var(--rule-strong)",
        },
        type: "smoothstep",
      })),
    [],
  );

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(initialNodes, initialEdges),
    [initialNodes, initialEdges],
  );

  const [nodes, , onNodesChange] = useNodesState(layoutedNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutedEdges);

  return (
    <div>
      <header className="mx-auto max-w-230 border-b border-[(--rule)] px-6 pt-18 pb-10 max-[640px]:px-5 max-[640px]:pt-12 max-[640px]:pb-8">
        <div className="mb-4.5 text-[13px] font-semibold tracking-wider text-[(--accent-ink)] uppercase">
          主題關聯圖
        </div>
        <h1 className="mb-5 max-w-[16ch] text-[clamp(34px,5vw,52px)] leading-[1.12] font-bold tracking-tight text-[(--ink)] font-[(--serif)]">
          筆記主題關聯心智圖
        </h1>
        <p className="max-w-140 text-xl leading-[1.55] text-[(--ink-soft)] font-[(--serif)]">
          點擊節點可直接前往對應筆記，連線標籤說明彼此的關聯性質。
        </p>
      </header>

      <main className="mx-auto h-175 max-w-275 px-6 py-10">
        <div className="h-full w-full overflow-hidden rounded-xl border border-[(--rule)] bg-[(--paper)]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
          >
            <Background color="var(--rule)" gap={24} />
            <Controls />
          </ReactFlow>
        </div>
      </main>

      <footer className="mx-auto max-w-230 px-6 pt-6 pb-20 text-[13px] text-[(--ink-faint)]">
        點擊節點可直接進入該筆記頁面 ・ 使用滑鼠滾輪縮放與拖曳移動圖表
      </footer>
    </div>
  );
}
