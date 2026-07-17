import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useWebGLSupport } from '../../hooks/useWebGLSupport'
import { CarAnnotations } from './CarAnnotations'
import { CarBlueprintEnvironment } from './CarBlueprintEnvironment'
import { ProceduralClassicCar } from './ProceduralClassicCar'
import { WebGLFallback } from './WebGLFallback'

type ErrorBoundaryProps = { children: ReactNode; fallback: ReactNode }
type ErrorBoundaryState = { hasError: boolean }

class ThreeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

function Scene({ explode, restoration, reduced }: { explode: number; restoration: number; reduced: boolean }) {
  return <><PerspectiveCamera makeDefault position={[-10, 4.5, 11]} fov={38} near={.1} far={100} onUpdate={(camera: THREE.PerspectiveCamera) => camera.lookAt(0, 0, 0)} /><ambientLight intensity={.72} color="#a6c9d4" /><directionalLight position={[-4, 6, 5]} intensity={3.2} color="#d9efff" /><directionalLight position={[5, 2, -4]} intensity={1.5} color="#7eb6d3" /><Suspense fallback={null}><CarBlueprintEnvironment reduced={reduced} /><ProceduralClassicCar explode={explode} restoration={restoration} reduced={reduced} /><CarAnnotations explode={explode} /></Suspense></>
}

export function ProceduralCarCanvas() {
  const root = useRef<HTMLDivElement>(null); const supported = useWebGLSupport(); const reduced = useReducedMotion(); const [progress, setProgress] = useState(0)
  useEffect(() => { const update = () => { if (!root.current || reduced) return; const rect = root.current.getBoundingClientRect(); setProgress(Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)))) }; update(); window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update); return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update) } }, [reduced])
  useEffect(() => {
    if (!import.meta.env.DEV || !root.current) return
    const container = root.current
    const reportInvalidSize = () => {
      const { width, height } = container.getBoundingClientRect()
      const canvas = container.querySelector('canvas')
      const hasWebGLContext = Boolean(canvas?.getContext('webgl2') || canvas?.getContext('webgl'))
      if (width <= 0 || height <= 0 || !canvas || !hasWebGLContext) console.warn('Procedural car canvas is not ready.', { width, height, canvas: Boolean(canvas), hasWebGLContext })
    }
    const observer = new ResizeObserver(reportInvalidSize)
    observer.observe(container)
    reportInvalidSize()
    return () => observer.disconnect()
  }, [])
  const explode = reduced ? 0 : Math.max(0, Math.min(1, (progress - .2) * 1.6)); const restoration = reduced ? 0 : Math.max(0, Math.min(1, (progress - .74) * 3.8))
  if (supported === false) return <WebGLFallback />
  return <ThreeErrorBoundary fallback={<WebGLFallback />}><div ref={root} className="procedural-car" aria-label="Interaktives dreidimensionales technisches Modell eines klassischen amerikanischen V8 Coupés"><Canvas dpr={[1, 1.5]} frameloop="always" gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}><Scene explode={explode} restoration={restoration} reduced={reduced} /></Canvas><p className="car-instruction">SCROLL STEUERT EXPLODED VIEW <b>·</b> PROCEDURAL 3D STUDY</p></div></ThreeErrorBoundary>
}
