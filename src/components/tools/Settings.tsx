import React, { useState, useEffect } from 'react';

const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) setApiKey(storedKey);
  }, []);

  const saveKey = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xl mt-10">
      <h2 className="text-2xl font-bold mb-6 text-black dark:text-white">Gemini API Settings</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Gemini API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-black dark:text-white focus:border-blue-500 outline-none transition-all"
            placeholder="paste your key here..."
          />
          <p className="mt-2 text-xs text-gray-500">
            Your key is stored locally in your browser and never sent to our servers.
          </p>
        </div>
        <button
          onClick={saveKey}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/20"
        >
          {saved ? 'Saved!' : 'Save API Key'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
