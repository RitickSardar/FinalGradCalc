import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  getNodesBounds,
  BaseEdge,
  getBezierPath
} from '@xyflow/react';
import type { Connection, Edge, Node, EdgeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GoogleGenAI } from '@google/genai';
import dagre from 'dagre';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

interface MindMapNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  isRoot?: boolean;
  color?: string;
  nodeStyle?: 'filled' | 'bordered';
  globalStyle?: 'filled' | 'bordered';
  globalFontSize?: number;
  globalExpandAll?: boolean;
}

type MindMapNode = Node<MindMapNodeData>;

// --- CUSTOM DYNAMIC EDGE ---
const DynamicEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  animated,
}: EdgeProps) => {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  
  let sourcePos = Position.Bottom;
  let targetPos = Position.Top;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    sourcePos = dx > 0 ? Position.Right : Position.Left;
    targetPos = dx > 0 ? Position.Left : Position.Right;
  } else {
    sourcePos = dy > 0 ? Position.Bottom : Position.Top;
    targetPos = dy > 0 ? Position.Top : Position.Bottom;
  }

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition: sourcePos,
    targetX,
    targetY,
    targetPosition: targetPos,
  });

  return (
    <path
      id={id}
      style={style}
      className={`react-flow__edge-path ${animated ? 'animated' : ''}`}
      d={edgePath}
      markerEnd={markerEnd}
      fill="none"
    />
  );
};

// --- CUSTOM LAYOUT ENGINE ---
const getLayoutedElements = (nodes: MindMapNode[], edges: Edge[], direction = 'TB', spacing = 1) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 150 * spacing, ranksep: 200 * spacing });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 220, height: 80 });
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
        x: nodeWithPosition.x - 220 / 2,
        y: nodeWithPosition.y - 80 / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

const getRadialLayout = (nodes: MindMapNode[], edges: Edge[], spacing = 1) => {
  if (nodes.length === 0) return { nodes, edges };

  const incomingEdges = new Set(edges.map(e => e.target));
  const rootNode = nodes.find(n => !incomingEdges.has(n.id)) || nodes[0];

  const layoutedNodes = [...nodes];
  const childrenMap = new Map<string, string[]>();

  edges.forEach(e => {
    if (!childrenMap.has(e.source)) childrenMap.set(e.source, []);
    childrenMap.get(e.source)!.push(e.target);
  });

  const depths = new Map<string, number>();
  const queue = [{ id: rootNode.id, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    depths.set(id, depth);
    const children = childrenMap.get(id) || [];
    children.forEach(child => queue.push({ id: child, depth: depth + 1 }));
  }

  const layerRadius = 350 * spacing;

  layoutedNodes.forEach(node => {
    if (node.id === rootNode.id) {
      node.position = { x: 0, y: 0 };
      return;
    }

    const depth = depths.get(node.id) || 1;
    const nodesAtDepth = layoutedNodes.filter(n => depths.get(n.id) === depth);
    const index = nodesAtDepth.findIndex(n => n.id === node.id);

    const angle = (index / nodesAtDepth.length) * 2 * Math.PI;
    const radius = depth * layerRadius;

    node.position = {
      x: radius * Math.cos(angle) - 110,
      y: radius * Math.sin(angle) - 40,
    };
  });

  return { nodes: layoutedNodes, edges };
};

// --- CUSTOM NODE ---
const CustomNode = ({ data, selected }: any) => {
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);

  const styleMode = data.nodeStyle || data.globalStyle || 'filled';
  const isFilled = styleMode === 'filled';

  const baseColor = data.color || (data.isRoot ? '#3b82f6' : '#ffffff');

  const nodeBg = isFilled ? baseColor : undefined;
  const nodeBorder = isFilled ? 'transparent' : baseColor;
  const textColor = isFilled ? (data.isRoot ? '#ffffff' : '#000000') : 'inherit';
  const fontSize = data.globalFontSize || 14;

  const showDescription = selected || isPinnedOpen || data.globalExpandAll;

  return (
    <div
      className={`group px-4 py-3 rounded-xl border-[3px] transition-all duration-300 min-w-[200px] max-w-[280px] shadow-lg relative ${showDescription ? 'z-40' : ''} ${selected ? (isFilled ? 'border-blue-500 shadow-blue-500/30 scale-110 z-50' : 'ring-4 ring-blue-500/50 shadow-blue-500/30 scale-110 z-50') : 'hover:scale-105'} ${isFilled ? '' : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800'}`}
      style={{ backgroundColor: nodeBg, color: textColor, borderColor: nodeBorder }}
    >
      {/* Invisible center handles for programmatic edges (default) */}
      <Handle type="target" position={Position.Top} id="center-target" className="opacity-0 pointer-events-none min-w-0 min-h-0 w-0 h-0" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', border: 'none' }} />
      <Handle type="source" position={Position.Bottom} id="center-source" className="opacity-0 pointer-events-none min-w-0 min-h-0 w-0 h-0" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', border: 'none' }} />

      {/* Visible handles for manual connection */}
      <Handle type="target" position={Position.Top} id="top-target" className="w-3 h-3 bg-blue-500 transition-opacity opacity-0 group-hover:opacity-100" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="w-3 h-3 bg-blue-500 transition-opacity opacity-0 group-hover:opacity-100" />
      <Handle type="target" position={Position.Left} id="left-target" className="w-3 h-3 bg-blue-500 transition-opacity opacity-0 group-hover:opacity-100" />
      <Handle type="target" position={Position.Right} id="right-target" className="w-3 h-3 bg-blue-500 transition-opacity opacity-0 group-hover:opacity-100" />

      <Handle type="source" position={Position.Top} id="top-source" className="w-3 h-3 bg-blue-500 transition-opacity opacity-0 group-hover:opacity-100" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="w-3 h-3 bg-blue-500 transition-opacity opacity-0 group-hover:opacity-100" />
      <Handle type="source" position={Position.Left} id="left-source" className="w-3 h-3 bg-blue-500 transition-opacity opacity-0 group-hover:opacity-100" />
      <Handle type="source" position={Position.Right} id="right-source" className="w-3 h-3 bg-blue-500 transition-opacity opacity-0 group-hover:opacity-100" />

      <div className="flex flex-col gap-1.5">
        <div className="font-bold break-words text-center flex items-center justify-center gap-2 relative" style={{ fontSize: `${fontSize}px` }}>
          <span className="flex-1 px-4">{data.label}</span>
        </div>

        {data.description && showDescription && (
          <div
            className="opacity-90 leading-relaxed border-t border-black/10 dark:border-white/10 pt-2 mt-1 text-left break-words animate-in fade-in slide-in-from-top-2 duration-300 pb-2"
            style={{ fontSize: `${Math.max(10, fontSize * 0.85)}px` }}
          >
            {data.description}
          </div>
        )}
      </div>

      {data.description && (
        <button
          onClick={(e) => { e.stopPropagation(); setIsPinnedOpen(!isPinnedOpen); }}
          className={`absolute bottom-1.5 right-1.5 focus:outline-none flex items-center justify-center w-6 h-6 rounded-full transition-all border hover:scale-110 z-50 ${isPinnedOpen ? 'bg-amber-100 border-amber-300 text-amber-600 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shadow-sm'}`}
          title={isPinnedOpen ? "Unpin Description" : "Pin Description"}
          aria-label="Toggle node description"
        >
          <svg className={`w-3.5 h-3.5 transition-all duration-300 ${isPinnedOpen ? 'rotate-[-30deg] scale-90' : 'rotate-0'}`} fill={isPinnedOpen ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 17v5M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.68V6a3 3 0 00-6 0v4.68a2 2 0 01-1.11 1.87l-1.78.9A2 2 0 005 15.24v1.76z"></path>
          </svg>
        </button>
      )}
    </div>
  );
};

const nodeTypes = { custom: CustomNode };
const edgeTypes = { dynamic: DynamicEdge };

const GeneratorContent: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('gemini_api_key') || '';
    }
    return '';
  });

  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<'TB' | 'LR' | 'BT' | 'RADIAL'>('TB');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [isDark, setIsDark] = useState(false);

  const [globalNodeStyle, setGlobalNodeStyle] = useState<'filled' | 'bordered'>('filled');
  const [globalExpandAll, setGlobalExpandAll] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<'overview' | 'node'>('overview');
  const [nodeSpacing, setNodeSpacing] = useState<number>(1);
  const [globalFontSize, setGlobalFontSize] = useState<number>(14);

  const [openOverviewSections, setOpenOverviewSections] = useState({
    mode: false,
    adjustments: false,
    layout: false,
    actions: false,
  });

  const toggleOverviewSection = (section: keyof typeof openOverviewSections) => {
    setOpenOverviewSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const [nodes, setNodes, onNodesChange] = useNodesState<MindMapNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Store generated data separately to avoid layout useEffect loop
  const generatedData = useRef<{ nodes: MindMapNode[], edges: Edge[] } | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const { fitView, getNodes } = useReactFlow();

  // Load from local storage on mount
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('mindmap_saved_data');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.nodes && data.nodes.length > 0 && data.edges) {
            setNodes(data.nodes);
            setEdges(data.edges);
            if (data.topic) setTopic(data.topic);
            generatedData.current = { nodes: data.nodes, edges: data.edges };
            setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 50);
          }
        } catch (e) {
          console.error("Failed to parse saved mindmap data", e);
        }
      }
    }
  }, [setNodes, setEdges, fitView]);

  // Save to local storage on change (debounced)
  useEffect(() => {
    if (nodes.length > 0 && typeof localStorage !== 'undefined') {
      const timer = setTimeout(() => {
        const dataToSave = { nodes, edges, topic };
        localStorage.setItem('mindmap_saved_data', JSON.stringify(dataToSave));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [nodes, edges, topic]);

  // Observe dark mode changes properly
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setIsDark(document.documentElement.classList.contains('dark'));
    return () => observer.disconnect();
  }, []);

  const selectedNode = nodes.find(n => n.selected) as MindMapNode | undefined;

  useEffect(() => {
    if (selectedNode && activePanelTab !== 'node') {
      setActivePanelTab('node');
    } else if (!selectedNode && activePanelTab === 'node') {
      setActivePanelTab('overview');
    }
  }, [selectedNode?.id]);

  useEffect(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, globalStyle: globalNodeStyle, globalFontSize, globalExpandAll } })));
    if (generatedData.current) {
      generatedData.current.nodes = generatedData.current.nodes.map((n) => ({
        ...n,
        data: { ...n.data, globalStyle: globalNodeStyle, globalFontSize, globalExpandAll }
      }));
    }
  }, [globalNodeStyle, globalFontSize, globalExpandAll, setNodes]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      reactFlowWrapper.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      const color = (sourceNode?.data as any)?.color || '#94a3b8';
      const edgeParams = {
        ...params,
        type: 'dynamic',
        animated: true,
        style: { stroke: color, strokeWidth: 4 },
      };
      setEdges((eds) => addEdge(edgeParams, eds));
    },
    [setEdges, nodes]
  );

  const applyLayout = useCallback((nodesToLayout: MindMapNode[], edgesToLayout: Edge[], direction: string, spacing: number) => {
    let layouted;
    if (direction === 'RADIAL') {
      layouted = getRadialLayout(nodesToLayout, edgesToLayout, spacing);
    } else {
      layouted = getLayoutedElements(nodesToLayout, edgesToLayout, direction, spacing);
    }
    setNodes([...layouted.nodes]);
    setEdges([...layouted.edges]);

    setTimeout(() => {
      fitView({ duration: 800, padding: 0.2 });
    }, 50);
  }, [setNodes, setEdges, fitView]);

  // Only re-layout when layout direction or spacing changes, using stored generated data
  useEffect(() => {
    if (generatedData.current) {
      applyLayout(generatedData.current.nodes, generatedData.current.edges, layout, nodeSpacing);
    }
  }, [layout, nodeSpacing, applyLayout]);

  const generateMindMap = async () => {
    if (!apiKey) {
      setError('Please set your Gemini API Key first.');
      return;
    }
    if (!topic.trim()) {
      setError('Please enter a topic.');
      return;
    }

    setLoading(true);
    setError(null);

    const runGeneration = async (modelName: string) => {
      const apiProxy = localStorage.getItem('gemini_api_proxy') || '';
      const config: any = { apiKey: apiKey };
      if (apiProxy) config.baseUrl = apiProxy;

      const ai = new GoogleGenAI(config);
      const prompt = `Act as an expert system architect. Break down the topic "${topic}" into a deep hierarchical mind map. You must return ONLY a raw JSON object with two arrays: nodes and edges.
      You MUST generate at least 3 levels of depth:
      Level 1: The Root topic.
      Level 2: The Core Concepts branching off the root.
      Level 3: Grandchildren nodes that branch off Level 2, providing specific examples, definitions, or detailed explanations of those core concepts.
      Nodes need: { "id": "unique_string", "data": { "label": "Concept Name", "description": "Brief 1-2 sentence description" } } 
      Edges need: { "id": "unique_string", "source": "parent_id", "target": "child_id" }
      The first node in the array MUST be the root concept.
      Return absolutely no markdown, no backticks, and no conversational text. Just the parsable JSON.`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      return response.text || '';
    };

    try {
      let text = '';
      let success = false;
      let lastErr: any = null;

      const modelsToTry = ['gemini-3.5-flash', 'gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];

      for (const model of modelsToTry) {
        try {
          console.log(`Attempting generation with model: ${model}...`);
          text = await runGeneration(model);
          success = true;
          break;
        } catch (err: any) {
          lastErr = err;
          const errMsg = err.message || '';
          if (errMsg.includes('401') || errMsg.includes('API_KEY_INVALID') || errMsg.includes('403')) {
            throw err;
          }
          console.warn(`${model} failed (${errMsg}). Falling back...`);
        }
      }

      if (!success) throw lastErr || new Error("All model fallbacks failed.");

      const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      let data;
      try {
        data = JSON.parse(cleanJson);
      } catch {
        throw new Error("JSON_PARSE_ERROR");
      }

      if (data.nodes && data.edges) {
        const rootId = data.nodes[0]?.id;
        const adjList = new Map<string, string[]>();
        data.edges.forEach((e: any) => {
          if (!adjList.has(e.source)) adjList.set(e.source, []);
          adjList.get(e.source)!.push(e.target);
        });

        const nodeColors = new Map<string, string>();
        nodeColors.set(rootId, '#3b82f6');

        const majorBranches = adjList.get(rootId) || [];
        const branchColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

        majorBranches.forEach((branchId, index) => {
          const color = branchColors[index % branchColors.length];
          const bfsQueue = [branchId];
          while (bfsQueue.length > 0) {
            const current = bfsQueue.shift()!;
            if (!nodeColors.has(current)) {
              nodeColors.set(current, color);
              const children = adjList.get(current) || [];
              bfsQueue.push(...children);
            }
          }
        });

        const mappedNodes: MindMapNode[] = data.nodes.map((node: any) => ({
          ...node,
          type: 'custom',
          position: { x: 0, y: 0 },
          data: {
            ...node.data,
            isRoot: node.id === rootId,
            color: nodeColors.get(node.id) || '#ffffff',
            globalStyle: globalNodeStyle
          }
        }));

        const mappedEdges: Edge[] = data.edges.map((edge: any) => {
          const sourceColor = nodeColors.get(edge.source) || '#94a3b8';
          return {
            ...edge,
            type: 'dynamic',
            animated: true,
            style: { stroke: sourceColor, strokeWidth: 4 },
          };
        });

        // Store for layout switching
        generatedData.current = { nodes: mappedNodes, edges: mappedEdges };
        applyLayout(mappedNodes, mappedEdges, layout, nodeSpacing);

      } else {
        throw new Error('Invalid JSON structure returned');
      }
    } catch (err: any) {
      console.error("Gemini Error:", err);
      const errMsg = err.message || '';
      if (errMsg.includes('401')) setError('Invalid API key.');
      else if (errMsg.includes('429')) setError('Quota exceeded. Try again in a minute.');
      else if (errMsg.includes('JSON_PARSE_ERROR')) setError('Invalid map format. Try again.');
      else setError(`Failed to generate: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const saveLocalKey = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const key = fd.get('apiKey') as string;
    if (key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
      setApiKey(key.trim());
    }
  };

  const applyColorToSelected = (color: string) => {
    setSelectedColor(color);
    setNodes((nds) =>
      nds.map((n) => {
        if (n.selected && !n.data.isRoot) {
          return { ...n, data: { ...n.data, color } };
        }
        return n;
      })
    );
  };

  const updateNodeData = (id: string, field: 'label' | 'description' | 'color' | 'nodeStyle', value: string | undefined) => {     
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          return { ...n, data: { ...n.data, [field]: value } };
        }
        return n;
      })
    );
  };

  const handleAddChild = (parentId: string, parentColor: string) => {
    const newNodeId = `node_${Date.now()}`;
    const newNode: MindMapNode = {
      id: newNodeId,
      type: 'custom',
      position: { x: 0, y: 0 },
      data: {
        label: 'New Concept',
        description: 'Edit this description.',
        color: parentColor || '#ffffff',
        isRoot: false,
        globalStyle: globalNodeStyle
      }
    };

    const newEdge: Edge = {
      id: `edge_${parentId}_${newNodeId}`,
      source: parentId,
      target: newNodeId,
      type: 'dynamic',
      animated: true,
      style: { stroke: parentColor || '#94a3b8', strokeWidth: 4 }
    };

    const updatedNodes = [...nodes, newNode] as MindMapNode[];
    const updatedEdges = [...edges, newEdge];
    generatedData.current = { nodes: updatedNodes, edges: updatedEdges };
    applyLayout(updatedNodes, updatedEdges, layout, nodeSpacing);
  };

  const handleDeleteNode = (nodeId: string) => {
    const updatedNodes = nodes.filter(n => n.id !== nodeId) as MindMapNode[];
    const updatedEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    generatedData.current = { nodes: updatedNodes, edges: updatedEdges };
    applyLayout(updatedNodes, updatedEdges, layout, nodeSpacing);
  };

  const exportDataJSON = () => {
    if (nodes.length === 0) {
      setError("Cannot save an empty map. Generate or load one first.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ nodes, edges, topic }));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${topic.replace(/\s+/g, '-').toLowerCase() || 'mindmap'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // --- FIXED EXPORT ENGINE ---
  const exportPDF = async () => {
    if (nodes.length === 0) {
      setError("Cannot export an empty map.");
      return;
    }

    const viewportElement = document.querySelector('.xyflow__viewport') || document.querySelector('.react-flow__viewport');
    if (!viewportElement) return;

    setExporting(true);

    try {
      // Allow React to flush the "Exporting..." state to the UI
      await new Promise(resolve => setTimeout(resolve, 50));

      const nodesBounds = getNodesBounds(getNodes());
      const padding = 80;
      const contentWidth = nodesBounds.width + padding * 2;
      const contentHeight = nodesBounds.height + padding * 2;
      
      // Calculate a dynamic scale to ensure high-quality A4 export (target ~3000px on the longest edge)
      const maxDimension = Math.max(contentWidth, contentHeight);
      let scale = Math.ceil(3000 / maxDimension);
      // Clamp scale between 2 and 5 to prevent memory crashes on huge maps while ensuring crispness on small ones
      scale = Math.min(Math.max(scale, 2), 5);

      const transformX = -nodesBounds.x + padding;
      const transformY = -nodesBounds.y + padding;

      const dataUrl = await toPng(viewportElement as HTMLElement, {
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        width: contentWidth,
        height: contentHeight,
        pixelRatio: scale,
        style: {
          width: `${contentWidth}px`,
          height: `${contentHeight}px`,
          transform: `translate(${transformX}px, ${transformY}px) scale(1)`,
          transformOrigin: 'top left'
        }
      });

      // A4 format dimensions in mm
      const orientation = contentWidth > contentHeight ? 'landscape' : 'portrait';
      const a4Width = orientation === 'landscape' ? 297 : 210;
      const a4Height = orientation === 'landscape' ? 210 : 297;

      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      // Margins and title space
      const margin = 10; // 10mm margin
      const titleSpace = 15; // 15mm space for title
      
      const maxImgWidth = a4Width - margin * 2;
      const maxImgHeight = a4Height - margin * 2 - titleSpace;

      const imgRatio = contentWidth / contentHeight;
      const maxImgRatio = maxImgWidth / maxImgHeight;

      let finalImgWidth = maxImgWidth;
      let finalImgHeight = maxImgHeight;

      if (imgRatio > maxImgRatio) {
        // Image is wider, constrain by width
        finalImgHeight = maxImgWidth / imgRatio;
      } else {
        // Image is taller, constrain by height
        finalImgWidth = maxImgHeight * imgRatio;
      }

      // Center the image within the available area
      const xOffset = margin + (maxImgWidth - finalImgWidth) / 2;
      const yOffset = margin + titleSpace + (maxImgHeight - finalImgHeight) / 2;

      // Meta Data and Title Injection
      pdf.setFontSize(16);
      pdf.setTextColor(isDark ? 255 : 30);
      pdf.text(topic || 'Mind Map', margin, margin + 8);
      
      pdf.addImage(dataUrl, 'PNG', xOffset, yOffset, finalImgWidth, finalImgHeight, '', 'FAST');

      pdf.setProperties({
        title: topic || 'Mind Map',
        creator: 'Mind Map Generator',
      });

      pdf.save(`${topic.replace(/\s+/g, '-').toLowerCase() || 'mindmap'}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      setError('Failed to export PDF. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.nodes && data.edges) {
          setNodes(data.nodes);
          setEdges(data.edges);
          generatedData.current = { nodes: data.nodes, edges: data.edges };
          if (data.topic) setTopic(data.topic);
          setTimeout(() => fitView({ duration: 800 }), 50);
        }
      } catch {
        setError("Failed to parse the file.");
      }
    };
    reader.readAsText(file);
  };

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="max-w-xl w-full p-8 bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-2xl">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 text-blue-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
          </div>
          <h2 className="text-3xl font-black text-black dark:text-white mb-2">Connect to Gemini AI</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Provide your own free Gemini API key to generate maps.</p>
          <div className="space-y-6 mb-8">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold shrink-0 mt-0.5">1</div>
              <div>
                <p className="font-semibold text-black dark:text-white">Get a free key</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Google AI Studio</a>.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold shrink-0 mt-0.5">2</div>
              <p className="font-semibold text-black dark:text-white">Create & Copy API Key</p>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold shrink-0 mt-0.5">3</div>
              <p className="font-semibold text-black dark:text-white text-sm">Paste it below. Stored locally in your browser only.</p>
            </div>
          </div>
          <form onSubmit={saveLocalKey} className="flex gap-3 flex-col sm:flex-row">
            <input type="password" name="apiKey" required className="flex-1 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-black dark:text-white focus:border-blue-500 outline-none transition-all placeholder:text-gray-400" placeholder="AIzaSy..." />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap">Save Key & Continue</button>
          </form>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
            ⚠️ Stored locally in your browser. Never share this device with untrusted users.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-200px)] min-h-[600px] flex flex-col">
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <textarea rows={1} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What do you want to learn? (Press Enter for new line, Ctrl+Enter to generate)" className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-black dark:text-white outline-none focus:border-blue-500 shadow-sm resize-y min-h-[50px]" onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); generateMindMap(); } }} />
        </div>
        <button onClick={generateMindMap} disabled={loading} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              Generating...
            </>
          ) : 'Generate Map'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 m-4 rounded-r-xl text-sm flex justify-between items-start">
          <p className="font-medium">{error}</p>
          <button onClick={() => setError(null)} aria-label="Dismiss error" className="font-bold text-lg hover:text-red-900 ml-4">&times;</button>
        </div>
      )}

      {nodes.length === 0 && !loading && !error && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400">       
          <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-blue-500">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>    
          </div>
          <h3 className="text-xl font-bold text-black dark:text-white mb-2">Ready to Map</h3>
          <p className="text-md max-w-md mb-6">Enter a topic above or load a saved file.</p>
          <label className="px-6 py-3 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold rounded-xl border-2 border-blue-100 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors cursor-pointer flex items-center gap-2 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            Load Saved Map (JSON)
            <input type="file" accept=".json" onChange={importData} className="hidden" />
          </label>
        </div>
      )}

      {nodes.length > 0 && (
        <div ref={reactFlowWrapper} className={`flex-1 relative bg-gray-50 dark:bg-black/20 ${isFullscreen ? 'bg-slate-50 dark:bg-slate-900' : ''}`}>
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} fitView colorMode={isDark ? 'dark' : 'light'}>
            <Background gap={20} size={1} />
            <Controls />
            <MiniMap />
            <Panel position="top-right" className="flex flex-col items-end pointer-events-none z-50">
              <button aria-label="Toggle toolbar" onClick={() => setIsToolbarOpen(!isToolbarOpen)} className="md:hidden mb-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xl pointer-events-auto">
                <svg className="w-6 h-6 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
              <div className={`${isToolbarOpen ? 'flex' : 'hidden'} md:flex bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xl flex-col min-w-[280px] pointer-events-auto max-h-[80vh] overflow-hidden`}>

                {/* TABS */}
                <div className="flex border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                  <button
                    onClick={() => setActivePanelTab('overview')}
                    className={`flex-1 py-3 text-xs font-bold text-center transition-colors ${activePanelTab === 'overview' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}    
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActivePanelTab('node')}
                    disabled={!selectedNode}
                    className={`flex-1 py-3 text-xs font-bold text-center transition-colors disabled:opacity-30 ${activePanelTab === 'node' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:hover:text-slate-500'}`}
                  >
                    Selected Node
                  </button>
                </div>

                <div className="p-4 flex flex-col gap-4 overflow-y-auto">
                  {/* OVERVIEW TAB */}
                  {activePanelTab === 'overview' && (
                    <div className="flex flex-col gap-3">
                      {/* Global Style Toggle */}
                      <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <button 
                          onClick={() => toggleOverviewSection('mode')}
                          className="w-full flex justify-between items-center bg-gray-50 dark:bg-slate-800/80 px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                          Global Node Mode
                          <svg className={`w-4 h-4 transition-transform ${openOverviewSections.mode ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                        {openOverviewSections.mode && (
                          <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex flex-col gap-2">
                            <div className="flex gap-2">
                              <button onClick={() => setGlobalNodeStyle('filled')} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${globalNodeStyle === 'filled' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-400' : 'bg-transparent border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                                Filled
                              </button>
                              <button onClick={() => setGlobalNodeStyle('bordered')} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${globalNodeStyle === 'bordered' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-400' : 'bg-transparent border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                                Bordered
                              </button>
                            </div>
                            <div className="flex gap-2 border-t border-gray-100 dark:border-slate-700 pt-2 mt-1">
                              <button onClick={() => setGlobalExpandAll(!globalExpandAll)} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${globalExpandAll ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-400 dark:text-green-400' : 'bg-transparent border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                {globalExpandAll ? 'Collapse All' : 'Expand All Nodes'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Map Adjustments */}
                      <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <button 
                          onClick={() => toggleOverviewSection('adjustments')}
                          className="w-full flex justify-between items-center bg-gray-50 dark:bg-slate-800/80 px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                          Map Adjustments
                          <svg className={`w-4 h-4 transition-transform ${openOverviewSections.adjustments ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                        {openOverviewSections.adjustments && (
                          <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex flex-col gap-3">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Node Spacing</span>
                                <span className="text-xs text-slate-500">{nodeSpacing.toFixed(1)}x</span>
                              </div>
                              <input type="range" min="0.5" max="2.5" step="0.1" value={nodeSpacing} onChange={(e) => setNodeSpacing(parseFloat(e.target.value))} className="w-full accent-blue-600" />
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Font Size</span>
                                <span className="text-xs text-slate-500">{globalFontSize}px</span>
                              </div>
                              <input type="range" min="10" max="24" step="1" value={globalFontSize} onChange={(e) => setGlobalFontSize(parseInt(e.target.value))} className="w-full accent-blue-600" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Layout Patterns */}
                      <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <button 
                          onClick={() => toggleOverviewSection('layout')}
                          className="w-full flex justify-between items-center bg-gray-50 dark:bg-slate-800/80 px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                          Layout Patterns
                          <svg className={`w-4 h-4 transition-transform ${openOverviewSections.layout ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                        {openOverviewSections.layout && (
                          <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 grid grid-cols-2 gap-2">
                            {(['TB', 'LR', 'BT', 'RADIAL'] as const).map((l) => (
                              <button key={l} onClick={() => setLayout(l)} className={`text-xs px-2 py-2 rounded-lg border text-center transition-colors ${layout === l ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-400' : 'bg-transparent border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                {l === 'TB' ? 'Tree (Down)' : l === 'LR' ? 'Tree (Right)' : l === 'BT' ? 'Tree (Up)' : 'Radial'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions & Export */}
                      <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <button 
                          onClick={() => toggleOverviewSection('actions')}
                          className="w-full flex justify-between items-center bg-gray-50 dark:bg-slate-800/80 px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                          Actions & Export
                          <svg className={`w-4 h-4 transition-transform ${openOverviewSections.actions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                        {openOverviewSections.actions && (
                          <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex flex-col gap-2">
                            <button onClick={exportDataJSON} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg">
                              Save Data (JSON)
                            </button>
                            <label className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 text-center shadow-sm">
                              Load Data (JSON)
                              <input type="file" accept=".json" onChange={importData} className="hidden" />
                            </label>
                            <button 
                              onClick={exportPDF} 
                              disabled={exporting}
                              className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg mt-1"
                            >
                              {exporting ? (
                                <>
                                  <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                  Exporting...
                                </>
                              ) : 'Export as PDF'}
                            </button>
                            <button 
                              onClick={toggleFullscreen}
                              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg mt-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isFullscreen ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 9V4.5M9 9H4.5M15 9V4.5M15 9h4.5M9 15v4.5M9 15H4.5M15 15v4.5M15 15h4.5" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                )}
                              </svg>
                              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* NODE SETTINGS TAB */}
                  {activePanelTab === 'node' && selectedNode && (
                    <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Content</label>
                        <input
                          type="text"
                          value={(selectedNode.data.label as string) || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, 'label', e.target.value)}
                          aria-label="Node label"
                          className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-black dark:text-white outline-none focus:border-blue-500 font-bold"
                          placeholder="Concept Label"
                        />
                        <textarea
                          value={(selectedNode.data.description as string) || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, 'description', e.target.value)}
                          aria-label="Node description"
                          className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-black dark:text-white outline-none focus:border-blue-500 h-24 resize-none"
                          placeholder="Detailed description..."
                        />
                      </div>

                      <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Node Mode</label>  
                        <div className="flex gap-2">
                          <button onClick={() => updateNodeData(selectedNode.id, 'nodeStyle', 'filled')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-colors ${selectedNode.data.nodeStyle === 'filled' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-400' : 'bg-transparent border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                            Filled
                          </button>
                          <button onClick={() => updateNodeData(selectedNode.id, 'nodeStyle', 'bordered')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-colors ${selectedNode.data.nodeStyle === 'bordered' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-400' : 'bg-transparent border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                            Bordered
                          </button>
                          <button onClick={() => updateNodeData(selectedNode.id, 'nodeStyle', undefined)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-colors ${!selectedNode.data.nodeStyle ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-400' : 'bg-transparent border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                            Global
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Node Color</label> 
                        <div className="flex gap-3 items-center">
                          <input type="color" value={(selectedNode.data.color as string) || '#ffffff'} onChange={(e) => updateNodeData(selectedNode.id, 'color', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0 shadow-sm" title="Pick node color" aria-label="Node color picker" />
                          <span className="text-xs text-gray-500 font-medium">Pick a specific color</span>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 dark:border-slate-700 pt-4 flex gap-2">
                        <button
                          onClick={() => handleAddChild(selectedNode.id, (selectedNode.data.color as string) || '#ffffff')}       
                          className="flex-1 py-2.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold transition-colors shadow-sm"
                        >
                          + Add Child
                        </button>
                        {!selectedNode.data.isRoot && (
                          <button
                            onClick={() => {
                                handleDeleteNode(selectedNode.id);
                                setActivePanelTab('overview');
                            }}
                            className="py-2.5 px-4 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-400 rounded-lg text-xs font-bold transition-colors shadow-sm"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      )}
    </div>
  );
};

const MindMapGeneratorWrapper: React.FC = () => (
  <ReactFlowProvider>
    <GeneratorContent />
  </ReactFlowProvider>
);

export default MindMapGeneratorWrapper;