import React, { useState, useEffect } from 'react';
import { Scene } from './components/Scene';
import { ChatPanel } from './components/ChatPanel';
import { Auth } from './components/Auth';
import { supabase } from './supabaseClient';
import { 
  LogOut, Save, Plus, Layers, Box, Upload, 
  Home, Settings, Share2, Download, Grid, 
  Sun, MousePointer, Move, Maximize 
} from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [walls, setWalls] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAiThinking, setAiThinking] = useState(false);
  const [selectedWallIndex, setSelectedWallIndex] = useState(null);

  // --- AUTH & DATA LOADING ---
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
      const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:8000' 
        : 'https://floorplan-ai-cgs8.onrender.com';

      const response = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.walls) {
        setWalls(data.walls);
        setSelectedWallIndex(null);
      } else { alert("No walls found."); }
    } catch (error) { console.error(error); alert("Backend error."); } 
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

  const updateWall = (index, newAttributes) => {
    const newWalls = [...walls];
    newWalls[index] = { ...newWalls[index], ...newAttributes };
    setWalls(newWalls);
  };

  const handleSave = async () => {
    if (walls.length === 0) return alert("Nothing to save!");
    const name = prompt("Project Name:", "Structura Build 01");
    if (!name) return;
    const { error } = await supabase.from('projects').insert([{ user_id: session.user.id, name, walls }]);
    if (error) alert(error.message);
    else { fetchProjects(); }
  };

  // If not logged in, show the Landing Page
  if (!session) return <Auth />;

  return (
    <div className="w-screen h-screen bg-[#030014] text-white flex overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* --- LEFT SIDEBAR (Professional SaaS Layout) --- */}
      <aside className="w-72 bg-[#050505]/80 backdrop-blur-xl border-r border-white/10 flex flex-col z-20">
        
        {/* 1. BRAND HEADER */}
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center overflow-hidden shadow-lg shadow-indigo-500/20">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover opacity-90" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-white">Structura.AI</span>
        </div>

        {/* 2. MAIN NAVIGATION (Visual Fillers) */}
        <div className="px-4 py-6 space-y-1">
          <NavItem icon={<Home size={16} />} label="Dashboard" active />
          <NavItem icon={<Download size={16} />} label="Export Model" />
          <NavItem icon={<Share2 size={16} />} label="Collaboration" />
          <NavItem icon={<Settings size={16} />} label="Settings" />
        </div>

        {/* 3. WORKSPACE (Actual Functionality) */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Your Projects</div>
          
          <button 
            onClick={handleSave} 
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-all text-sm font-medium shadow-lg shadow-indigo-500/20 group mb-4 border border-indigo-400/20"
          >
            <Save size={16} /> Save Current
          </button>

          <div className="space-y-1">
            {projects.map((p) => (
              <div 
                key={p.id} 
                onClick={() => { setWalls(p.walls); setSelectedWallIndex(null); }} 
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 cursor-pointer transition-colors text-sm text-slate-400 hover:text-white border border-transparent hover:border-white/5 group"
              >
                <Layers size={14} className="opacity-50 group-hover:text-indigo-400 transition-colors" />
                {p.name}
              </div>
            ))}
            {projects.length === 0 && <p className="text-xs text-slate-600 px-3 italic">No saved builds.</p>}
          </div>
        </div>

        {/* 4. WALL PROPERTIES (Context Aware) */}
        {selectedWallIndex !== null && (
          <div className="p-4 border-t border-white/10 bg-indigo-900/10 backdrop-blur-md">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Wall Properties</span>
              <button onClick={() => setSelectedWallIndex(null)} className="text-xs text-slate-400 hover:text-white">Close</button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
               {['brick', 'wood', 'concrete'].map(mat => (
                 <button key={mat} onClick={() => updateWall(selectedWallIndex, { texture: mat })} className="text-xs p-2 rounded bg-black/40 hover:bg-white/10 capitalize border border-white/5 hover:border-indigo-500/50 transition-all text-slate-300">
                   {mat}
                 </button>
               ))}
               <button onClick={() => updateWall(selectedWallIndex, { texture: null, color: 'white' })} className="text-xs p-2 rounded bg-black/40 border border-white/5 text-slate-300">Clean</button>
            </div>
            
            <button 
              onClick={() => {
                const newWalls = walls.filter((_, i) => i !== selectedWallIndex);
                setWalls(newWalls);
                setSelectedWallIndex(null);
              }} 
              className="w-full py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded text-xs border border-red-500/20"
            >
              Remove Wall
            </button>
          </div>
        )}

        {/* 5. USER PROFILE */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">
              {session.user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-white">{session.user.email}</p>
              <p className="text-[10px] text-slate-500">Pro Plan</p>
            </div>
            <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-white transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* --- MAIN 3D AREA --- */}
      <main className="flex-1 relative bg-[#020202]">
        
        {/* Background Grid Pattern (Subtle) */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />

        <Scene 
          walls={walls} 
          selectedWallIndex={selectedWallIndex}       
          onSelectWall={setSelectedWallIndex}         
          onWallUpdate={updateWall}                   
        />

        {/* FLOATING TOOLBAR (Top Center) */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex gap-2 p-1.5 rounded-xl bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 shadow-2xl">
           <ToolbarIcon icon={<MousePointer size={18} />} active />
           <ToolbarIcon icon={<Move size={18} />} />
           <ToolbarIcon icon={<Grid size={18} />} />
           <div className="w-px h-6 bg-white/10 mx-1 self-center" />
           <ToolbarIcon icon={<Sun size={18} />} />
           <ToolbarIcon icon={<Maximize size={18} />} />
        </div>

        {/* EMPTY STATE (Upload Overlay) */}
        {walls.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-10">
            <div className="relative p-1 rounded-2xl bg-gradient-to-b from-white/10 to-white/5">
              <div className="bg-[#0a0a0a] p-10 rounded-xl flex flex-col items-center text-center max-w-md border border-white/10 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 border border-indigo-500/20">
                   <Upload className="text-indigo-400" size={32} />
                </div>
                <h2 className="text-2xl font-display font-bold mb-3 text-white">Initialize Workspace</h2>
                <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                  Upload a 2D floor plan to trigger the neural engine.<br/> Supports JPG, PNG, and PDF.
                </p>
                
                <label className="cursor-pointer group relative overflow-hidden rounded-lg bg-white text-black font-bold px-8 py-3 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  <span className="relative z-10 flex items-center gap-2"><Plus size={16}/> Upload Blueprint</span>
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-200 to-purple-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                </label>
                
                {loading && <p className="mt-6 text-indigo-400 text-xs tracking-widest uppercase animate-pulse">Processing Geometry...</p>}
              </div>
            </div>
          </div>
        )}

        {/* NEW UPLOAD BUTTON (Floating Top Left) */}
        {walls.length > 0 && (
          <div className="absolute top-6 left-6 z-10">
             <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0a0a0a]/80 backdrop-blur-md border border-white/10 hover:border-indigo-500/50 hover:text-indigo-400 cursor-pointer transition-all text-xs font-bold uppercase tracking-wide shadow-xl">
               <Plus size={14} /> New Scan
               <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
             </label>
          </div>
        )}

        {/* CHAT PANEL (Bottom Center) */}
        {walls.length > 0 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-full max-w-2xl px-4">
             <ChatPanel onSendMessage={handleAiPrompt} isProcessing={isAiThinking} />
          </div>
        )}
      </main>
    </div>
  );
}

// Helper Components for Cleaner Code
function NavItem({ icon, label, active }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all text-sm group ${active ? 'bg-white/5 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
      <span className={`${active ? 'text-indigo-400' : 'opacity-70 group-hover:text-indigo-400'}`}>{icon}</span>
      {label}
    </div>
  );
}

function ToolbarIcon({ icon, active }) {
  return (
    <button className={`p-2 rounded-lg transition-colors ${active ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
      {icon}
    </button>
  );
}

export default App;