import React, { useRef } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { Stars } from '@react-three/drei';

// A high-quality "Earth at Night" texture
const EARTH_NIGHT_TEXTURE = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_lights_2048.png';

function RotatingSphere() {
  const meshRef = useRef();
  const texture = useLoader(TextureLoader, EARTH_NIGHT_TEXTURE);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0005; // Very slow, subtle rotation
    }
  });

  return (
    <mesh ref={meshRef} scale={[3, 3, 3]} position={[0, -0.5, 0]} rotation={[0.2, 0, 0]}>
      <sphereGeometry args={[1, 128, 128]} />
      <meshStandardMaterial
        map={texture}
        color="#4c4cff"       // Tint the earth blue/purple
        emissive="#1a1a40"    // Give it a subtle inner glow
        emissiveIntensity={0.5}
        roughness={0.6}
        metalness={0.2}
      />
    </mesh>
  );
}

export function Globe() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-50 mix-blend-screen">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.05} />
        {/* A blue-ish light from the top-left */}
        <pointLight position={[-5, 5, 5]} intensity={1.5} color="#6366f1" />
        {/* A purple-ish rim light from the bottom-right */}
        <pointLight position={[5, -5, 5]} intensity={1} color="#a855f7" />
        
        <RotatingSphere />
        
        {/* Add distant stars for depth */}
        <Stars radius={150} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />
      </Canvas>
    </div>
  );
}