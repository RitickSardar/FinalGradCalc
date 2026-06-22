import React, { useState, useEffect, useRef, useCallback } from 'react';

type Mode = 'work' | 'shortBreak' | 'longBreak';

const PomodoroTimer: React.FC = () => {
  const [settings, setSettings] = useState({ work: 25, shortBreak: 5, longBreak: 15 });
  const [tempSettings, setTempSettings] = useState({ work: 25, shortBreak: 5, longBreak: 15 });
  const [mode, setMode] = useState<Mode>('work');
  const [timeRemaining, setTimeRemaining] = useState(settings.work * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [totalTimeStudied, setTotalTimeStudied] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  const expectedEndTimeRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const playBeep = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio API error", e);
    }
  };

  const sendNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: '/favicon.svg' });
    }
  };

  const requestNotificationPermission = () => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const handleSessionComplete = useCallback(() => {
    playBeep();
    let nextMode: Mode = 'work';
    
    if (mode === 'work') {
      const newCompleted = completedSessions + 1;
      setCompletedSessions(newCompleted);
      setTotalTimeStudied(prev => prev + settings.work * 60);
      
      if (newCompleted % 4 === 0) {
        nextMode = 'longBreak';
        sendNotification("Time's up! Take a break 🍅", "You've completed 4 sessions! Enjoy a long break.");
      } else {
        nextMode = 'shortBreak';
        sendNotification("Time's up! Take a break 🍅", "Good job! Take a short break.");
      }
    } else if (mode === 'longBreak') {
      setShowCompletion(true);
      sendNotification("Cycle Complete! 🎉", "You've finished a full Pomodoro cycle!");
      setIsRunning(false);
      return;
    } else {
      nextMode = 'work';
      sendNotification("Break over! Back to work 💪", "Time to focus.");
    }
    
    setMode(nextMode);
    setTimeRemaining(settings[nextMode] * 60);
    setIsRunning(false);
    expectedEndTimeRef.current = null;
  }, [mode, completedSessions, settings]);

  useEffect(() => {
    if (isRunning) {
      if (!expectedEndTimeRef.current) {
        expectedEndTimeRef.current = Date.now() + timeRemaining * 1000;
      }

      timerRef.current = window.setInterval(() => {
        if (!expectedEndTimeRef.current) return;
        const remaining = Math.round((expectedEndTimeRef.current - Date.now()) / 1000);
        
        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeRemaining(0);
          handleSessionComplete();
        } else {
          setTimeRemaining(remaining);
        }
      }, 200); // 200ms interval for smooth drift correction
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      expectedEndTimeRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeRemaining, handleSessionComplete]);

  const toggleTimer = () => {
    if (!isRunning) {
      requestNotificationPermission();
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    expectedEndTimeRef.current = null;
    setTimeRemaining(settings[mode] * 60);
  };

  const skipSession = () => {
    setIsRunning(false);
    expectedEndTimeRef.current = null;
    handleSessionComplete();
  };

  const applySettings = () => {
    setSettings(tempSettings);
    setShowSettings(false);
    setIsRunning(false);
    expectedEndTimeRef.current = null;
    if (mode === 'work') setTimeRemaining(tempSettings.work * 60);
    else if (mode === 'shortBreak') setTimeRemaining(tempSettings.shortBreak * 60);
    else setTimeRemaining(tempSettings.longBreak * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getModeColor = () => {
    switch (mode) {
      case 'work': return 'text-red-500';
      case 'shortBreak': return 'text-green-500';
      case 'longBreak': return 'text-blue-500';
    }
  };

  const getModeBgColor = () => {
    switch (mode) {
      case 'work': return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30';
      case 'shortBreak': return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30';
      case 'longBreak': return 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30';
    }
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'work': return 'Work Session';
      case 'shortBreak': return 'Short Break';
      case 'longBreak': return 'Long Break';
    }
  };

  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const totalSeconds = settings[mode] * 60;
  const progressPercent = timeRemaining / totalSeconds;
  const strokeDashoffset = circumference - progressPercent * circumference;

  if (showCompletion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-6">
        <div className="max-w-md w-full text-center bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/30 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-indigo-600"></div>
          <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">🏆</span>
          </div>
          <h2 className="text-3xl font-black text-black dark:text-white mb-4">Cycle Complete!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">Great job staying focused.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
              <div className="text-3xl font-black text-blue-600 dark:text-blue-400">{Math.round(totalTimeStudied / 60)}</div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Minutes Studied</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
              <div className="text-3xl font-black text-blue-600 dark:text-blue-400">{completedSessions}</div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Sessions Done</div>
            </div>
          </div>
          
          <button
            onClick={() => {
              setCompletedSessions(0);
              setTotalTimeStudied(0);
              setMode('work');
              setTimeRemaining(settings.work * 60);
              setShowCompletion(false);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20"
          >
            Start New Cycle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-200px)] p-4 sm:p-6 max-w-lg mx-auto w-full items-center justify-center">
      
      {showSettings ? (
        <div className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-black dark:text-white">Settings</h2>
            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Work Session (minutes)</label>
              <input type="number" min="1" max="90" value={tempSettings.work} onChange={(e) => setTempSettings({...tempSettings, work: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-black dark:text-white outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Short Break (minutes)</label>
              <input type="number" min="1" max="30" value={tempSettings.shortBreak} onChange={(e) => setTempSettings({...tempSettings, shortBreak: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-black dark:text-white outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Long Break (minutes)</label>
              <input type="number" min="1" max="60" value={tempSettings.longBreak} onChange={(e) => setTempSettings({...tempSettings, longBreak: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-black dark:text-white outline-none focus:border-blue-500" />
            </div>
          </div>
          
          <button onClick={applySettings} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20">
            Apply Settings
          </button>
        </div>
      ) : (
        <div className={`w-full bg-white dark:bg-slate-900 border ${getModeBgColor()} rounded-3xl p-8 shadow-xl transition-colors duration-500`}>
          
          <div className="flex justify-between items-center mb-8">
            <h2 className={`text-2xl font-black uppercase tracking-wider ${getModeColor()}`}>
              {getModeTitle()}
            </h2>
            <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 bg-white dark:bg-slate-800 rounded-full border border-gray-100 dark:border-slate-700 shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </button>
          </div>

          <div className="flex justify-center mb-8 relative">
            <svg viewBox="0 0 300 300" className="w-full max-w-[300px] aspect-square transform -rotate-90 filter drop-shadow-md">
              {/* Background Circle */}
              <circle
                cx="150"
                cy="150"
                r={radius}
                fill="transparent"
                className="stroke-gray-100 dark:stroke-slate-800"
                strokeWidth="12"
              />
              {/* Progress Circle */}
              <circle
                cx="150"
                cy="150"
                r={radius}
                fill="transparent"
                className={`${mode === 'work' ? 'stroke-red-500' : mode === 'shortBreak' ? 'stroke-green-500' : 'stroke-blue-500'} transition-all duration-1000 ease-linear`}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={`text-5xl sm:text-6xl font-black tabular-nums ${getModeColor()}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-3 mb-8">
            {[0, 1, 2, 3].map((idx) => {
              const currentCycleSessions = completedSessions % 4;
              const isFilled = idx < currentCycleSessions;
              return (
                <div 
                  key={idx} 
                  className={`w-4 h-4 rounded-full transition-colors duration-300 ${isFilled ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-gray-200 dark:bg-slate-700'}`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={resetTimer}
              className="p-3 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-semibold text-sm"
            >
              Reset
            </button>

            <button
              onClick={toggleTimer}
              className={`px-8 py-4 rounded-2xl font-black text-xl text-white transition-all transform active:scale-95 shadow-xl ${
                mode === 'work' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 
                mode === 'shortBreak' ? 'bg-green-500 hover:bg-green-600 shadow-green-500/30' : 
                'bg-blue-500 hover:bg-blue-600 shadow-blue-500/30'
              }`}
            >
              {isRunning ? 'PAUSE' : 'START'}
            </button>

            <button
              onClick={skipSession}
              className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center"
              title="Skip to next session"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;
