import React, { useState, useRef } from 'react';
import { TransformControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';

const TEXTURES = {
  brick: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/brick_diffuse.jpg',
  wood: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/hardwood2_diffuse.jpg',
  concrete: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/uv_grid_opengl.jpg' 
};

export function Wall({ position, size, rotation, color, texture, isSelected, onSelect, onUpdate }) {
  const [hovered, setHover] = useState(false);
  const meshRef = useRef();
  
  const maps = useTexture(TEXTURES);
  const safeSize = size || [1, 2, 0.2]; 

  // --- MATERIAL LOGIC ---

  // 1. BASE STATE: Start with explicit defaults (Solid & Opaque)
  // We MUST set transparent: false here, or it will "stick" to invisible.
  let materialProps = { 
    color: color || '#a0a0a0',
    transparent: false, 
    opacity: 1 
  };

  // 2. TEXTURE STATE
  if (texture && maps[texture]) {
    materialProps = { 
      ...materialProps,
      map: maps[texture], 
      color: 'white' // White allows texture colors to show through
    };
    
    maps[texture].wrapS = maps[texture].wrapT = THREE.RepeatWrapping;
    if (safeSize[0] && safeSize[1]) {
        maps[texture].repeat.set(safeSize[0] / 2, safeSize[1] / 2);
    }
  }

  // 3. INTERACTION STATE (Overrides Base State)
  if (isSelected) {
    materialProps = { ...materialProps, color: '#ff9900', opacity: 0.8, transparent: true };
  } else if (hovered) {
    materialProps = { ...materialProps, color: '#ff66b2', opacity: 0.9, transparent: true };
  }

  return (
    <TransformControls 
      object={meshRef}
      mode="translate"
      enabled={isSelected} 
      showX={isSelected} showY={isSelected} showZ={isSelected}
      position={position}
      rotation={rotation || [0, 0, 0]}
      onMouseUp={() => {
        if (meshRef.current) {
          onUpdate({ 
            position: [
              meshRef.current.position.x, 
              meshRef.current.position.y, 
              meshRef.current.position.z
            ] 
          });
        }
      }}
    >
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <boxGeometry args={safeSize} />
        
        {/* key ensures we rebuild material when texture changes */}
        <meshStandardMaterial 
          key={texture || 'plain'} 
          {...materialProps} 
        />
        
      </mesh>
    </TransformControls>
  );
}