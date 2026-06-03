import React, { useState, memo ,useCallback} from 'react';

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

// NEW: Extracted the row and wrapped it in memo() to prevent re-render cascades
const ScaleRow = memo(({ entry, idx, updateMinPercent, updateGpa }: { 
  entry: GradeEntry, 
  idx: number, 
  updateMinPercent: (idx: number, val: number) => void, 
  updateGpa: (idx: number, val: number) => void 
}) => (
  <div className="grid grid-cols-3 gap-2 items-center px-3 md:px-6 py-3 rounded-2xl bg-gray-100 dark:bg-slate-800/20 border border-transparent hover:border-gray-300 dark:hover:border-slate-700 transition-all group">
    <div className="flex items-center gap-2 md:gap-4 min-w-0">
      <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center font-black text-sm md:text-base text-black dark:text-white border border-gray-300 dark:border-slate-700 group-hover:bg-blue-600 group-hover:border-blue-500 group-hover:text-white transition-all">
        {entry.letter}
      </div>
      <span className="text-black dark:text-white font-semibold text-xs md:text-sm truncate">{entry.letter} Grade</span>
    </div>

    <div className="flex justify-center">
      <input
        type="number"
        value={entry.minPercent}
        onChange={(e) => updateMinPercent(idx, Number(e.target.value))}
        className="w-16 md:w-20 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-1 md:px-2 py-1 text-black dark:text-white text-center text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
      />
    </div>

    <div className="flex justify-end">
      <input
        type="number"
        value={entry.gpa}
        step="0.1"
        min="0"
        max="5"
        onChange={(e) => updateGpa(idx, Number(e.target.value))}
        className="w-16 md:w-20 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-1 md:px-2 py-1 text-blue-400 font-mono font-bold text-center text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
      />
    </div>
  </div>
));

const GradeScale: React.FC = () => {
  const [scale, setScale] = useState<GradeEntry[]>(COLLEGE_SCALE.map(entry => ({ ...entry })));
  const [activeTab, setActiveTab] = useState<'college' | 'hs'>('college');

  const handleTabChange = (tab: 'college' | 'hs') => {
    setActiveTab(tab);
    setScale((tab === 'college' ? COLLEGE_SCALE : HS_SCALE).map(entry => ({ ...entry })));
  };

const updateMinPercent = useCallback((index: number, val: number) => {
  setScale(prev => prev.map((entry, i) => i === index ? { ...entry, minPercent: val } : entry));
}, []);

const updateGpa = useCallback((index: number, val: number) => {
  setScale(prev => prev.map((entry, i) => i === index ? { ...entry, gpa: Math.min(5, Math.max(0, val)) } : entry));
}, []);

  return (
    <div className="w-full max-w-4xl mx-auto p-3 md:p-6">
      <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden">

        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/30">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-black dark:text-white">Grading Scale Converter</h2>
              <p className="text-gray-600 dark:text-slate-400 text-xs md:text-sm mt-0.5">View or customize your school's grading brackets</p>
            </div>
            <button
              onClick={() => setScale(
                (activeTab === 'college' ? COLLEGE_SCALE : HS_SCALE).map(entry => ({ ...entry }))
              )}
              className="text-xs font-semibold text-gray-500 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors underline underline-offset-2 shrink-0 ml-4 mt-1">
              Reset
            </button>
          </div>
          <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-300 dark:border-slate-700">
            <button
              onClick={() => handleTabChange('college')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'college' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600 dark:text-slate-400 hover:text-black dark:hover:text-white'}`}
            >
              College (+/-)
            </button>
            <button
              onClick={() => handleTabChange('hs')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'hs' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600 dark:text-slate-400 hover:text-black dark:hover:text-white'}`}
            >
              Standard
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="grid grid-cols-3 gap-2 px-3 md:px-6 py-3 text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider border-b border-gray-200 dark:border-slate-800 mb-3">
            <div>Grade</div>
            <div className="text-center">Min %</div>
            <div className="text-right">GPA</div>
          </div>

          <div className="space-y-2">
            {scale.map((entry, idx) => (
              <ScaleRow 
                key={entry.letter} 
                entry={entry} 
                idx={idx} 
                updateMinPercent={updateMinPercent} 
                updateGpa={updateGpa} 
              />
            ))}
          </div>
        </div>

        <div className="p-4 md:p-6 bg-blue-600/5 border-t border-blue-500/10 text-center">
          <p className="text-gray-600 dark:text-slate-400 text-xs md:text-sm">
            <strong className="text-blue-400">Pro Tip:</strong> Most universities use the 4.0 scale shown above. If your syllabus is different, you can manually edit the percentage values.
          </p>
        </div>

      </div>
    </div>
  );
};

export default GradeScale;