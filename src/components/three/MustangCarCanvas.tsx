import { Html, PerspectiveCamera } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Component, Suspense, type ReactNode } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useWebGLSupport } from '../../hooks/useWebGLSupport'
import { CarBlueprintEnvironment } from './CarBlueprintEnvironment'
import { MustangModel } from './MustangModel'
import { WebGLFallback } from './WebGLFallback'

type ErrorBoundaryProps = { children: ReactNode; fallback: ReactNode }
type ErrorBoundaryState = { hasError: boolean }

class MustangErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }
  static getDerivedStateFromError(): ErrorBoundaryState { return { hasError: true } }
  render() { return this.state.hasError ? this.props.fallback : this.props.children }
}

function LoadingIndicator() {
  return <Html center><div className="mustang-loading" role="status"><i /> LOADING MUSTANG</div></Html>
}

function Scene({ reduced }: { reduced: boolean }) {
  return <>
    <PerspectiveCamera makeDefault position={[-6.8, 2.8, 8]} fov={30} near={.1} far={100} onUpdate={(camera: THREE.PerspectiveCamera) => camera.lookAt(0, 0, 0)} />
    <ambientLight intensity={.8} color="#b9d9e3" />
    <directionalLight position={[-4, 7, 5]} intensity={3.4} color="#e0f4ff" />
    <directionalLight position={[5, 3, -4]} intensity={1.7} color="#70b9d0" />
    <CarBlueprintEnvironment reduced={reduced} />
    <Suspense fallback={<LoadingIndicator />}><MustangModel reduced={reduced} /></Suspense>
  </>
}

export function MustangCarCanvas() {
  const supported = useWebGLSupport()
  const reduced = useReducedMotion()
  if (supported === false) return <WebGLFallback />

  return <MustangErrorBoundary fallback={<WebGLFallback />}><div className="mustang-car" aria-label="Interaktives dreidimensionales Modell eines Ford Mustang von 1969">
    <Canvas dpr={[1, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}><Scene reduced={reduced} /></Canvas>
    <p className="car-instruction">HOVER TO ASSEMBLE <b>·</b> 1969 MUSTANG</p>
  </div></MustangErrorBoundary>
}
