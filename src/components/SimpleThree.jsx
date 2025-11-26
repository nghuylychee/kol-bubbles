import { Canvas } from '@react-three/fiber'
import { useState } from 'react'

function TestSphere() {
  const [hovered, setHovered] = useState(false)
  
  return (
    <mesh
      position={[0, 0, 0]}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  )
}

export default function SimpleThree({ width, height }) {
  console.log('SimpleThree rendering:', { width, height });
  
  return (
    <div style={{ width, height, background: '#36393f' }}>
      <Canvas
        camera={{ position: [0, 0, 5] }}
        style={{ width: '100%', height: '100%' }}
        onCreated={({ gl, scene, camera }) => {
          console.log('Canvas created successfully:', { gl, scene, camera });
        }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <TestSphere />
      </Canvas>
    </div>
  )
}
