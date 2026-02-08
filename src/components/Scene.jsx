import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Html } from '@react-three/drei';
import { Wall } from './Wall';

// Simple Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("3D Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return <Html center><div style={{color:'red'}}>⚠️ 3D Error. Check Console.</div></Html>;
    }
    return this.props.children;
  }
}

export function Scene({ walls, selectedWallIndex, onSelectWall, onWallUpdate }) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Environment preset="city" />
        <OrbitControls makeDefault />
        <Grid infiniteGrid sectionSize={1} sectionColor="#444" cellColor="#222" fadeDistance={30} />

        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, -0.01, 0]} 
          onClick={(e) => { e.stopPropagation(); onSelectWall(null); }}
        >
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial visible={false} />
        </mesh>

        {/* SAFETY WRAPPERS */}
        <ErrorBoundary>
          <Suspense fallback={
            <Html center>
              <div style={{ color: '#fbbf24', background:'rgba(0,0,0,0.8)', padding:'10px', borderRadius:'5px' }}>
                Loading Textures...
              </div>
            </Html>
          }>
            {walls.map((wallData, index) => (
              <Wall 
                key={index}
                id={index}
                {...wallData} 
                isSelected={selectedWallIndex === index}
                onSelect={() => onSelectWall(index)}
                onUpdate={(newProps) => onWallUpdate(index, newProps)} 
              />
            ))}
          </Suspense>
        </ErrorBoundary>

      </Canvas>
    </div>
  );
}