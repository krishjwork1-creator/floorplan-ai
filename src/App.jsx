import React, { useState, useEffect } from 'react';
import { Scene } from './components/Scene';
import { ChatPanel } from './components/ChatPanel';
import { Auth } from './components/Auth';
import { supabase } from './supabaseClient';

function App() {
  const [session, setSession] = useState(null);
  const [walls, setWalls] = useState([]);
  const [projects, setProjects] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [isAiThinking, setAiThinking] = useState(false);

  // NEW: Track which wall is currently selected
  const [selectedWallIndex, setSelectedWallIndex] = useState(null);

  // 1. CHECK LOGIN & LOAD PROJECTS
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProjects();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProjects();
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. FETCH PROJECTS
  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    setProjects(data || []);
  };

  // 3. HANDLE UPLOAD
  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // DYNAMIC URL: Works on localhost AND Render
      const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:8000' 
        : 'https://floorplan-ai-cgs8.onrender.com'; // <--- Replace if your Render URL is different

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.walls) {
        setWalls(data.walls);
        setSelectedWallIndex(null); // Reset selection on new upload
      } else {
        alert("No walls found.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Backend error. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  // 4. HANDLE AI CHAT
  const handleAiPrompt = async (prompt) => {
    setAiThinking(true);
    try {
      const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:8000' 
        : 'https://floorplan-ai-cgs8.onrender.com';

      const response = await fetch(`${API_URL}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, current_walls: walls }),
      });

      const data = await response.json();
      if (data.walls) {
        setWalls(data.walls);
      }
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setAiThinking(false);
    }
  };

  // 5. UPDATE WALL (For Dragging or Texture Change)
  const updateWall = (index, newAttributes) => {
    const newWalls = [...walls];
    // Merge old wall data with new attributes (e.g., new position or texture)
    newWalls[index] = { ...newWalls[index], ...newAttributes };
    setWalls(newWalls);
  };

  // 6. SAVE PROJECT
  const handleSave = async () => {
    if (walls.length === 0) return alert("Nothing to save!");
    
    const name = prompt("Name your project:", "My Dream House");
    if (!name) return;

    const { error } = await supabase
      .from('projects')
      .insert([{ user_id: session.user.id, name, walls }]);

    if (error) alert(error.message);
    else {
      alert("Saved!");
      fetchProjects();
    }
  };

  // 7. LOAD PROJECT
  const loadProject = (savedWalls) => {
    setWalls(savedWalls);
    setSelectedWallIndex(null);
  };

  // --- RENDER ---
  if (!session) return <Auth />;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111', position: 'relative', display: 'flex' }}>
      
      {/* SIDEBAR: PROJECTS & PROPERTIES */}
      <div style={{ width: '280px', background: '#1a1a1a', padding: '20px', color: 'white', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
        
        {/* PROJECTS SECTION */}
        <h3 style={{ marginTop: 0 }}>My Projects</h3>
        <button onClick={handleSave} style={{ marginBottom: '20px', padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          + Save Current Project
        </button>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '300px' }}>
          {projects.map((p) => (
            <div 
              key={p.id} 
              onClick={() => loadProject(p.walls)} 
              style={{ padding: '10px', background: '#333', borderRadius: '5px', cursor: 'pointer', fontSize: '0.9rem', border: '1px solid #444' }}
            >
              {p.name}
            </div>
          ))}
          {projects.length === 0 && <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>No projects yet.</p>}
        </div>

        {/* PROPERTIES PANEL (Only shows if a wall is selected) */}
        {selectedWallIndex !== null && (
          <div style={{ marginTop: 'auto', borderTop: '1px solid #444', paddingTop: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#fbbf24' }}>Edit Wall #{selectedWallIndex + 1}</h4>
            
            <label style={{ fontSize: '0.75rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px' }}>Material</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
              <button onClick={() => updateWall(selectedWallIndex, { texture: 'brick' })} style={btnStyle}>🧱 Brick</button>
              <button onClick={() => updateWall(selectedWallIndex, { texture: 'wood' })} style={btnStyle}>🪵 Wood</button>
              <button onClick={() => updateWall(selectedWallIndex, { texture: 'concrete' })} style={btnStyle}>🏙️ Concrete</button>
              <button onClick={() => updateWall(selectedWallIndex, { texture: null, color: 'white' })} style={btnStyle}>⬜ Plain</button>
            </div>
            
            <button 
              onClick={() => {
                const newWalls = walls.filter((_, i) => i !== selectedWallIndex);
                setWalls(newWalls);
                setSelectedWallIndex(null);
              }} 
              style={{ ...btnStyle, background: '#ef4444', color: 'white', marginTop: '15px', width: '100%' }}
            >
              🗑️ Delete Wall
            </button>
          </div>
        )}

        {/* LOGOUT */}
        {selectedWallIndex === null && (
          <button onClick={() => supabase.auth.signOut()} style={{ marginTop: 'auto', width: '100%', padding: '10px', background: '#333', color: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Sign Out
          </button>
        )}
      </div>

      {/* MAIN 3D AREA */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Scene 
          walls={walls} 
          selectedWallIndex={selectedWallIndex}       // Pass Selection Down
          onSelectWall={setSelectedWallIndex}         // Pass Selection Handler
          onWallUpdate={updateWall}                   // Pass Update Handler
        />

        {/* UPLOAD OVERLAY (Only show if empty) */}
        {walls.length === 0 && (
          <div style={{ 
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.8)', padding: '40px', borderRadius: '15px', 
            textAlign: 'center', color: 'white', border: '1px solid #444' 
          }}>
            <h1 style={{ margin: '0 0 20px 0' }}>Start Your Design</h1>
            <input type="file" accept="image/*" onChange={handleUpload} style={{ color: '#ccc' }} />
            {loading && <p style={{ color: '#fbbf24', marginTop: '15px' }}>Analyzing floor plan...</p>}
          </div>
        )}
        
        {/* NEW PROJECT BUTTON (Visible when walls exist) */}
        {walls.length > 0 && (
          <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(0,0,0,0.6)', padding: '10px', borderRadius: '8px' }}>
             <input type="file" accept="image/*" onChange={handleUpload} style={{ color: '#ccc', fontSize: '0.8rem' }} />
          </div>
        )}

        {/* CHAT PANEL */}
        {walls.length > 0 && (
          <ChatPanel onSendMessage={handleAiPrompt} isProcessing={isAiThinking} />
        )}
      </div>
    </div>
  );
}

// Simple button style object
const btnStyle = {
  padding: '8px', background: '#444', color: 'white', border: 'none', 
  borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem',
  transition: 'background 0.2s'
};

export default App;