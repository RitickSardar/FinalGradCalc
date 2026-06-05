import React, { useState, useEffect } from 'react';

const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [apiProxy, setApiProxy] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) setApiKey(storedKey);

    const storedProxy = localStorage.getItem('gemini_api_proxy');
    if (storedProxy) setApiProxy(storedProxy);
  }, []);

  const saveKey = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    localStorage.setItem('gemini_api_proxy', apiProxy);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const removeKey = () => {
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('gemini_api_proxy');
    setApiKey('');
    setApiProxy('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-xl mt-10">
      <h2 className="text-3xl font-black mb-2 text-black dark:text-white">API Settings</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">Manage your connection to Google's Gemini AI to power the tools.</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            Your Gemini API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-black dark:text-white focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 mb-4"
            placeholder="paste your key here..."
          />
          
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            API Proxy URL (Optional)
          </label>
          <input
            type="url"
            value={apiProxy}
            onChange={(e) => setApiProxy(e.target.value)}
            className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-black dark:text-white focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
            placeholder="https://your-custom-proxy.com"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
            Experiencing quota limits or regional blocks? Enter a custom proxy URL above to route requests. Keys and URLs are stored strictly in your browser.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={saveKey}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20"
          >
            {saved ? 'Saved!' : 'Save API Key'}
          </button>
          {apiKey && (
            <button
              onClick={removeKey}
              className="px-6 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-bold py-3 rounded-xl transition-all"
            >
              Remove
            </button>
          )}
        </div>

        <div className="pt-8 mt-8 border-t border-gray-200 dark:border-slate-800">
           <h3 className="font-bold text-lg text-black dark:text-white mb-4">How to get an API Key?</h3>
           <ol className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
             <li className="flex gap-3">
               <span className="font-bold text-blue-500">1.</span>
               <span>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Google AI Studio</a>.</span>
             </li>
             <li className="flex gap-3">
               <span className="font-bold text-blue-500">2.</span>
               <span>Click "Create API Key" and generate a new key using your Google Account.</span>
             </li>
             <li className="flex gap-3">
               <span className="font-bold text-blue-500">3.</span>
               <span>Copy the key and paste it into the field above.</span>
             </li>
           </ol>
        </div>
      </div>
    </div>
  );
};

export default Settings;
