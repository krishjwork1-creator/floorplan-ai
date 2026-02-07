import React, { useState, useEffect } from 'react';
import { Scene } from './components/Scene';
import { ChatPanel } from './components/ChatPanel';
import { Auth } from './components/Auth';
import { supabase } from './supabaseClient';

function App() {
  const [session, setSession] = useState(null);
  const [walls, setWalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAiThinking, setAiThinking] = useState(false);

  // 1. CHECK LOGIN STATUS
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. HANDLE UPLOAD
  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // NOTE: If you are testing on localhost, change this to http://localhost:8000
      // If deployed, use your Render URL.
      const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:8000' 
        : 'https://floorplan-ai-cgs8.onrender.com'; // <--- CHECK THIS URL

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.walls) {
        setWalls(data.walls);
      } else {
        alert("No walls found. Try a clearer image.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Backend error. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  // 3. HANDLE AI CHAT
  const handleAiPrompt = async (prompt) => {
    setAiThinking(true);
    try {
      const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:8000' 
        : 'https://floorplan-ai-cgs8.onrender.com'; // <--- CHECK THIS URL

      const response = await fetch(`${API_URL}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, current_walls: walls }),
      });

      const data = await response.json();
      if (data.walls) setWalls(data.walls);
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setAiThinking(false);
    }
  };

  // 4. IF NOT LOGGED IN, SHOW LOGIN SCREEN
  if (!session) {
    return <Auth />;
  }

  // 5. IF LOGGED IN, SHOW THE APP
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111', position: 'relative' }}>
      
      {/* SIGN OUT BUTTON */}
      <button 
        onClick={() => supabase.auth.signOut()}
        style={{
          position: 'absolute', top: 20, right: 20, zIndex: 50,
          background: '#ef4444', color: 'white', border: 'none', 
          padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'
        }}
      >
        Sign Out
      </button>

      {/* THE 3D SCENE */}
      <Scene walls={walls} />
      
      {/* UPLOAD OVERLAY (This was missing!) */}
      <div style={{ 
        position: 'absolute', top: 20, left: 20, 
        color: 'white', fontFamily: 'sans-serif',
        background: 'rgba(0,0,0,0.85)', padding: '20px', borderRadius: '12px',
        zIndex: 10, border: '1px solid #333', boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        <h1 style={{margin: '0 0 15px 0', fontSize: '1.5rem'}}>3D Floor Plan AI</h1>
        
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleUpload} 
          style={{ marginBottom: '10px', color: '#ccc' }}
        />
        
        {loading && <p style={{color: '#facc15', margin: 0, fontWeight: 'bold'}}>Processing image...</p>}
        
        <p style={{ fontSize: '0.8rem', opacity: 0.7, maxWidth: '250px', marginTop: '10px' }}>
          Upload a clear 2D floor plan to generate the 3D model.
        </p>
      </div>

      {/* CHAT PANEL (Only appears when walls exist) */}
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