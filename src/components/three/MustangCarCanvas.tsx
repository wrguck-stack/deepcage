import { Html, PerspectiveCamera } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
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

function Scene({ explode, restoration, reduced, pointerEnabled }: { explode: number; restoration: number; reduced: boolean; pointerEnabled: boolean }) {
  return <>
    <PerspectiveCamera makeDefault position={[-7.4, 3.1, 8.8]} fov={32} near={.1} far={100} onUpdate={(camera: THREE.PerspectiveCamera) => camera.lookAt(0, 0, 0)} />
    <ambientLight intensity={.8} color="#b9d9e3" />
    <directionalLight position={[-4, 7, 5]} intensity={3.4} color="#e0f4ff" />
    <directionalLight position={[5, 3, -4]} intensity={1.7} color="#70b9d0" />
    <CarBlueprintEnvironment reduced={reduced} />
    <Suspense fallback={<LoadingIndicator />}><MustangModel explode={explode} restoration={restoration} reduced={reduced} pointerEnabled={pointerEnabled} /></Suspense>
  </>
}

export function MustangCarCanvas() {
  const root = useRef<HTMLDivElement>(null)
  const supported = useWebGLSupport()
  const reduced = useReducedMotion()
  const [progress, setProgress] = useState(0)
  const [pointerEnabled, setPointerEnabled] = useState(false)

  useEffect(() => {
    const update = () => {
      const hero = document.getElementById('start')
      if (!hero || reduced) return
      const rect = hero.getBoundingClientRect()
      const scrollableDistance = hero.offsetHeight - window.innerHeight
      setProgress(scrollableDistance > 0 ? THREE.MathUtils.clamp(-rect.top / scrollableDistance, 0, 1) : 0)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [reduced])

  const assembling = THREE.MathUtils.clamp((progress - .18) / .4, 0, 1)
  const disassembling = THREE.MathUtils.clamp(1 - (progress - .72) / .2, 0, 1)
  const explode = reduced ? 0 : Math.min(assembling, disassembling)
  const restoration = reduced ? 0 : THREE.MathUtils.clamp((progress - .82) / .18, 0, 1)
  if (supported === false) return <WebGLFallback />

  return <MustangErrorBoundary fallback={<WebGLFallback />}><div ref={root} className="mustang-car" aria-label="Interaktives dreidimensionales Modell eines Ford Mustang von 1969">
    <Canvas dpr={[1, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} onPointerEnter={() => setPointerEnabled(true)} onPointerLeave={() => setPointerEnabled(false)}><Scene explode={explode} restoration={restoration} reduced={reduced} pointerEnabled={pointerEnabled} /></Canvas>
    <p className="car-instruction">SCROLL STEUERT EXPLODED VIEW <b>·</b> 1969 MUSTANG</p>
  </div></MustangErrorBoundary>
}
