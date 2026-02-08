import React, { useState } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';

export function ChatPanel({ onSendMessage, isProcessing }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    onSendMessage(input);
    setInput('');
  };

  return (
    // pointer-events-auto ensures the 3D canvas doesn't steal clicks
    <div className="pointer-events-auto w-full max-w-2xl mx-auto">
      
      {/* Input Container */}
      <div className="relative group">
        {/* Animated Glow Border */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-500" />
        
        <form 
          onSubmit={handleSubmit}
          className="relative flex items-center gap-2 bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl"
        >
          {/* AI Icon */}
          <div className="pl-3 text-indigo-400">
            {isProcessing ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Sparkles size={20} />
            )}
          </div>

          {/* Text Input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isProcessing ? "AI is thinking..." : "Ask Structura to move walls, add doors, or redesign..."}
            disabled={isProcessing}
            className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 px-3 py-3 outline-none min-w-0"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center
              ${!input.trim() || isProcessing 
                ? 'bg-white/5 text-slate-500 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)]'
              }`}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
      
      {/* Helper Text */}
      <div className="text-center mt-3">
        <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">
          AI Architecture Assistant Active
        </p>
      </div>
    </div>
  );
}