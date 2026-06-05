import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import MindMapGenerator from './MindMapGenerator';
import Settings from './Settings';

const ToolsNav: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="flex gap-4 p-4 border-b border-gray-200 dark:border-slate-800 bg-white/30 dark:bg-black/30 backdrop-blur-sm sticky top-0 z-10">
      <Link
        to="/tools"
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
          isActive('/tools') 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
        }`}
      >
        Mind Map
      </Link>
      <Link
        to="/tools/settings"
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
          isActive('/tools/settings') 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
        }`}
      >
        Settings
      </Link>
    </nav>
  );
};

const ToolsApp: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <ToolsNav />
        <main className="flex-1">
          <Routes>
            <Route path="/tools" element={<MindMapGenerator />} />
            <Route path="/tools/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default ToolsApp;
