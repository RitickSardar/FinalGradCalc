import React, { useState, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  status: 'new' | 'learning' | 'got_it' | 'struggling';
  misses: number;
}

const FlashcardGenerator: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('gemini_api_key') || '';
    }
    return '';
  });

  const [inputMode, setInputMode] = useState<'notes' | 'topic'>('topic');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [activeQueue, setActiveQueue] = useState<string[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const saveLocalKey = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const key = fd.get('apiKey') as string;
    if (key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
      setApiKey(key.trim());
    }
  };

  const generateFlashcards = async () => {
    if (!apiKey) {
      setError('Please set your Gemini API Key first.');
      return;
    }
    if (!inputText.trim()) {
      setError(`Please enter your ${inputMode === 'notes' ? 'notes' : 'topic'}.`);
      return;
    }

    setLoading(true);
    setError(null);
    setDeck([]);
    setActiveQueue([]);
    setAttempts(0);
    setIsComplete(false);
    setIsFlipped(false);

    const runGeneration = async (modelName: string) => {
      const apiProxy = localStorage.getItem('gemini_api_proxy') || '';
      const config: any = { apiKey: apiKey };
      if (apiProxy) config.baseUrl = apiProxy;

      const ai = new GoogleGenAI(config);
      
      let promptContext = '';
      if (inputMode === 'notes') {
        promptContext = `NOTES TO CONVERT:\n${inputText}`;
      } else {
        promptContext = `TOPIC:\n${inputText}\nGenerate comprehensive flashcards covering the key aspects of this topic.`;
      }

      const prompt = `You are an expert flashcard generator for students. 
Your job is to convert raw study notes or a topic into clean, testable flashcards.
Generate at least 6 high-quality flashcards.

RULES:
- Front: one specific question, term, or concept
- Back: concise answer, maximum 2 sentences
- Only extract clearly testable information
- No vague or opinion-based cards
- No redundant cards covering the same concept
- Prioritize: definitions, formulas, dates, processes, key terms

OUTPUT FORMAT:
Return only a JSON array, no extra text, no markdown, no explanation.
Example:
[
  {"front": "What is mitosis?", "back": "Cell division producing two identical daughter cells with the same chromosome count as the parent."},
  {"front": "What is the powerhouse of the cell?", "back": "The mitochondria, responsible for producing ATP through cellular respiration."}
]

${promptContext}`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      return response.text || '';
    };

    try {
      let text = '';
      let success = false;
      let lastErr: any = null;

      const modelsToTry = ['gemini-3.5-flash', 'gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];

      for (const model of modelsToTry) {
        try {
          console.log(`Attempting generation with model: ${model}...`);
          text = await runGeneration(model);
          success = true;
          break;
        } catch (err: any) {
          lastErr = err;
          const errMsg = err.message || '';
          if (errMsg.includes('401') || errMsg.includes('API_KEY_INVALID') || errMsg.includes('403')) {
            throw err;
          }
          console.warn(`${model} failed (${errMsg}). Falling back...`);
        }
      }

      if (!success) throw lastErr || new Error("All model fallbacks failed.");

      const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      let data;
      try {
        data = JSON.parse(cleanJson);
      } catch {
        throw new Error("JSON_PARSE_ERROR");
      }

      if (Array.isArray(data)) {
        const initializedDeck: Flashcard[] = data.map((item: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          front: item.front,
          back: item.back,
          status: 'new',
          misses: 0
        }));
        setDeck(initializedDeck);
        setActiveQueue(initializedDeck.map(c => c.id));
      } else {
        throw new Error('Invalid JSON structure returned');
      }
    } catch (err: any) {
      console.error("Gemini Error:", err);
      const errMsg = err.message || '';
      if (errMsg.includes('401')) setError('Invalid API key.');
      else if (errMsg.includes('429')) setError('Quota exceeded. Try again in a minute.');
      else if (errMsg.includes('JSON_PARSE_ERROR')) setError('Invalid format returned by AI. Try again.');
      else setError(`Failed to generate: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (gotIt: boolean) => {
    setAttempts(prev => prev + 1);
    
    if (activeQueue.length === 0) return;

    const currentCardId = activeQueue[0];
    const cardIndex = deck.findIndex(c => c.id === currentCardId);
    if (cardIndex === -1) return;

    const updatedDeck = [...deck];
    const card = updatedDeck[cardIndex];

    if (gotIt) {
      card.status = 'got_it';
      setDeck(updatedDeck);
      const newQueue = activeQueue.slice(1);
      setActiveQueue(newQueue);
      if (newQueue.length === 0) {
        setIsComplete(true);
      }
    } else {
      card.misses += 1;
      card.status = card.misses >= 2 ? 'struggling' : 'learning';
      setDeck(updatedDeck);
      
      setActiveQueue(prev => {
        const newQueue = prev.slice(1);
        // Insert card slightly back in the queue (e.g. 2-3 spots)
        const insertAt = Math.min(2 + Math.floor(Math.random() * 2), newQueue.length);
        newQueue.splice(insertAt, 0, currentCardId);
        return newQueue;
      });
    }
    
    setIsFlipped(false);
  };

  const getBorderColor = (status: Flashcard['status']) => {
    switch (status) {
      case 'new': return 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]';
      case 'learning': return 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]';
      case 'struggling': return 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]';
      case 'got_it': return 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]';
      default: return 'border-gray-200 dark:border-slate-700';
    }
  };

  const stats = useMemo(() => {
    const total = deck.length;
    const gotIt = deck.filter(c => c.status === 'got_it').length;
    const learning = deck.filter(c => c.status === 'learning').length;
    const struggling = deck.filter(c => c.status === 'struggling').length;
    const percentage = total === 0 ? 0 : Math.round((gotIt / total) * 100);
    return { total, gotIt, learning, struggling, percentage };
  }, [deck]);

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="max-w-xl w-full p-8 bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-2xl">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 text-blue-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
          </div>
          <h2 className="text-3xl font-black text-black dark:text-white mb-2">Connect to Gemini AI</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Provide your own free Gemini API key to generate flashcards.</p>
          <div className="space-y-6 mb-8">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold shrink-0 mt-0.5">1</div>
              <div>
                <p className="font-semibold text-black dark:text-white">Get a free key</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Google AI Studio</a>.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold shrink-0 mt-0.5">2</div>
              <p className="font-semibold text-black dark:text-white">Create & Copy API Key</p>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold shrink-0 mt-0.5">3</div>
              <p className="font-semibold text-black dark:text-white text-sm">Paste it below. Stored locally in your browser only.</p>
            </div>
          </div>
          <form onSubmit={saveLocalKey} className="flex gap-3 flex-col sm:flex-row">
            <input type="password" name="apiKey" required className="flex-1 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-black dark:text-white focus:border-blue-500 outline-none transition-all placeholder:text-gray-400" placeholder="AIzaSy..." />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap">Save Key & Continue</button>
          </form>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
            ⚠️ Stored locally in your browser. Never share this device with untrusted users.
          </p>
        </div>
      </div>
    );
  }

  // Generate Stage UI
  if (deck.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-[calc(100vh-200px)] p-6">
        <div className="max-w-3xl w-full mx-auto space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
            <h1 className="text-3xl font-black text-black dark:text-white mb-2">Flashcard Generator</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create a smart deck with spaced repetition using AI.
            </p>

            <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
              <button 
                onClick={() => setInputMode('topic')} 
                className={`flex-1 py-2.5 px-4 text-sm font-bold rounded-lg transition-all ${inputMode === 'topic' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                By Topic
              </button>
              <button 
                onClick={() => setInputMode('notes')} 
                className={`flex-1 py-2.5 px-4 text-sm font-bold rounded-lg transition-all ${inputMode === 'notes' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                From Notes
              </button>
            </div>

            {inputMode === 'topic' ? (
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="E.g., Photosynthesis, World War II, React Hooks..."
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-4 text-black dark:text-white outline-none focus:border-blue-500 shadow-sm mb-6 font-medium"
                onKeyDown={(e) => e.key === 'Enter' && generateFlashcards()}
              />
            ) : (
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your lecture notes, textbook excerpts, or articles here..."
                className="w-full h-48 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-4 text-black dark:text-white outline-none focus:border-blue-500 shadow-sm resize-none mb-6 font-medium"
              />
            )}

            <div className="flex justify-end">
              <button
                onClick={generateFlashcards}
                disabled={loading || !inputText.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    Generating Deck...
                  </>
                ) : 'Generate Flashcards'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded-r-xl text-sm flex justify-between items-start shadow-sm">
              <p className="font-medium">{error}</p>
              <button onClick={() => setError(null)} aria-label="Dismiss error" className="font-bold text-lg hover:text-red-900 ml-4">&times;</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Complete Stage UI
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-200px)] p-6">
        <div className="max-w-lg w-full text-center bg-white dark:bg-slate-900 border border-green-200 dark:border-green-900/30 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600"></div>
          
          <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
          </div>
          
          <h2 className="text-4xl font-black text-black dark:text-white mb-4">Deck Mastered!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">You successfully learned all {stats.total} cards.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
              <div className="text-3xl font-black text-blue-600 dark:text-blue-400">{stats.total}</div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Cards Learned</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
              <div className="text-3xl font-black text-blue-600 dark:text-blue-400">{attempts}</div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Total Attempts</div>
            </div>
          </div>
          
          <button
            onClick={() => {
              setDeck([]);
              setActiveQueue([]);
              setAttempts(0);
              setIsComplete(false);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20"
          >
            Create New Deck
          </button>
        </div>
      </div>
    );
  }

  // Active Deck UI
  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-200px)] p-6 max-w-4xl mx-auto w-full">
      {/* Progress Header */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm mb-8">
        <div className="flex justify-between items-end mb-3">
          <div>
            <h2 className="text-xl font-bold text-black dark:text-white">Active Session</h2>
            <div className="flex gap-4 mt-1">
              <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md">
                Got it: {stats.gotIt}
              </span>
              <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-md">
                Learning: {stats.learning}
              </span>
              <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md">
                Struggling: {stats.struggling}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.percentage}%</span>
            <span className="text-sm font-bold text-gray-400 block">Mastery</span>
          </div>
        </div>
        
        {/* Liquid Progress Bar */}
        <div className="w-full h-6 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden relative shadow-inner">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700 ease-out flex items-center justify-end pr-2 liquid-bar"
            style={{ width: `${stats.percentage}%` }}
          >
            <div className="w-full h-full absolute top-0 left-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHBhdGggZD0iTTAgMjBWMHExMCAwIDEwIDEwdDEwIDEwSDAiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] bg-[length:20px_20px] animate-[slide_1s_linear_infinite]"></div>
          </div>
        </div>
      </div>

      {/* Card Stack Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[400px]">
        {activeQueue.slice(0, 4).reverse().map((cardId, index, arr) => {
          // Since we reversed, the top card is actually the last element in the array
          const isTop = index === arr.length - 1;
          // Calculate logical depth (0 is top, 1 is next, etc)
          const depth = arr.length - 1 - index;
          
          const card = deck.find(c => c.id === cardId);
          if (!card) return null;

          const translateY = depth * 15;
          const scale = 1 - (depth * 0.05);
          const opacity = 1 - (depth * 0.2);
          const zIndex = 40 - depth;

          return (
            <div
              key={card.id}
              className={`absolute w-full max-w-xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isTop ? 'cursor-pointer group perspective-1000' : 'pointer-events-none'}`}
              style={{
                transform: `translateY(${translateY}px) scale(${scale})`,
                opacity: opacity,
                zIndex: zIndex,
              }}
              onClick={() => {
                if (isTop && !isFlipped) setIsFlipped(true);
              }}
            >
              <div className={`relative w-full aspect-[4/3] sm:aspect-[16/9] transition-transform duration-700 preserve-3d ${(isTop && isFlipped) ? 'rotate-y-180' : ''}`}>
                
                {/* Front */}
                <div className={`absolute w-full h-full backface-hidden bg-white dark:bg-slate-800 border-4 rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col items-center justify-center text-center transition-colors ${getBorderColor(card.status)}`}>
                  <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${card.status === 'new' ? 'bg-blue-500' : card.status === 'learning' ? 'bg-yellow-500' : card.status === 'struggling' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white leading-tight">{card.front}</h3>
                  {isTop && !isFlipped && (
                    <div className="absolute bottom-6 text-sm font-bold text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full animate-bounce">
                      Click to flip
                    </div>
                  )}
                </div>
                
                {/* Back */}
                <div className={`absolute w-full h-full backface-hidden bg-white dark:bg-slate-800 border-4 ${getBorderColor(card.status)} rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col items-center justify-center text-center rotate-y-180`}>
                  <div className="overflow-y-auto w-full max-h-full pb-20 scrollbar-hide">
                    <p className="text-xl sm:text-2xl text-slate-700 dark:text-gray-100 leading-relaxed font-medium">{card.back}</p>
                  </div>
                  
                  {isTop && isFlipped && (
                    <div className="absolute bottom-6 left-0 w-full flex justify-center gap-4 px-6">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAnswer(false); }}
                        className="flex-1 max-w-[200px] bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-yellow-500/30 transform hover:-translate-y-1 active:translate-y-0"
                      >
                        Still Learning
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAnswer(true); }}
                        className="flex-1 max-w-[200px] bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-green-500/30 transform hover:-translate-y-1 active:translate-y-0"
                      >
                        Got It
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slide {
          0% { background-position: 0 0; }
          100% { background-position: 20px 0; }
        }
      `}</style>
    </div>
  );
};

export default FlashcardGenerator;
