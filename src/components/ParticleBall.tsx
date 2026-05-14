import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function ParticleBall({ count = 50000 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate random positions on a sphere
  const [positions, initialPositions, colors] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const initialPositions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    const color = new THREE.Color();
    
    for (let i = 0; i < count; i++) {
      // Math.random() generates uniformly mapped distributions
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const r = 2.5 + (Math.random() * 0.2 - 0.1); 
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      initialPositions[i * 3] = x;
      initialPositions[i * 3 + 1] = y;
      initialPositions[i * 3 + 2] = z;

      // Make colors techy - gold, cyan, white
      const rand = Math.random();
      if (rand < 0.5) {
        color.set('#d4af37'); // brand-gold
      } else if (rand < 0.8) {
        color.set('#00ffff'); // cyan
      } else {
        color.set('#ffffff'); // white
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    return [positions, initialPositions, colors];
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    // Rotate the whole system slowly
    pointsRef.current.rotation.y = time * 0.1;
    pointsRef.current.rotation.z = time * 0.05;

    // Add breathing / noise effect
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      // Simple sine wave breathing based on initial positions
      const origX = initialPositions[ix];
      const origY = initialPositions[iy];
      const origZ = initialPositions[iz];

      const scale = 1 + Math.sin(time * 2 + origX + origY) * 0.05;

      positions[ix] = origX * scale;
      positions[iy] = origY * scale;
      positions[iz] = origZ * scale;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
