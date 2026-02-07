import React, { useState } from 'react';

// Added 'rotation' to the props
export function Wall({ position, size, rotation }) {
  const [hovered, setHover] = useState(false);
  const [clicked, setClick] = useState(false);

  return (
    <mesh
      position={position}
      rotation={rotation || [0, 0, 0]} // Default to 0 if no rotation
      onClick={(e) => {
        e.stopPropagation();
        setClick(!clicked);
      }}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial color={clicked ? 'orange' : hovered ? 'hotpink' : 'gray'} />
    </mesh>
  );
}