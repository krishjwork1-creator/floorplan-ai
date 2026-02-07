import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Wall } from './Wall';

// Now accepting 'walls' as a prop
export function Scene({ walls }) {
  return (
    <Canvas camera={{ position: [5, 8, 8], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <OrbitControls makeDefault />
      <Grid infiniteGrid fadeDistance={30} sectionColor="black" cellColor="gray" />

      {/* This is the magic part. 
        We "map" (loop) over the list of walls data 
        and create a <Wall /> for each one.
      */}
      {walls.map((wallData, index) => (
        <Wall 
          key={index} 
          position={wallData.position} 
          size={wallData.size}
          rotation={wallData.rotation}
          color={wallData.color} // <--- Pass the color from AI to the Wall
        />
      ))}

    </Canvas>
  );
}