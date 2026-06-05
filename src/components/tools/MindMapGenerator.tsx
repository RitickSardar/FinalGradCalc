import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, { 
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
  getNodesBounds
} from 'reactflow';
import type { Connection, Edge, Node } from 'reactflow';
import 'reactflow/dist/style.css';
import { GoogleGenAI } from '@google/genai';
import dagre from 'dagre';
import { toPng } from 'html-to-image';

// --- CUSTOM LAYOUT ENGINE ---
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  dagreGraph.setGraph({ rankdir: direction, nodesep: 150, ranksep: 200 });

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

const getRadialLayout = (nodes: Node[], edges: Edge[]) => {
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

  const layerRadius = 350;
  
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

// --- CUSTOM NODE WITH COLOR SUPPORT ---
const CustomNode = ({ data, selected }: any) => {
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const bg = data.color || (data.isRoot ? '#3b82f6' : '#ffffff');
  const textColor = data.isRoot ? '#ffffff' : '#000000';
  
  const showDescription = selected || isPinnedOpen;
  
  return (
    <div className={`group px-4 py-3 rounded-xl border-2 transition-all duration-300 min-w-[200px] max-w-[280px] shadow-lg relative ${showDescription ? 'z-40' : ''} ${selected ? 'border-blue-500 shadow-blue-500/30 scale-110 z-50' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-500'}`} style={{ backgroundColor: bg, color: textColor }}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500 transition-opacity opacity-0 group-hover:opacity-100" />
      
      <div className="flex flex-col gap-1.5">
        <div className="font-bold text-sm break-words text-center flex items-center justify-center gap-2 relative">
          <span className="flex-1 px-4">{data.label}</span>
          {data.description && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsPinnedOpen(!isPinnedOpen); }}
              className={`absolute right-0 focus:outline-none p-1 rounded-full transition-all ${isPinnedOpen ? 'bg-black/10 dark:bg-white/10' : 'opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
              title="Toggle Description"
            >
              <svg className={`w-4 h-4 transition-transform ${showDescription ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
          )}
        </div>
        
        {data.description && showDescription && (
          <div className="text-xs opacity-90 leading-relaxed border-t border-black/10 dark:border-white/10 pt-2 mt-1 text-left break-words animate-in fade-in slide-in-from-top-2 duration-300">
            {data.description}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500 transition-opacity opacity-0 group-hover:opacity-100" />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

const GeneratorContent: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('gemini_api_key') || '';
    }
    return '';
  });
  
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<'TB' | 'LR' | 'BT' | 'RADIAL'>('TB');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  const { fitView, getNodes } = useReactFlow();

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
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const applyLayout = useCallback((nodesToLayout: Node[], edgesToLayout: Edge[], direction: string) => {
    let layouted;
    if (direction === 'RADIAL') {
      layouted = getRadialLayout(nodesToLayout, edgesToLayout);
    } else {
      layouted = getLayoutedElements(nodesToLayout, edgesToLayout, direction);
    }
    setNodes([...layouted.nodes]);
    setEdges([...layouted.edges]);
    
    setTimeout(() => {
      fitView({ duration: 800, padding: 0.2 });
    }, 50);
  }, [setNodes, setEdges, fitView]);

  useEffect(() => {
    if (nodes.length > 0) {
      applyLayout(nodes, edges, layout);
    }
  }, [layout]);

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
      if (apiProxy) {
        config.baseUrl = apiProxy;
      }

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
      
      // Future-proof cascade: Try version 3, then 2.5, 2.0, and finally 1.5
      const modelsToTry = ['gemini-3.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      
      for (const model of modelsToTry) {
        try {
          console.log(`Attempting generation with model: ${model}...`);
          text = await runGeneration(model);
          success = true;
          break; // Exit loop on success
        } catch (err: any) {
          lastErr = err;
          const errMsg = err.message || '';
          
          // If the API key is strictly invalid or unauthorized, stop immediately. 
          // Do not waste time falling back.
          if (errMsg.includes('401') || errMsg.includes('API_KEY_INVALID') || errMsg.includes('403')) {
            throw err;
          }
          
          // If the error is 404 (model doesn't exist yet) or 503 (high demand), 
          // log it and let the loop continue to the next model.
          console.warn(`${model} failed (${errMsg}). Falling back to next model...`);
        }
      }

      // If all models in the array failed
      if (!success) {
        throw lastErr || new Error("All model fallbacks failed.");
      }
      
      const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      let data;
      try {
        data = JSON.parse(cleanJson);
      } catch (parseErr) {
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
        const branchColors = ['#fecaca', '#fde047', '#a7f3d0', '#bfdbfe', '#e9d5ff', '#fbcfe8', '#fdba74'];
        
        majorBranches.forEach((branchId, index) => {
          const color = branchColors[index % branchColors.length];
          const queue = [branchId];
          while(queue.length > 0) {
            const current = queue.shift()!;
            if (!nodeColors.has(current)) {
              nodeColors.set(current, color);
              const children = adjList.get(current) || [];
              queue.push(...children);
            }
          }
        });

        const mappedNodes: Node[] = data.nodes.map((node: any) => ({
          ...node,
          type: 'custom',
          position: { x: 0, y: 0 },
          data: { 
            ...node.data,
            isRoot: node.id === rootId,
            color: nodeColors.get(node.id) || '#ffffff'
          }
        }));

        const mappedEdges: Edge[] = data.edges.map((edge: any) => {
          const sourceColor = nodeColors.get(edge.source) || '#94a3b8';
          return {
            ...edge,
            type: 'default',
            animated: true,
            style: { stroke: sourceColor, strokeWidth: 3 },
          };
        });

        applyLayout(mappedNodes, mappedEdges, layout);

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

const updateNodeData = (id: string, field: 'label' | 'description', value: string) => {
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
  const newNode: Node = {
    id: newNodeId,
    type: 'custom',
    position: { x: 0, y: 0 },
    data: { 
      label: 'New Concept', 
      description: 'Edit this description.', 
      color: parentColor || '#ffffff',
      isRoot: false
    }
  };

  const newEdge: Edge = {
    id: `edge_${parentId}_${newNodeId}`,
    source: parentId,
    target: newNodeId,
    type: 'default',
    animated: true,
    style: { stroke: parentColor || '#94a3b8', strokeWidth: 3 }
  };

  const updatedNodes = [...nodes, newNode];
  const updatedEdges = [...edges, newEdge];
  applyLayout(updatedNodes, updatedEdges, layout);
};

const handleDeleteNode = (nodeId: string) => {
  // Delete the node and any edges connected to it
  const updatedNodes = nodes.filter(n => n.id !== nodeId);
  const updatedEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);
  applyLayout(updatedNodes, updatedEdges, layout);
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

  const exportImagePNG = () => {
    if (nodes.length === 0) {
      setError("Cannot save an empty map.");
      return;
    }

    const flowElement = document.querySelector('.react-flow') as HTMLElement;
    if (!flowElement) return;

    const nodesBounds = getNodesBounds(getNodes());

    const controls = document.querySelector('.react-flow__controls') as HTMLElement;
    const minimap = document.querySelector('.react-flow__minimap') as HTMLElement;
    const panel = document.querySelector('.react-flow__panel') as HTMLElement;
    if (controls) controls.style.display = 'none';
    if (minimap) minimap.style.display = 'none';
    if (panel) panel.style.display = 'none';

    toPng(flowElement, {
      backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#f8fafc',
      width: nodesBounds.width + 400,
      height: nodesBounds.height + 400,
      style: {
        width: `${nodesBounds.width + 400}px`,
        height: `${nodesBounds.height + 400}px`,
        transform: `translate(${-nodesBounds.x + 200}px, ${-nodesBounds.y + 200}px)`,
      },
    })
      .then((dataUrl) => {
        const a = document.createElement('a');
        a.setAttribute('download', `${topic.replace(/\s+/g, '-').toLowerCase() || 'mindmap'}.png`);
        a.setAttribute('href', dataUrl);
        a.click();
      })
      .catch(err => console.error(err))
      .finally(() => {
        if (controls) controls.style.display = '';
        if (minimap) minimap.style.display = '';
        if (panel) panel.style.display = '';
      });
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
          if (data.topic) setTopic(data.topic);
          setTimeout(() => fitView({ duration: 800 }), 50);
        }
      } catch (err) {
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
              <p className="font-semibold text-black dark:text-white text-sm">Paste it below. Stored securely in your browser.</p>
            </div>
          </div>
          <form onSubmit={saveLocalKey} className="flex gap-3 flex-col sm:flex-row">
            <input type="password" name="apiKey" required className="flex-1 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-black dark:text-white focus:border-blue-500 outline-none transition-all placeholder:text-gray-400" placeholder="AIzaSy..." />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap">Save Key & Continue</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-200px)] min-h-[600px] flex flex-col">
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What do you want to learn?" className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-black dark:text-white outline-none focus:border-blue-500 shadow-sm" onKeyDown={(e) => e.key === 'Enter' && generateMindMap()} />
        </div>
        <button onClick={generateMindMap} disabled={loading} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
          {loading ? "Generating..." : 'Generate Map'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 m-4 rounded-r-xl text-sm flex justify-between items-start">
          <p className="font-medium">{error}</p>
          <button onClick={() => setError(null)} className="font-bold text-lg hover:text-red-900 ml-4">&times;</button>
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
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} fitView colorMode={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'}>
            <Background gap={20} size={1} />
            <Controls />
            <MiniMap />
            <Panel position="top-right" className="flex flex-col items-end pointer-events-none z-50">
              <button onClick={() => setIsToolbarOpen(!isToolbarOpen)} className="md:hidden mb-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xl pointer-events-auto">
                <svg className="w-6 h-6 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
              <div className={`${isToolbarOpen ? 'flex' : 'hidden'} md:flex bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xl flex-col gap-4 min-w-[200px] pointer-events-auto max-h-[70vh] overflow-y-auto`}>
                <div className="flex flex-col gap-2">
                  <button onClick={exportDataJSON} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg">Download Data (JSON)</button>
                  <button onClick={exportImagePNG} className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg">Download Image (PNG)</button>
                  <label className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 text-center">
                    Load Data (JSON)
                    <input type="file" accept=".json" onChange={importData} className="hidden" />
                  </label>
                </div>
                <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                  <button 
                    onClick={toggleFullscreen}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg mb-4"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isFullscreen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 9V4.5M9 9H4.5M15 9V4.5M15 9h4.5M9 15v4.5M9 15H4.5M15 15v4.5M15 15h4.5" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      )}
                    </svg>
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </button>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Layout Pattern</label>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => setLayout('TB')} className={`text-sm px-3 py-1.5 rounded-lg border text-left ${layout === 'TB' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30' : 'bg-transparent border-gray-200 dark:text-white'}`}>Tree (Vertical)</button>
                    <button onClick={() => setLayout('LR')} className={`text-sm px-3 py-1.5 rounded-lg border text-left ${layout === 'LR' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30' : 'bg-transparent border-gray-200 dark:text-white'}`}>Tree (Horizontal)</button>
                    <button onClick={() => setLayout('BT')} className={`text-sm px-3 py-1.5 rounded-lg border text-left ${layout === 'BT' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30' : 'bg-transparent border-gray-200 dark:text-white'}`}>Inverse Tree</button>
                    <button onClick={() => setLayout('RADIAL')} className={`text-sm px-3 py-1.5 rounded-lg border text-left ${layout === 'RADIAL' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30' : 'bg-transparent border-gray-200 dark:text-white'}`}>Star / Radial</button>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Node Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={selectedColor} onChange={(e) => applyColorToSelected(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" title="Select nodes, then pick a color" />
                    <span className="text-xs text-gray-500">Select nodes to recolor</span>
                  </div>
                </div>
                {(() => {
                  const selectedNode = nodes.find(n => n.selected);
                  if (!selectedNode) return null;
                  return (
                    <div className="border-t border-gray-200 dark:border-slate-700 pt-3 max-w-[250px] flex flex-col gap-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Edit Node</label>
                      <input 
                        type="text" 
                        value={selectedNode.data.label || ''} 
                        onChange={(e) => updateNodeData(selectedNode.id, 'label', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm text-black dark:text-white outline-none focus:border-blue-500 font-bold"
                      />
                      <textarea 
                        value={selectedNode.data.description || ''} 
                        onChange={(e) => updateNodeData(selectedNode.id, 'description', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-black dark:text-white outline-none focus:border-blue-500 h-20 resize-none"
                      />
                      <div className="flex gap-2 mt-1">
                        <button 
                          onClick={() => handleAddChild(selectedNode.id, selectedNode.data.color)}
                          className="flex-1 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold transition-colors"
                        >
                          + Add Child
                        </button>
                        {!selectedNode.data.isRoot && (
                          <button 
                            onClick={() => handleDeleteNode(selectedNode.id)}
                            className="py-1.5 px-3 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg text-xs font-bold transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
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
