import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MindMapGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const generateMindMap = async () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      setError('Please set your Gemini API Key in Settings first.');
      return;
    }

    if (!topic.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Act as an expert system architect. Break down the topic "${topic}" into a hierarchical mind map. You must return ONLY a raw JSON object with two arrays: nodes and edges. The JSON must perfectly match the reactflow data structure. 
      Nodes need:
      - id: string
      - data: { label: string }
      - position: { x: number, y: number } (map them out logically so they don't overlap, start root at 0,0)
      
      Edges need:
      - id: string
      - source: string
      - target: string
      
      Return absolutely no markdown, no backticks, and no conversational text. Just the parsable JSON.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean up potential markdown code blocks if the model ignored instructions
      const cleanJson = text.replace(/```json|```/gi, '').trim();
      const data = JSON.parse(cleanJson);

      if (data.nodes && data.edges) {
        setNodes(data.nodes);
        setEdges(data.edges);
      } else {
        throw new Error('Invalid JSON structure returned');
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('401')) {
        setError('Invalid API Key. Please check your settings.');
      } else {
        setError('Failed to generate mind map. Please try again or check your API key.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-200px)] min-h-[600px] flex flex-col">
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a topic (e.g. MERN Stack Architecture)"
          className="flex-1 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2 text-black dark:text-white outline-none focus:border-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && generateMindMap()}
        />
        <button
          onClick={generateMindMap}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap"
        >
          {loading ? 'Generating...' : 'Generate Map'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 m-4 rounded-xl text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold">&times;</button>
        </div>
      )}

      <div className="flex-1 relative bg-gray-50 dark:bg-black/20">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          colorMode={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
        >
          <Background color="#aaa" gap={20} />
          <Controls />
          <MiniMap />
          <Panel position="top-right" className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-gray-200 dark:border-slate-800 backdrop-blur-md text-xs font-medium text-gray-500">
            Interactive Mind Map
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};

export default MindMapGenerator;
