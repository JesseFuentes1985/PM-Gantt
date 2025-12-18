
import React from 'react';

interface AIAssistantProps {
  insights: {
    summary: string;
    risks: string[];
    optimizations: string[];
  };
  onClose: () => void;
  isDarkMode?: boolean;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ insights, onClose, isDarkMode }) => {
  return (
    <div className={`fixed top-0 right-0 h-screen w-[400px] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
      <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'bg-gradient-to-r from-slate-900 to-indigo-950 border-slate-800' : 'bg-gradient-to-r from-indigo-50 to-blue-50 border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-lg">
            <i className="fas fa-robot"></i>
          </div>
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>Gemini AI Project Analyst</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-2 transition-colors">
          <i className="fas fa-times text-lg"></i>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* Executive Summary */}
        <section>
          <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Executive Summary</h3>
          <div className={`p-4 rounded-xl text-sm leading-relaxed shadow-sm border ${isDarkMode ? 'bg-blue-900/20 border-blue-900/40 text-blue-200' : 'bg-blue-50 border-blue-100 text-blue-900'}`}>
            {insights.summary}
          </div>
        </section>

        {/* Schedule Risks */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Schedule Risks</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isDarkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-600'}`}>CRITICAL</span>
          </div>
          <ul className="space-y-3">
            {insights.risks.map((risk, idx) => (
              <li key={idx} className={`flex gap-3 text-sm items-start ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
                {risk}
              </li>
            ))}
          </ul>
        </section>

        {/* Timeline Optimizations */}
        <section>
          <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Recommended Optimizations</h3>
          <div className="space-y-4">
            {insights.optimizations.map((opt, idx) => (
              <div key={idx} className={`p-4 rounded-xl border ${isDarkMode ? 'bg-green-900/10 border-green-900/30' : 'bg-green-50 border-green-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <i className={`fas fa-lightbulb ${isDarkMode ? 'text-green-500' : 'text-green-600'}`}></i>
                  <p className={`text-sm font-bold ${isDarkMode ? 'text-green-300' : 'text-green-900'}`}>Optimization {idx + 1}</p>
                </div>
                <p className={`text-sm leading-snug ${isDarkMode ? 'text-green-400/80' : 'text-green-800'}`}>{opt}</p>
              </div>
            ))}
          </div>
        </section>

        {/* AI Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-4">
          <button className={`text-xs p-3 rounded-lg transition-colors font-bold ${isDarkMode ? 'bg-slate-100 text-slate-900 hover:bg-white' : 'bg-gray-900 text-white hover:bg-black'}`}>
            Generate Report
          </button>
          <button className={`text-xs border p-3 rounded-lg transition-colors font-bold ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
            Share Analysis
          </button>
        </div>
      </div>

      <div className={`p-6 border-t ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
        <p className={`text-[10px] text-center leading-relaxed ${isDarkMode ? 'text-slate-600' : 'text-gray-400'}`}>
          Gemini 3.0 Analysis • Powered by live schedule data • Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default AIAssistant;
