import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import ToolsIndex from './ToolsIndex';

// Dynamically import heavy components to split the JS bundle
const MindMapGenerator = lazy(() => import('./MindMapGenerator'));
const Settings = lazy(() => import('./Settings'));

const LoadingFallback = () => (
  <div className="w-full h-[calc(100vh-200px)] min-h-[600px] flex items-center justify-center bg-white/50 dark:bg-slate-900/50">
    <div className="flex flex-col items-center gap-4">
      <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading Tool...</span>
    </div>
  </div>
);

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
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<ToolsIndex />} />
              <Route path="/mindmap" element={<MindMapGenerator />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<ToolsIndex />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default ToolsApp;
