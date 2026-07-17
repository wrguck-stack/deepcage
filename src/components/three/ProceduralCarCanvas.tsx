import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useCanvasVisibility } from '../../hooks/useCanvasVisibility'
import { useWebGLSupport } from '../../hooks/useWebGLSupport'
import { CarAnnotations } from './CarAnnotations'
import { CarBlueprintEnvironment } from './CarBlueprintEnvironment'
import { ProceduralClassicCar } from './ProceduralClassicCar'
import { WebGLFallback } from './WebGLFallback'

function Scene({ explode, restoration, reduced }: { explode: number; restoration: number; reduced: boolean }) {
  return <><PerspectiveCamera makeDefault position={[-9, 5.4, 10]} fov={35} /><ambientLight intensity={.55} color="#a6c9d4" /><directionalLight position={[-4, 6, 5]} intensity={3.2} color="#d9efff" /><directionalLight position={[5, 2, -4]} intensity={1.5} color="#7eb6d3" /><Suspense fallback={null}><CarBlueprintEnvironment reduced={reduced} /><ProceduralClassicCar explode={explode} restoration={restoration} reduced={reduced} /><CarAnnotations explode={explode} /></Suspense></>
}

export function ProceduralCarCanvas() {
  const root = useRef<HTMLDivElement>(null); const visible = useCanvasVisibility(root); const supported = useWebGLSupport(); const reduced = useReducedMotion(); const [progress, setProgress] = useState(0)
  useEffect(() => { const update = () => { if (!root.current || reduced) return; const rect = root.current.getBoundingClientRect(); setProgress(Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)))) }; update(); window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update); return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update) } }, [reduced])
  const explode = reduced ? 0 : Math.max(0, Math.min(1, (progress - .2) * 1.6)); const restoration = reduced ? 0 : Math.max(0, Math.min(1, (progress - .74) * 3.8))
  if (supported === false) return <WebGLFallback />
  return <div ref={root} className="procedural-car" aria-label="Interaktives dreidimensionales technisches Modell eines klassischen amerikanischen V8 Coupés"><Canvas dpr={[1, 1.5]} frameloop={visible ? 'always' : 'never'} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}><Scene explode={explode} restoration={restoration} reduced={reduced} /></Canvas><p className="car-instruction">SCROLL STEUERT EXPLODED VIEW <b>·</b> PROCEDURAL 3D STUDY</p></div>
}
