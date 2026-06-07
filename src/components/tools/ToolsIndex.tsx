import React from 'react';
import { Link } from 'react-router-dom';

const ToolsIndex: React.FC = () => {
  return (
    <div className="p-6 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/mindmap" className="group block bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 hover:shadow-2xl hover:border-blue-500/50 transition-all cursor-pointer">
          <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-5 border border-blue-500/20 text-blue-500 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-black dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Mind Map Generator</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Turn any study topic into a structured, interactive visual mind map using AI.
          </p>
        </Link>
        
        <Link to="/flashcards" className="group block bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 hover:shadow-2xl hover:border-purple-500/50 transition-all cursor-pointer">
          <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-5 border border-purple-500/20 text-purple-500 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-black dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Flashcard Generator</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Instantly turn your study notes into clean, testable flashcards using AI.
          </p>
        </Link>
        
        <Link to="/pomodoro" className="group block bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 hover:shadow-2xl hover:border-red-500/50 transition-all cursor-pointer">
          <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-5 border border-red-500/20 text-red-500 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-black dark:text-white mb-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Pomodoro Timer</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Boost focus with customizable work and break intervals.
          </p>
        </Link>
        
        <Link to="/breathe" className="group block bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 hover:shadow-2xl hover:border-teal-500/50 transition-all cursor-pointer">
          <div className="w-14 h-14 bg-teal-500/10 rounded-2xl flex items-center justify-center mb-5 border border-teal-500/20 text-teal-500 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-black dark:text-white mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Box Breathing</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Reduce stress and re-center with a guided breathing exercise.
          </p>
        </Link>
        
        {/* Placeholder for future tools */}
        <div className="block bg-gray-50/50 dark:bg-slate-900/30 border border-gray-200 border-dashed dark:border-slate-800 rounded-3xl p-6 opacity-70">
          <div className="w-14 h-14 bg-gray-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-5 text-gray-400">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400 mb-2">More Tools Coming</h3>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Study planners, quizzes, and more are on the way.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ToolsIndex;
