import React, { useState, useMemo, useDeferredValue } from 'react';

const Calculator: React.FC = () => {
  // Core State (Updates Instantly on UI)
  const [currentScore, setCurrentScore] = useState<number | ''>(85);
  const [totalPoints, setTotalPoints] = useState<number | ''>(100);
  const [finalWeight, setFinalWeight] = useState<number | ''>(20);
  const [targetGrade, setTargetGrade] = useState<number | ''>(90);
  
  // Adjustments (Updates Instantly on UI)
  const [extraCredit, setExtraCredit] = useState<number | ''>('');
  const [dropEarned, setDropEarned] = useState<number | ''>('');
  const [dropTotal, setDropTotal] = useState<number | ''>('');
  
  // What-If State (Updates Instantly on UI)
  const [whatIfScore, setWhatIfScore] = useState<number>(85);

  // DEFERRED STATE: These wait for the browser to be idle before updating
  const deferredCurrentScore = useDeferredValue(currentScore);
  const deferredTotalPoints = useDeferredValue(totalPoints);
  const deferredFinalWeight = useDeferredValue(finalWeight);
  const deferredTargetGrade = useDeferredValue(targetGrade);
  const deferredExtraCredit = useDeferredValue(extraCredit);
  const deferredDropEarned = useDeferredValue(dropEarned);
  const deferredDropTotal = useDeferredValue(dropTotal);
  const deferredWhatIfScore = useDeferredValue(whatIfScore);

  // Safe Math Helpers
  const safeNum = (val: number | '') => val === '' ? 0 : val;

  // Derived Calculations (Fixed Math using DEFERRED values)
  const currentGradePct = useMemo(() => {
    const adjustedTotal = Math.max(1, safeNum(deferredTotalPoints) - safeNum(deferredDropTotal));
    const adjustedScore = Math.max(0, safeNum(deferredCurrentScore) + safeNum(deferredExtraCredit) - safeNum(deferredDropEarned));
    return (adjustedScore / adjustedTotal) * 100;
  }, [deferredCurrentScore, deferredTotalPoints, deferredExtraCredit, deferredDropEarned, deferredDropTotal]);

  const requiredFinal = useMemo(() => {
    const wFinal = safeNum(deferredFinalWeight);
    const wTarget = safeNum(deferredTargetGrade);
    if (wFinal <= 0) return 0;
    
    const remainingWeight = 100 - wFinal;
    const currentContribution = currentGradePct * (remainingWeight / 100);
    return (wTarget - currentContribution) / (wFinal / 100);
  }, [currentGradePct, deferredTargetGrade, deferredFinalWeight]);

  const whatIfFinalGrade = useMemo(() => {
    const wFinal = safeNum(deferredFinalWeight);
    const remainingWeight = 100 - wFinal;
    const currentContribution = currentGradePct * (remainingWeight / 100);
    return currentContribution + (deferredWhatIfScore * (wFinal / 100));
  }, [currentGradePct, deferredWhatIfScore, deferredFinalWeight]);

  const getLetterGrade = (grade: number) => {
    if (grade >= 90) return { label: 'A', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' };
    if (grade >= 80) return { label: 'B', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' };
    if (grade >= 70) return { label: 'C', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' };
    if (grade >= 60) return { label: 'D', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' };
    return { label: 'F', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' };
  };

  const currentLetter = getLetterGrade(currentGradePct);
  const whatIfLetter = getLetterGrade(whatIfFinalGrade);

  return (
    <div className="w-full">
      {/* Embedded CSS to hide ugly default number arrows */}
      <style>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .custom-slider::-webkit-slider-thumb {
          appearance: none; width: 24px; height: 24px; border-radius: 50%; background: #60a5fa; cursor: pointer; border: 4px solid #1e293b; box-shadow: 0 0 10px rgba(96, 165, 250, 0.5);
        }
        .custom-slider::-moz-range-thumb {
          width: 24px; height: 24px; border-radius: 50%; background: #60a5fa; cursor: pointer; border: 4px solid #1e293b;
        }
      `}</style>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Data Entry */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900/80 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
            
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2"></div>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              </div>
              <h2 className="text-2xl font-bold text-black dark:text-white tracking-tight">Current Standing</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              <div className="space-y-2">
                <label htmlFor="currentScore" className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider ml-1">Points Earned</label>
                <div className="relative group">
                  <input id="currentScore" type="number" value={currentScore} onChange={(e) => setCurrentScore(e.target.value ? Number(e.target.value) : '')} className="w-full bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-black dark:text-white text-lg font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-600" placeholder="e.g. 85" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="totalPoints" className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider ml-1">Total Possible</label>
                <input id="totalPoints" type="number" value={totalPoints} onChange={(e) => setTotalPoints(e.target.value ? Number(e.target.value) : '')} className="w-full bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-black dark:text-white text-lg font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-600" placeholder="e.g. 100" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label htmlFor="finalWeight" className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider ml-1">Final Weight (%)</label>
                <input id="finalWeight" type="number" value={finalWeight} onChange={(e) => setFinalWeight(e.target.value ? Math.min(100, Math.max(0, Number(e.target.value))) : '')}className="w-full bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-black dark:text-white text-lg font-medium focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder-slate-600" placeholder="20" />
              </div>
              <div className="space-y-2">
                <label htmlFor="targetGrade" className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider ml-1">Target Grade (%)</label>
                <input id="targetGrade" type="number" value={targetGrade} onChange={(e) => setTargetGrade(e.target.value ? Number(e.target.value) : '')} className="w-full bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-black dark:text-white text-lg font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder-slate-600" placeholder="90" />
              </div>
            </div>
          </div>

          {/* Advanced Adjustments Panel */}
          <div className="bg-white dark:bg-slate-900/40 p-6 rounded-2xl border border-gray-200 dark:border-slate-800/60">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
              Edge Cases & Adjustments
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5 sm:col-span-1">
                <label htmlFor="extraCredit" className="text-[11px] font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider ml-1 block">Extra Credit (+)</label>
                <input id="extraCredit" type="number" value={extraCredit} onChange={(e) => setExtraCredit(e.target.value ? Number(e.target.value) : '')} placeholder="0 pts" className="w-full bg-gray-50 dark:bg-slate-950/30 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-black dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-sm h-[42px]" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="dropEarned" className="text-[11px] font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider ml-1 block">
                  Drop Lowest (Earned / Total)
                </label>
                <div className="flex items-center gap-2">
                  <input id="dropEarned" type="number" value={dropEarned} onChange={(e) => setDropEarned(e.target.value ? Number(e.target.value) : '')} placeholder="Earned pts" className="w-full bg-gray-50 dark:bg-slate-950/30 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-black dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all text-sm h-[42px]" />
                  <span className="text-gray-400 dark:text-slate-600 font-light text-xl leading-none">/</span>
                  <input id="dropTotal" aria-label="Drop lowest total points" type="number" value={dropTotal} onChange={(e) => setDropTotal(e.target.value ? Number(e.target.value) : '')} placeholder="Total pts" className="w-full bg-gray-50 dark:bg-slate-950/30 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-black dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all text-sm h-[42px]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Output & Visualization */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* The "Reverse Calculator" Hero Card */}
          <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-500 p-8 rounded-3xl shadow-[0_20px_40px_-15px_rgba(37,99,235,0.3)] text-black dark:text-white relative overflow-hidden group">

            <div className="relative z-10 flex flex-col items-center text-center">
              <p className="text-blue-100/90 font-medium tracking-wide text-sm mb-2 uppercase">To achieve your target</p>
              <div className="flex items-baseline gap-2 mb-1">
                <h2 className="text-7xl font-black tracking-tighter">
                  {requiredFinal > 150 
                ? 'N/A' 
                : requiredFinal < 0 
                    ? '0 — Already Passing!' 
                    : requiredFinal.toFixed(1)}<span className="text-4xl text-blue-200">%</span>
                </h2>
              </div>
              <p className="text-blue-200/80 text-sm mt-3 bg-white/10 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                Required Final Exam Score
              </p>
            </div>
            {requiredFinal > 100 && (
              <div className="absolute bottom-0 left-0 w-full bg-red-500/90 text-center py-2 text-xs font-bold text-black dark:text-white uppercase tracking-wider backdrop-blur-md">
                Mathematically Impossible
              </div>
            )}
          </div>

          {/* Current Grade Micro-Card */}
          <div className={`border p-5 rounded-2xl flex items-center justify-between transition-colors duration-300 ${currentLetter.bg} ${currentLetter.border}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-2xl bg-gray-50 dark:bg-slate-950/50 shadow-inner ${currentLetter.color}`}>
                {currentLetter.label}
              </div>
              <div>
                <p className="text-gray-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-0.5">Entering Final With</p>
                <p className="text-2xl font-bold text-black dark:text-white tracking-tight">{currentGradePct.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* The "What-If" Engine */}
          <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800 p-5 rounded-2xl space-y-6 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h3 className="text-black dark:text-white font-bold text-lg flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                  What-If Engine
                </h3>
                <p className="text-gray-600 dark:text-slate-400 text-xs mt-1">Slide to simulate exam performance</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-800">
                <span className="text-2xl font-black text-black dark:text-white">{whatIfScore}%</span>
              </div>
            </div>
            
            <div className="relative pt-2 pb-4">
              <input 
                aria-label="What-if exam score"
                type="range" min="0" max="110" step="1" value={whatIfScore} 
                onChange={(e) => setWhatIfScore(Number(e.target.value))}
                className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-lg appearance-none custom-slider outline-none"
              />
              <div className="absolute top-10 left-0 w-full flex justify-between text-[10px] font-bold text-gray-500 dark:text-slate-500">
                <span>0%</span>
                <span>55%</span>
                <span>110%</span>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-gray-600 dark:text-slate-400 text-sm font-medium">Projected Overall:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-black dark:text-white tracking-tight">{whatIfFinalGrade.toFixed(2)}%</span>
                <span className={`font-black text-lg ${whatIfLetter.color}`}>{whatIfLetter.label}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Calculator;