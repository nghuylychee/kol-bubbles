import * as THREE from 'three'
import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Text, Image } from '@react-three/drei'
import { Physics, RigidBody, BallCollider } from '@react-three/rapier'
import { easing } from 'maath'

export default function BubbleChart3D({ data, onBubbleClick, width, height }) {
  console.log('BubbleChart3D data:', data?.length);
  
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        width, 
        height, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        color: 'white',
        background: '#36393f'
      }}>
        No data to render
      </div>
    );
  }

  try {
    return (
      <Canvas 
        orthographic 
        camera={{ position: [0, 0, 100], zoom: 30 }}
        style={{ width, height }}
        onCreated={() => console.log('Canvas created successfully')}
      >
        <ambientLight intensity={0.5} />
        <Physics interpolate timeStep={1 / 60} gravity={[0, 0, 0]}>
          {data.slice(0, 5).map((props, i) => (
            <Sphere key={i} {...props} onBubbleClick={onBubbleClick} />
          ))}
        </Physics>
      </Canvas>
    )
  } catch (error) {
    console.error('Canvas error:', error);
    return (
      <div style={{ 
        width, 
        height, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        color: '#ff6b6b',
        background: '#36393f',
        flexDirection: 'column'
      }}>
        <div>Canvas Error</div>
        <div style={{ fontSize: '12px' }}>{error.message}</div>
      </div>
    );
  }
}

function Sphere({ image, scale = 1, text, color = '#32CD32', name, total_followers, onBubbleClick, vec = new THREE.Vector3(), ...props }) {
  const api = useRef()
  const [initialPos] = useState([THREE.MathUtils.randFloatSpread(10), THREE.MathUtils.randFloatSpread(10), 0])
  const [position] = useState(new THREE.Vector3())
  const [dragging, drag] = useState(false)
  
  console.log('Rendering sphere:', { name, scale, color });
  
  useFrame((state, delta) => {
    if (api.current) {
      api.current.applyImpulse(
        vec
          .copy(api.current.translation())
          .negate()
          .multiplyScalar(scale * scale)
      )
      
      if (dragging) {
        easing.damp3(position, [(state.pointer.x * state.viewport.width) / 2 - dragging.x, (state.pointer.y * state.viewport.height) / 2 - dragging.y, 0], 0.2, delta)
        api.current.setNextKinematicTranslation(position)
      }
    }
  })

  try {
    return (
      <RigidBody 
        ref={api} 
        type={dragging ? 'kinematicPosition' : 'dynamic'} 
        enabledRotations={[false, false, true]} 
        enabledTranslations={[true, true, false]} 
        linearDamping={4} 
        angularDamping={1} 
        friction={0.1} 
        position={initialPos} 
        scale={scale} 
        colliders={false}
      >
        <BallCollider args={[1.1]} />
        <Float speed={2}>
          <mesh 
            onPointerDown={(e) => {
              e.target.setPointerCapture(e.pointerId)
              drag(new THREE.Vector3().copy(e.point).sub(api.current.translation()))
            }} 
            onPointerUp={(e) => {
              e.target.releasePointerCapture(e.pointerId)
              drag(false)
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (!dragging && onBubbleClick) {
                onBubbleClick({ name, total_followers, color, image, ...props })
              }
            }}
          >
            <circleGeometry args={[1, 64]} />
            <meshBasicMaterial color={color} />
            
            {/* Simple text without font dependency */}
            {text && (
              <Text 
                position={[0, 0, 0.01]} 
                fontSize={0.425} 
                color="white"
                anchorX="center"
                anchorY="middle"
              >
                {text}
              </Text>
            )}
          </mesh>
          
          <mesh scale={0.95} position={[0, 0, 0.01]}>
            <ringGeometry args={[0.9, 1, 64]} />
            <meshBasicMaterial color={dragging ? 'orange' : 'black'} />
          </mesh>
          
          {/* Skip images for now to avoid CORS errors */}
          {false && image && (
            <Image 
              position={[0, 0.45, 0.01]} 
              scale={0.5} 
              transparent 
              toneMapped={false} 
              url={image}
              onError={() => console.log('Image load error:', image)}
            />
          )}
          
          {/* Show initials instead of images */}
          {name && (
            <Text 
              position={[0, 0.45, 0.01]} 
              fontSize={0.3} 
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              {name.substring(0, 2).toUpperCase()}
            </Text>
          )}
        </Float>
      </RigidBody>
    )
  } catch (error) {
    console.error('Sphere render error:', error);
    return null;
  }
}
