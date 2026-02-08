import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Wall } from './Wall';

export function Scene({ walls }) {
  const [selectedIndex, setSelectedIndex] = useState(null);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
        {/* LIGHTING & ENVIRONMENT */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Environment preset="city" />

        {/* CONTROLS */}
        {/* makeDefault ensures OrbitControls pauses when you drag a wall */}
        <OrbitControls makeDefault /> 

        {/* HELPER GRID */}
        <Grid 
          infiniteGrid 
          sectionSize={1} 
          sectionColor="#444" 
          cellColor="#222" 
          fadeDistance={30} 
        />

        {/* CLICK BACKGROUND TO DESELECT */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, -0.01, 0]} 
          onClick={() => setSelectedIndex(null)}
        >
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial visible={false} /> {/* Invisible click catcher */}
        </mesh>

        {/* RENDER WALLS */}
        {walls.map((wallData, index) => (
          <Wall 
            key={index} 
            position={wallData.position} 
            size={wallData.size} 
            rotation={wallData.rotation}
            color={wallData.color}
            // SELECTION LOGIC
            isSelected={selectedIndex === index}
            onSelect={() => setSelectedIndex(index)}
          />
        ))}

      </Canvas>
    </div>
  );
}