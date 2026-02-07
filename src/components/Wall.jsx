import React, { useState } from 'react';

// Added 'color' to props
export function Wall({ position, size, rotation, color }) {
  const [hovered, setHover] = useState(false);
  const [clicked, setClick] = useState(false);

  // If the AI didn't specify a color, default to gray
  const baseColor = color || 'gray';

  return (
    <mesh
      position={position}
      rotation={rotation || [0, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        setClick(!clicked);
      }}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial 
        // Logic: If clicked -> Orange. If hovered -> HotPink. Else -> AI Color.
        color={clicked ? 'orange' : hovered ? 'hotpink' : baseColor} 
      />
    </mesh>
  );
}