import React, { useState } from 'react';
import { Scene } from './components/Scene';
import { ChatPanel } from './components/ChatPanel';

function App() {
  // 1. STATE MANAGEMENT
  const [walls, setWalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAiThinking, setAiThinking] = useState(false);

  // 2. HANDLE IMAGE UPLOAD
  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log("Sending image to backend...");
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log("Received walls:", data.walls);

      if (data.walls && data.walls.length > 0) {
        setWalls(data.walls);
      } else {
        alert("No walls detected! Try an image with higher contrast.");
      }
      
    } catch (error) {
      console.error("Error uploading:", error);
      alert("Error: Is the Python backend running?");
    } finally {
      setLoading(false);
    }
  };

  // 3. HANDLE CHAT INPUT (Placeholder for next step)
  // REPLACES THE OLD handleAiPrompt
const handleAiPrompt = async (prompt) => {
    setAiThinking(true);

    try {
      const response = await fetch('http://localhost:8000/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // THESE KEYS MUST MATCH THE PYTHON CLASS EXACTLY
        body: JSON.stringify({
          prompt: prompt,            // Matches "prompt: str"
          current_walls: walls       // Matches "current_walls: list"
        }),
      });

      const data = await response.json();
      if (data.walls) {
        setWalls(data.walls); 
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setAiThinking(false);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111', position: 'relative' }}>
      
      {/* THE 3D WORLD */}
      <Scene walls={walls} />
      
      {/* UI OVERLAY: Title & Upload */}
      <div style={{ 
        position: 'absolute', top: 20, left: 20, 
        color: 'white', fontFamily: 'sans-serif',
        background: 'rgba(0,0,0,0.8)', padding: '20px', borderRadius: '10px',
        zIndex: 10
      }}>
        <h1 style={{margin: '0 0 10px 0'}}>3D Floor Plan Generator</h1>
        
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleUpload} 
          style={{ marginBottom: '10px', color: 'white' }}
        />
        
        {loading && <p style={{color: '#f1c40f', margin: 0}}>Processing image...</p>}
        
        <p style={{ fontSize: '0.8rem', opacity: 0.7, maxWidth: '300px' }}>
          Upload a black & white floor plan image to generate the 3D model.
        </p>
      </div>

      {/* UI OVERLAY: Chat Panel (Only shows if we have walls) */}
      {walls.length > 0 && (
        <ChatPanel 
          onSendMessage={handleAiPrompt} 
          isProcessing={isAiThinking} 
        />
      )}

    </div>
  );
}

export default App;