import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import ToolsIndex from './ToolsIndex';
import MindMapGenerator from './MindMapGenerator';
import Settings from './Settings';

const ToolsNav: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="flex gap-4 p-4 border-b border-gray-200 dark:border-slate-800 bg-white/30 dark:bg-black/30 backdrop-blur-sm sticky top-0 z-10">
      <Link
        to="/"
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
          (location.pathname === '/' || location.pathname === '')
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
        }`}
      >
        All Tools
      </Link>
      {location.pathname.includes('/mindmap') && (
        <Link
          to="/mindmap"
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-blue-600 text-white shadow-lg shadow-blue-600/20`}
        >
          Mind Map
        </Link>
      )}
      <Link
        to="/settings"
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
          isActive('/settings') 
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
    <BrowserRouter basename="/tools">
      <div className="min-h-screen flex flex-col">
        <ToolsNav />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<ToolsIndex />} />
            <Route path="/mindmap" element={<MindMapGenerator />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<ToolsIndex />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default ToolsApp;
