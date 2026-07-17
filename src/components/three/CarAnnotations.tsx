import { Html } from '@react-three/drei'

export function CarAnnotations({ explode }: { explode: number }) {
  if (explode < .45) return null
  return <group>
    <Html position={[-1.1, 1.6, 1.35]} center><span className="three-label">V8 ENGINE</span></Html>
    <Html position={[2, .25, 1.6]} center><span className="three-label">SUSPENSION</span></Html>
    <Html position={[1.2, 1.6, -1.1]} center><span className="three-label">BODYWORK</span></Html>
  </group>
}
