import React, { useState, useEffect, useRef } from 'react';

const PHASE_DURATION = 4000; // 4 seconds

const BoxBreathing: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState(0); // 0: Inhale, 1: Hold, 2: Exhale, 3: Hold
  const [remainingMs, setRemainingMs] = useState(PHASE_DURATION);
  const [cycles, setCycles] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [hasShownCompletion, setHasShownCompletion] = useState(false);

  const expectedEndTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      if (!expectedEndTimeRef.current) {
        expectedEndTimeRef.current = Date.now() + remainingMs;
      }

      const timer = setInterval(() => {
        const now = Date.now();
        let rem = expectedEndTimeRef.current! - now;

        if (rem <= 0) {
          let tempPhase = phase;
          let tempCycles = cycles;

          while (rem <= 0) {
            rem += PHASE_DURATION;
            tempPhase = (tempPhase + 1) % 4;
            if (tempPhase === 0) tempCycles++;
          }

          setPhase(tempPhase);
          setCycles(tempCycles);
          setRemainingMs(rem);
          expectedEndTimeRef.current = now + rem;

          if (tempCycles >= 5 && !hasShownCompletion) {
            setShowCompletion(true);
            setHasShownCompletion(true);
            setIsRunning(false);
            expectedEndTimeRef.current = null;
          }
        } else {
          setRemainingMs(rem);
        }
      }, 50);

      return () => clearInterval(timer);
    } else {
      expectedEndTimeRef.current = null;
    }
  }, [isRunning, phase, remainingMs, cycles, hasShownCompletion]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setPhase(0);
    setRemainingMs(PHASE_DURATION);
    setCycles(0);
    setShowCompletion(false);
    setHasShownCompletion(false);
    expectedEndTimeRef.current = null;
  };

  const continueSession = () => {
    setShowCompletion(false);
    setIsRunning(true);
  };

  const getLineOffset = (lineIndex: number) => {
    const boxSize = 240;
    if (!isRunning && remainingMs === PHASE_DURATION && phase === 0 && cycles === 0) {
      return boxSize;
    }
    const C = cycles * 4 + phase + (1 - remainingMs / PHASE_DURATION);
    const tau = C - lineIndex;
    if (tau < 0) return boxSize;
    return boxSize - tau * boxSize;
  };

  const getPhaseText = () => {
    switch (phase) {
      case 0: return 'Inhale';
      case 1: return 'Hold';
      case 2: return 'Exhale';
      case 3: return 'Hold';
    }
  };

  const getPhaseColorHex = (p: number) => {
    switch (p) {
      case 0: return '#60a5fa'; // blue-400
      case 1: return '#c084fc'; // purple-400
      case 2: return '#4ade80'; // green-400
      case 3: return '#facc15'; // yellow-400
    }
  };

  const getPhaseTextColorClass = () => {
    switch (phase) {
      case 0: return 'text-blue-500 dark:text-blue-400';
      case 1: return 'text-purple-500 dark:text-purple-400';
      case 2: return 'text-green-500 dark:text-green-400';
      case 3: return 'text-yellow-500 dark:text-yellow-400';
    }
  };

  const getBgClass = () => {
    if (!isRunning && remainingMs === PHASE_DURATION && phase === 0 && cycles === 0) {
      return 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800';
    }
    switch (phase) {
      case 0: return 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30';
      case 1: return 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-900/30';
      case 2: return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30';
      case 3: return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/30';
      default: return 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800';
    }
  };

  if (showCompletion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-6">
        <div className="max-w-md w-full text-center bg-white dark:bg-slate-900 border border-green-200 dark:border-green-900/30 rounded-3xl p-10 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600"></div>
          
          <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">🌿</span>
          </div>
          
          <h2 className="text-3xl font-black text-black dark:text-white mb-4">Great job.</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">You should feel calmer now.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
              <div className="text-3xl font-black text-green-600 dark:text-green-400">{cycles}</div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Cycles Done</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
              <div className="text-3xl font-black text-green-600 dark:text-green-400">1:20</div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Total Time</div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={continueSession}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-green-600/20"
            >
              Continue Breathing
            </button>
            <button
              onClick={resetTimer}
              className="w-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold py-3.5 rounded-xl transition-all"
            >
              Stop & Reset
            </button>
          </div>
        </div>
      </div>
    );
  }

  const svgSize = 260;
  const boxSize = 240;
  const strokeWidth = 8;
  const offset = (svgSize - boxSize) / 2; // 10

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-200px)] p-4 sm:p-6 max-w-lg mx-auto w-full items-center justify-center animate-in fade-in duration-1000">
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-black dark:text-white mb-2">Box Breathing</h1>
        <p className="text-gray-600 dark:text-gray-400 font-medium">Follow the animation. Breathe in sync with the box.</p>
      </div>

      <div className={`w-full border ${getBgClass()} rounded-[2.5rem] p-8 sm:p-12 shadow-xl transition-colors duration-1000 flex flex-col items-center relative`}>
        
        {/* Cycle Counter Badge */}
        <div className="absolute top-6 right-6 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full text-xs font-bold text-gray-500 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-slate-700">
          Cycles: {cycles}
        </div>

        <div className="relative w-[260px] h-[260px] my-4">
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="drop-shadow-sm">
            {/* Background static box */}
            <rect
              x={offset}
              y={offset}
              width={boxSize}
              height={boxSize}
              fill="transparent"
              stroke="currentColor"
              className="text-gray-200 dark:text-slate-800 transition-colors duration-1000"
              strokeWidth={strokeWidth}
              rx="4"
            />
            
            {/* Top Line (Inhale) */}
            <line
              x1={offset}
              y1={offset}
              x2={offset + boxSize}
              y2={offset}
              stroke={getPhaseColorHex(0)}
              strokeWidth={strokeWidth}
              strokeDasharray={`${boxSize} ${boxSize * 3}`}
              strokeDashoffset={getLineOffset(0)}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-75 ease-linear"
              style={{ filter: phase === 0 && isRunning ? `drop-shadow(0 0 6px ${getPhaseColorHex(0)})` : 'none' }}
            />
            
            {/* Right Line (Hold) */}
            <line
              x1={offset + boxSize}
              y1={offset}
              x2={offset + boxSize}
              y2={offset + boxSize}
              stroke={getPhaseColorHex(1)}
              strokeWidth={strokeWidth}
              strokeDasharray={`${boxSize} ${boxSize * 3}`}
              strokeDashoffset={getLineOffset(1)}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-75 ease-linear"
              style={{ filter: phase === 1 && isRunning ? `drop-shadow(0 0 6px ${getPhaseColorHex(1)})` : 'none' }}
            />

            {/* Bottom Line (Exhale) */}
            <line
              x1={offset + boxSize}
              y1={offset + boxSize}
              x2={offset}
              y2={offset + boxSize}
              stroke={getPhaseColorHex(2)}
              strokeWidth={strokeWidth}
              strokeDasharray={`${boxSize} ${boxSize * 3}`}
              strokeDashoffset={getLineOffset(2)}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-75 ease-linear"
              style={{ filter: phase === 2 && isRunning ? `drop-shadow(0 0 6px ${getPhaseColorHex(2)})` : 'none' }}
            />

            {/* Left Line (Hold) */}
            <line
              x1={offset}
              y1={offset + boxSize}
              x2={offset}
              y2={offset}
              stroke={getPhaseColorHex(3)}
              strokeWidth={strokeWidth}
              strokeDasharray={`${boxSize} ${boxSize * 3}`}
              strokeDashoffset={getLineOffset(3)}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-75 ease-linear"
              style={{ filter: phase === 3 && isRunning ? `drop-shadow(0 0 6px ${getPhaseColorHex(3)})` : 'none' }}
            />
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-colors duration-1000">
            <span className={`text-3xl font-black uppercase tracking-widest ${getPhaseTextColorClass()} transition-colors duration-1000`}>
              {getPhaseText()}
            </span>
            <span className={`text-6xl font-black tabular-nums mt-2 ${getPhaseTextColorClass()} transition-colors duration-1000 opacity-90`}>
              {Math.ceil(remainingMs / 1000)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-8 w-full">
          <button
            onClick={resetTimer}
            className="p-3 text-gray-500 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors font-semibold text-sm shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
          >
            Reset
          </button>

          <button
            onClick={toggleTimer}
            className={`w-40 py-4 rounded-2xl font-black text-xl text-white transition-all transform active:scale-95 shadow-xl ${
              isRunning 
                ? 'bg-slate-800 hover:bg-slate-900 shadow-slate-800/30 dark:bg-slate-700 dark:hover:bg-slate-600' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
            }`}
          >
            {isRunning ? 'PAUSE' : 'START'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default BoxBreathing;
