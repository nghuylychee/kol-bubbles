import * as THREE from 'three'
import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { Physics, RigidBody, BallCollider, CuboidCollider } from '@react-three/rapier'
import { easing } from 'maath'

// Invisible boundary walls to contain bubbles
function BoundaryWalls({ viewportWidth, viewportHeight }) {
  const wallThickness = 1;
  
  return (
    <>
      {/* Left wall */}
      <RigidBody type="fixed" position={[-viewportWidth/2 - wallThickness/2, 0, 0]}>
        <CuboidCollider args={[wallThickness/2, viewportHeight/2, 1]} />
      </RigidBody>
      
      {/* Right wall */}
      <RigidBody type="fixed" position={[viewportWidth/2 + wallThickness/2, 0, 0]}>
        <CuboidCollider args={[wallThickness/2, viewportHeight/2, 1]} />
      </RigidBody>
      
      {/* Top wall */}
      <RigidBody type="fixed" position={[0, viewportHeight/2 + wallThickness/2, 0]}>
        <CuboidCollider args={[viewportWidth/2, wallThickness/2, 1]} />
      </RigidBody>
      
      {/* Bottom wall */}
      <RigidBody type="fixed" position={[0, -viewportHeight/2 - wallThickness/2, 0]}>
        <CuboidCollider args={[viewportWidth/2, wallThickness/2, 1]} />
      </RigidBody>
    </>
  );
}

export default function BubbleChart3DSimple({ data, width, height }) {
  // Calculate viewport bounds for physics constraints
  const viewportWidth = width ? (width / 30) : 20; // Convert pixels to Three.js units based on zoom=30
  const viewportHeight = height ? (height / 30) : 15;
  
  return (
    <Canvas orthographic camera={{ position: [0, 0, 100], zoom: 30 }}>
      <Physics interpolate timeStep={1 / 60} gravity={[0, 0, 0]}>
        {/* Invisible boundary walls */}
        <BoundaryWalls viewportWidth={viewportWidth} viewportHeight={viewportHeight} />
        
        {data.map((props, i) => (
          <Sphere key={i} {...props} viewportWidth={viewportWidth} viewportHeight={viewportHeight} />
        ))}
      </Physics>
    </Canvas>
  )
}

function Sphere({ scale = 1, text, color = '#32CD32', name, viewportWidth = 20, viewportHeight = 15, vec = new THREE.Vector3(), ...props }) {
  const api = useRef()
  const [initialPos] = useState([THREE.MathUtils.randFloatSpread(8), THREE.MathUtils.randFloatSpread(6), 0])
  const [position] = useState(new THREE.Vector3())
  const [dragging, drag] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartTime, setDragStartTime] = useState(0)
  const [hasMoved, setHasMoved] = useState(false)
  const [startPointerPos, setStartPointerPos] = useState(null)
  
  useFrame((state, delta) => {
    if (api.current) {
      // Apply very gentle centering force only when not being interacted with
      if (!isDragging && !hasMoved) {
        api.current.applyImpulse(
          vec
            .copy(api.current.translation())
            .negate()
            .multiplyScalar(scale * scale * 0.01) // Much smaller force
        )
      }
      
      // Handle dragging (walls will handle boundaries automatically)
      // Only apply dragging when we're actually dragging AND have moved
      if (isDragging && hasMoved) {
        // Get current bubble position
        const currentPos = api.current.translation()
        
        // Calculate target position based on mouse position
        const targetX = (state.pointer.x * state.viewport.width) / 2
        const targetY = (state.pointer.y * state.viewport.height) / 2
        
        // Smoothly interpolate from current position to target
        const lerpFactor = 0.1 // Slow, smooth movement
        const newX = currentPos.x + (targetX - currentPos.x) * lerpFactor
        const newY = currentPos.y + (targetY - currentPos.y) * lerpFactor
        
        position.set(newX, newY, 0)
        api.current.setNextKinematicTranslation(position)
      }
    }
  })

  return (
    <RigidBody ref={api} type={dragging ? 'kinematicPosition' : 'dynamic'} enabledRotations={[false, false, true]} enabledTranslations={[true, true, false]} linearDamping={4} angularDamping={1} friction={0.1} position={initialPos} scale={scale} colliders={false}>
      <BallCollider args={[1.1]} />
      <mesh 
        onPointerDown={(e) => {
          e.stopPropagation()
          e.target.setPointerCapture(e.pointerId)
          setDragStartTime(Date.now())
          setHasMoved(false)
          setStartPointerPos({ x: e.clientX, y: e.clientY })
          
          // DON'T calculate drag offset yet - wait for actual movement
        }} 
        onPointerMove={(e) => {
          if (!hasMoved && startPointerPos) {
            // Check if mouse moved enough to be considered a drag (threshold: 5 pixels)
            const deltaX = Math.abs(e.clientX - startPointerPos.x)
            const deltaY = Math.abs(e.clientY - startPointerPos.y)
            const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
            
            if (moveDistance > 5) { // Only start dragging if moved more than 5 pixels
              setHasMoved(true)
              setIsDragging(true)
              
              // Set drag offset to zero - bubble will follow mouse smoothly from its current position
              drag(new THREE.Vector3(0, 0, 0))
            }
          }
        }}
        onPointerUp={(e) => {
          e.stopPropagation()
          e.target.releasePointerCapture(e.pointerId)
          
          const clickDuration = Date.now() - dragStartTime
          
          // If it was a quick click without movement, treat as click
          if (clickDuration < 300 && !hasMoved) {
            console.log('Pure click on:', name)
            // Add click handler here if needed - bubble won't move at all
          }
          
          setIsDragging(false)
          setHasMoved(false)
          setStartPointerPos(null)
          drag(false)
        }}
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color={color} />
        {text && (
          <Text position={[0, 0, 0.01]} fontSize={0.425} color="white" anchorX="center" anchorY="middle">
            {text}
          </Text>
        )}
      </mesh>
      <mesh scale={0.95} position={[0, 0, 0.01]}>
        <ringGeometry args={[0.9, 1, 64]} />
        <meshBasicMaterial color={dragging ? 'orange' : 'black'} />
      </mesh>
    </RigidBody>
  )
}
