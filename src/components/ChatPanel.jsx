import React, { useState } from 'react';

export function ChatPanel({ onSendMessage, isProcessing }) {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
  };

  return (
    <div style={{
      position: 'absolute', bottom: 20, right: 20, width: '300px',
      background: 'rgba(0,0,0,0.8)', padding: '15px', borderRadius: '10px',
      color: 'white', fontFamily: 'sans-serif'
    }}>
      <h3>AI Architect</h3>
      <p style={{fontSize: '0.8rem', color: '#ccc'}}>
        Try: "Make the living room bigger" or "Remove this wall"
      </p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '5px' }}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your change..."
          style={{ flex: 1, padding: '8px', borderRadius: '4px', border: 'none' }}
        />
        <button 
          type="submit" 
          disabled={isProcessing}
          style={{ padding: '8px', cursor: 'pointer', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {isProcessing ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}