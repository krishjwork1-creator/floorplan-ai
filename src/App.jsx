import React, { useState, useEffect } from 'react';
import { Scene } from './components/Scene';
import { ChatPanel } from './components/ChatPanel';
import { Auth } from './components/Auth';
import { supabase } from './supabaseClient';
import { 
  LogOut, Save, Plus, Layers, Upload, Home, Settings, Share2, Download 
} from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [walls, setWalls] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAiThinking, setAiThinking] = useState(false);
  const [selectedWallIndex, setSelectedWallIndex] = useState(null);

  // --- AUTH & DATA ---
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

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    setProjects(data || []);
  };

  // --- HANDLERS ---
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
        : 'https://floorplan-ai-cgs8.onrender.com';

      const response = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.walls && data.walls.length > 0) {
        setWalls(data.walls);
        setSelectedWallIndex(null);
      } else { 
        alert("AI could not find walls. Try a clearer image."); 
      }
    } catch (error) { console.error(error); alert("Backend connection failed."); } 
    finally { setLoading(false); }
  };

  const handleAiPrompt = async (prompt) => {
    setAiThinking(true);
    try {
      const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://floorplan-ai-cgs8.onrender.com';
      const response = await fetch(`${API_URL}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, current_walls: walls }),
      });
      const data = await response.json();
      if (data.walls) setWalls(data.walls);
    } catch (error) { console.error(error); } 
    finally { setAiThinking(false); }
  };

  const handleSave = async () => {
    if (walls.length === 0) return alert("Nothing to save!");
    const name = prompt("Project Name:", "My Dream Home");
    if (!name) return;
    const { error } = await supabase.from('projects').insert([{ user_id: session.user.id, name, walls }]);
    if (error) alert(error.message);
    else { fetchProjects(); alert("Saved!"); }
  };

  if (!session) return <Auth />;

  return (
    <div className="w-screen h-screen bg-[#030014] text-white flex overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-[#050505]/80 backdrop-blur-xl border-r border-white/10 flex flex-col z-20">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <span className="font-bold text-lg text-white">Structura.AI</span>
        </div>

        <div className="px-4 py-6 space-y-1">
          <NavItem icon={<Home size={16} />} label="Dashboard" active />
          <NavItem icon={<Download size={16} />} label="Export Model" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Projects</div>
          <button onClick={handleSave} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium mb-4">
            <Save size={16} /> Save Current
          </button>
          {projects.map((p) => (
            <div key={p.id} onClick={() => setWalls(p.walls)} className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 cursor-pointer text-sm text-slate-400">
              <Layers size={14} /> {p.name}
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-white/10">
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 text-slate-400 hover:text-white text-xs">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="flex-1 relative bg-[#020202]">
        <Scene walls={walls} selectedWallIndex={selectedWallIndex} onSelectWall={setSelectedWallIndex} />

        {/* UPLOAD OVERLAY */}
        {walls.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
             <div className="bg-[#0a0a0a] p-10 rounded-xl border border-white/10 flex flex-col items-center">
                <Upload className="text-indigo-400 mb-4" size={32} />
                <h2 className="text-2xl font-bold mb-2">Upload Floorplan</h2>
                <label className="cursor-pointer bg-white text-black font-bold px-8 py-3 rounded-lg mt-4 hover:bg-slate-200 transition">
                  Upload Image <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                </label>
                {loading && <p className="mt-4 text-indigo-400 text-xs animate-pulse">Analyzing Blueprint...</p>}
             </div>
          </div>
        )}

        {/* CHAT PANEL */}
        {walls.length > 0 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-full max-w-2xl px-4">
             <ChatPanel onSendMessage={handleAiPrompt} isProcessing={isAiThinking} />
          </div>
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm ${active ? 'bg-white/5 text-white' : 'text-slate-400'}`}>
      {icon} {label}
    </div>
  );
}

export default App;