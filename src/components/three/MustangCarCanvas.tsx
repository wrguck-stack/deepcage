import { Html, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Component, Suspense, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useWebGLSupport } from '../../hooks/useWebGLSupport'
import { MustangModel } from './MustangModel'
import { WebGLFallback } from './WebGLFallback'

type ErrorBoundaryProps = { children: ReactNode; fallback: ReactNode }
type ErrorBoundaryState = { hasError: boolean }

class MustangErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }
  static getDerivedStateFromError(): ErrorBoundaryState { return { hasError: true } }
  render() { return this.state.hasError ? this.props.fallback : this.props.children }
}


const CAMERA_DIRECTION = new THREE.Vector3(-6.8, 2.8, 8).normalize()
const CAMERA_MARGIN = 1.14

function FittedCamera({ sphere }: { sphere: THREE.Sphere | null }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const { size } = useThree()
  useLayoutEffect(() => {
    const camera = cameraRef.current
    if (!camera || !sphere || size.width <= 0 || size.height <= 0) return
    const verticalFov = THREE.MathUtils.degToRad(camera.fov)
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect)
    const limitingFov = Math.min(verticalFov, horizontalFov)
    const distance = sphere.radius * CAMERA_MARGIN / Math.sin(limitingFov / 2)
    camera.position.copy(sphere.center).addScaledVector(CAMERA_DIRECTION, distance)
    camera.near = Math.max(.1, distance - sphere.radius * 3)
    camera.far = distance + sphere.radius * 3
    camera.lookAt(sphere.center)
    camera.updateProjectionMatrix()
  }, [size.width, size.height, sphere])
  return <PerspectiveCamera ref={cameraRef} makeDefault position={[-6.8, 2.8, 8]} fov={30} near={.1} far={100} />
}

function LoadingIndicator() {
  return <Html><div className="mustang-loading" role="status" aria-live="polite">Mustang wird geladen</div></Html>
}

function Scene({ reduced, assembled, sphere, onBoundsReady }: { reduced: boolean; assembled: boolean; sphere: THREE.Sphere | null; onBoundsReady: (sphere: THREE.Sphere) => void }) {
  return <>
    <FittedCamera sphere={sphere} />
    <ambientLight intensity={.8} color="#f4efe4" />
    <directionalLight position={[-4, 7, 5]} intensity={3.4} color="#f4efe4" />
    <directionalLight position={[5, 3, -4]} intensity={1.7} color="#b52f39" />
    <Suspense fallback={<LoadingIndicator />}><MustangModel reduced={reduced} assembled={assembled} onBoundsReady={onBoundsReady} /></Suspense>
  </>
}

export function MustangCarCanvas() {
  const supported = useWebGLSupport()
  const reduced = useReducedMotion()
  const [assembled, setAssembled] = useState(false)
  const [sphere, setSphere] = useState<THREE.Sphere | null>(null)
  if (supported === false) return <WebGLFallback />

  return <MustangErrorBoundary fallback={<WebGLFallback />}><div className="mustang-car" aria-label="Interaktives dreidimensionales Modell eines Ford Mustang von 1969">
    <Canvas dpr={[1, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}><Scene reduced={reduced} assembled={assembled} sphere={sphere} onBoundsReady={setSphere} /></Canvas>
    <button type="button" className="mustang-hover-zone" aria-label="Mustang zusammensetzen" aria-pressed={assembled} onPointerEnter={(event) => { if (event.pointerType !== 'touch') setAssembled(true) }} onPointerLeave={(event) => { if (event.pointerType !== 'touch') setAssembled(false) }} onPointerDown={(event) => { if (event.pointerType === 'touch') setAssembled((current) => !current) }} />
  </div></MustangErrorBoundary>
}
