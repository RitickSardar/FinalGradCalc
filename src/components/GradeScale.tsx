import React, { useState } from 'react';

interface GradeEntry {
  letter: string;
  minPercent: number;
  gpa: number;
}

const COLLEGE_SCALE: GradeEntry[] = [
  { letter: 'A', minPercent: 93, gpa: 4.0 },
  { letter: 'A-', minPercent: 90, gpa: 3.7 },
  { letter: 'B+', minPercent: 87, gpa: 3.3 },
  { letter: 'B', minPercent: 83, gpa: 3.0 },
  { letter: 'B-', minPercent: 80, gpa: 2.7 },
  { letter: 'C+', minPercent: 77, gpa: 2.3 },
  { letter: 'C', minPercent: 73, gpa: 2.0 },
  { letter: 'C-', minPercent: 70, gpa: 1.7 },
  { letter: 'D+', minPercent: 67, gpa: 1.3 },
  { letter: 'D', minPercent: 60, gpa: 1.0 },
  { letter: 'F', minPercent: 0, gpa: 0.0 },
];

const HS_SCALE: GradeEntry[] = [
  { letter: 'A', minPercent: 90, gpa: 4.0 },
  { letter: 'B', minPercent: 80, gpa: 3.0 },
  { letter: 'C', minPercent: 70, gpa: 2.0 },
  { letter: 'D', minPercent: 60, gpa: 1.0 },
  { letter: 'F', minPercent: 0, gpa: 0.0 },
];

const GradeScale: React.FC = () => {
  const [scale, setScale] = useState<GradeEntry[]>(COLLEGE_SCALE);
  const [activeTab, setActiveTab] = useState<'college' | 'hs'>('college');

  const handleTabChange = (tab: 'college' | 'hs') => {
    setActiveTab(tab);
    setScale(tab === 'college' ? COLLEGE_SCALE : HS_SCALE);
  };

  const updateMinPercent = (index: number, val: number) => {
    const newScale = [...scale];
    newScale[index].minPercent = val;
    setScale(newScale);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
      <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900/30">
          <div>
            <h2 className="text-2xl font-bold text-black dark:text-white">Grading Scale Converter</h2>
            <p className="text-gray-600 dark:text-slate-400 text-sm">View or customize your school's specific grading brackets</p>
          </div>
          
          <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-300 dark:border-slate-700">
            <button 
              onClick={() => handleTabChange('college')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'college' ? 'bg-blue-600 text-black dark:text-white shadow-lg' : 'text-gray-600 dark:text-slate-400 hover:text-black dark:text-white'}`}
            >
              College (+/-)
            </button>
            <button 
              onClick={() => handleTabChange('hs')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'hs' ? 'bg-blue-600 text-black dark:text-white shadow-lg' : 'text-gray-600 dark:text-slate-400 hover:text-black dark:text-white'}`}
            >
              Standard
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">
           <div className="grid grid-cols-3 gap-4 px-6 py-3 text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider border-b border-gray-200 dark:border-slate-800 mb-4">
              <div>Letter Grade</div>
              <div className="text-center">Minimum %</div>
              <div className="text-right">GPA Value</div>
           </div>

           <div className="space-y-2">
             {scale.map((entry, idx) => (
               <div key={entry.letter} className="grid grid-cols-3 gap-4 items-center px-6 py-4 rounded-2xl bg-gray-100 dark:bg-slate-800/20 border border-transparent hover:border-gray-300 dark:border-slate-700 transition-all group">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center font-black text-black dark:text-white border border-gray-300 dark:border-slate-700 group-hover:bg-blue-600 group-hover:border-blue-500 transition-all">
                      {entry.letter}
                    </div>
                    <span className="text-black dark:text-white font-semibold">{entry.letter} Grade</span>
                 </div>
                 <div className="flex justify-center">
                    <input 
                      type="number" 
                      value={entry.minPercent}
                      onChange={(e) => updateMinPercent(idx, Number(e.target.value))}
                      className="w-20 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-2 py-1 text-black dark:text-white text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                 </div>
                 <div className="text-right font-mono font-bold text-blue-400 text-lg">
                   {entry.gpa.toFixed(1)}
                 </div>
               </div>
             ))}
           </div>
        </div>

        <div className="p-6 bg-blue-600/5 border-t border-blue-500/10 text-center">
           <p className="text-gray-600 dark:text-slate-400 text-sm">
             <strong className="text-blue-400">Pro Tip:</strong> Most universities use the 4.0 scale shown above. If your syllabus is different, you can manually edit the percentage values.
           </p>
        </div>
      </div>
    </div>
  );
};

export default GradeScale;
