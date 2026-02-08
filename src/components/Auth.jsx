import React, { useState, useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, Shield, CheckCircle } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { supabase } from '../supabaseClient';

// --- RELIABLE CDN ASSETS ---
const EARTH_TEXTURE_URL = 'https://unpkg.com/three-globe/example/img/earth-night.jpg';
const EARTH_BUMP_URL = 'https://unpkg.com/three-globe/example/img/earth-topology.png';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(10px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: "easeOut" } },
};

// --- COMPONENT: REAL EARTH ---
function RealEarth() {
  const meshRef = useRef();
  const [colorMap, bumpMap] = useTexture([EARTH_TEXTURE_URL, EARTH_BUMP_URL]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0005; 
      meshRef.current.position.y = -5.5 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} scale={[8, 8, 8]} position={[0, -5.5, 0]} rotation={[0.4, 0, 0]}>
        <sphereGeometry args={[1, 128, 128]} />
        <meshStandardMaterial
          map={colorMap}
          bumpMap={bumpMap}
          bumpScale={0.05}
          color="#ffffff"       
          emissive="#4f46e5"    
          emissiveMap={colorMap}
          emissiveIntensity={2.5}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>
      <mesh scale={[8.2, 8.2, 8.2]} position={[0, -5.5, 0]}>
         <sphereGeometry args={[1, 64, 64]} />
         <meshBasicMaterial color="#6366f1" transparent opacity={0.1} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function EarthPlaceholder() {
  return (
    <mesh scale={[8, 8, 8]} position={[0, -5.5, 0]} rotation={[0.4, 0, 0]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial color="#050510" wireframe opacity={0.1} transparent />
    </mesh>
  );
}

// --- MAIN AUTH COMPONENT ---
export function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    if (error) alert(error.message); else setSent(true); setLoading(false);
  };

  return (
    // UPDATED: pt-16 pulls content higher up
    <div className="relative w-full min-h-screen bg-[#030014] flex flex-col items-center justify-start pt-16 overflow-hidden font-sans text-white selection:bg-indigo-500/30">
      
      {/* BACKGROUNDS */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#030014] to-[#030014] z-0 pointer-events-none" />
      
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 12], fov: 35 }} gl={{ antialias: true, alpha: true }}>
          <ambientLight intensity={0.1} />
          <spotLight position={[0, 15, 0]} angle={0.5} penumbra={1} intensity={5} color="#a855f7" />
          <pointLight position={[-10, 5, 10]} intensity={2} color="#6366f1" />
          <Suspense fallback={<EarthPlaceholder />}>
            <RealEarth />
          </Suspense>
        </Canvas>
      </div>

      <div className="absolute top-[-50%] left-1/2 -translate-x-1/2 w-[100%] h-[200%] bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12)_0%,transparent_50%)] blur-[100px] pointer-events-none z-10" />

      {/* NAV */}
      <motion.nav 
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
        className="absolute top-0 w-full p-6 flex justify-between items-center z-50 max-w-7xl"
      >
        <div className="flex items-center gap-3">
          {/* LOGO IMAGE */}
          <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <img 
              src="/logo.jpg" 
              alt="Logo" 
              className="w-full h-full object-cover opacity-90"
            />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white">Structura.AI</span>
        </div>
        <div className="hidden md:flex gap-8 text-xs font-semibold tracking-widest text-slate-400 uppercase">
          {['Product', 'Showcase', 'Pricing', 'Login'].map((item) => (
             <span key={item} className="hover:text-white cursor-pointer transition-colors duration-300">{item}</span>
          ))}
        </div>
      </motion.nav>

      {/* MAIN CONTENT */}
      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="z-50 w-full max-w-4xl px-6 flex flex-col items-center text-center relative"
      >
        <motion.div variants={itemVariants} className="mb-6">
          <div className="px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[10px] font-bold tracking-[0.2em] uppercase backdrop-blur-xl flex items-center gap-2 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
            <Sparkles size={12} className="text-indigo-400" /> 
            <span>Neural Engine v2.0</span>
          </div>
        </motion.div>

        {/* Tighter spacing for the title */}
        <motion.h1 variants={itemVariants} className="font-display text-5xl md:text-8xl font-bold leading-[0.9] tracking-tighter mb-8 drop-shadow-2xl">
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-slate-500">
            Design at the
          </span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-400 pb-2 relative">
             Speed of Thought.
          </span>
        </motion.h1>

        <motion.p variants={itemVariants} className="text-lg text-slate-400 mb-10 max-w-lg leading-relaxed font-medium antialiased">
          Turn 2D sketches into immersive 3D realities instantly. <br className="hidden md:block"/>
          <span className="text-slate-200">No CAD skills required.</span> Just upload and experience.
        </motion.p>

        <motion.div variants={itemVariants} className="w-full max-w-md relative group">
          <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-xl blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
          
          <div className="relative rounded-xl p-1.5 flex items-center bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 shadow-2xl transition-all focus-within:border-indigo-500/50">
            {sent ? (
              <div className="w-full py-3 text-emerald-400 font-medium flex items-center justify-center gap-2">
                <CheckCircle size={18} className="animate-bounce" /> Magic link sent!
              </div>
            ) : (
              <form onSubmit={handleLogin} className="flex w-full gap-2">
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent text-white px-4 py-3 outline-none placeholder-slate-600 font-medium tracking-wide text-sm"
                  required
                />
                <button 
                  disabled={loading}
                  className="bg-white text-black hover:bg-slate-200 px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 group/btn"
                >
                  {loading ? '...' : 'Start'} 
                  <ArrowRight size={16} className="group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </form>
            )}
          </div>
          
          <div className="mt-8 flex justify-center gap-8 text-[10px] text-slate-500 font-bold tracking-widest uppercase">
            <span className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors duration-300">
              <Zap size={12} /> Instant Render
            </span>
            <span className="flex items-center gap-1.5 hover:text-purple-400 transition-colors duration-300">
              <Shield size={12} /> Enterprise Secure
            </span>
          </div>
        </motion.div>
      </motion.main>
    </div>
  );
}