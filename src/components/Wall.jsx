import React, { useState } from 'react';
import { TransformControls } from '@react-three/drei';

export function Wall({ position, size, rotation, color, isSelected, onSelect }) {
  const [hovered, setHover] = useState(false);

  // Colors
  const baseColor = color || '#a0a0a0'; 
  const displayColor = isSelected ? '#ff9900' : (hovered ? '#ff66b2' : baseColor);

  return (
    <TransformControls 
      // 1. Only enable the tool if this wall is selected
      enabled={isSelected} 
      
      // 2. Only SHOW the arrows if selected
      showX={isSelected} 
      showY={isSelected} 
      showZ={isSelected}
      
      // 3. Set the starting position/rotation
      position={position}
      rotation={rotation || [0, 0, 0]}
      
      // 4. IMPORTANT: When dragging finishes, we will eventually save state here
      mode="translate" 
    >
      {/* THE WALL MESH IS NOW INSIDE THE CONTROLS */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial color={displayColor} />
      </mesh>
    </TransformControls>
  );
}