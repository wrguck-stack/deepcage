import { Edges, RoundedBox, useCursor } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { carDimensions, carSections, explodeConfig, type CarPartName } from '../../config/carGeometry'

type Props = { explode: number; restoration: number; reduced: boolean }
type PartProps = { name: CarPartName; explode: number; children: ReactNode; label?: string }

function Part({ name, explode, children, label }: PartProps) {
  const group = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  useFrame(() => {
    if (!group.current) return
    const [x, y, z] = explodeConfig[name]
    const delayed = THREE.MathUtils.smoothstep(explode, .08, .9)
    group.current.position.lerp(new THREE.Vector3(x * delayed, y * delayed, z * delayed), .08)
  })
  return <group ref={group} name={name} onPointerOver={(event) => { event.stopPropagation(); setHovered(true) }} onPointerOut={() => setHovered(false)}>{children}{hovered && label && <mesh position={[0, 0, 0]}><sphereGeometry args={[.03]} /><meshBasicMaterial color="#bdf4ff" /></mesh>}</group>
}

function loftGeometry(): THREE.BufferGeometry {
  const positions: number[] = []; const indices: number[] = []; const sides = 8
  carSections.forEach(([x, bottom, shoulder, top]) => {
    const ring = [[bottom, 0], [bottom + .08, .78], [shoulder, 1], [top, .78], [top + .04, 0], [top, -.78], [shoulder, -1], [bottom + .08, -.78]]
    ring.forEach(([y, normalizedZ]) => positions.push(x, y - .75, normalizedZ * (shoulder > 1.45 ? 1.5 : 1.34)))
  })
  for (let i = 0; i < carSections.length - 1; i++) for (let j = 0; j < sides; j++) { const a = i * sides + j; const b = i * sides + (j + 1) % sides; indices.push(a, b, a + sides, b, b + sides, a + sides) }
  for (let j = 1; j < sides - 1; j++) { indices.push(0, j + 1, j); const e = (carSections.length - 1) * sides; indices.push(e, e + j, e + j + 1) }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  return geometry
}

function Finish({ restoration }: { restoration: number }) {
  const material = useRef<THREE.MeshStandardMaterial>(null)
  const blueprintColor = useMemo(() => new THREE.Color('#397f99'), [])
  const restoredColor = useMemo(() => new THREE.Color(carDimensions.bodyColor), [])
  const blueprintEmissive = useMemo(() => new THREE.Color('#173f50'), [])
  const restoredEmissive = useMemo(() => new THREE.Color('#000000'), [])
  useFrame(() => { if (material.current) { material.current.color.lerpColors(blueprintColor, restoredColor, restoration); material.current.emissive.lerpColors(blueprintEmissive, restoredEmissive, restoration); material.current.opacity = THREE.MathUtils.lerp(.35, 1, restoration); material.current.metalness = THREE.MathUtils.lerp(.25, .75, restoration); material.current.roughness = THREE.MathUtils.lerp(.45, .2, restoration) } })
  return <meshStandardMaterial ref={material} color="#397f99" emissive="#173f50" emissiveIntensity={.35} opacity={.35} transparent side={THREE.DoubleSide} />
}

function Wheel({ name, brake, position, explode, restoration }: { name: CarPartName; brake: CarPartName; position: [number, number, number]; explode: number; restoration: number }) {
  return <group position={position}><Part name={brake} explode={explode} label="BRAKE SYSTEM"><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.43, .43, .07, 24]} /><meshStandardMaterial color="#77838a" metalness={.9} roughness={.3} /><Edges color="#9fe1ed" /></mesh><RoundedBox args={[.17, .24, .11]} position={[0, .2, .07]}><meshStandardMaterial color="#b8322d" metalness={.5} /></RoundedBox></Part><Part name={name} explode={explode} label="SUSPENSION"><group rotation={[Math.PI / 2, 0, 0]}><mesh><cylinderGeometry args={[carDimensions.wheelRadius, carDimensions.wheelRadius, carDimensions.wheelWidth, 32]} /><meshStandardMaterial color="#101215" roughness={.72} /></mesh><mesh position={[0, 0, carDimensions.wheelWidth / 2 + .01]}><cylinderGeometry args={[.42, .42, .025, 24]} /><meshStandardMaterial color={restoration > .5 ? '#b9c1c2' : '#39758a'} metalness={.92} roughness={.23} /><Edges color="#9ce1ee" /></mesh><mesh position={[0, 0, carDimensions.wheelWidth / 2 + .03]}><cylinderGeometry args={[.1, .1, .05, 18]} /><meshStandardMaterial color="#19242a" metalness={.8} /></mesh></group></Part></group>
}

export function ProceduralClassicCar({ explode, restoration, reduced }: Props) {
  const body = useMemo(() => loftGeometry(), [])
  const root = useRef<THREE.Group>(null)
  useEffect(() => {
    if (!import.meta.env.DEV || !root.current) return
    const bounds = new THREE.Box3().setFromObject(root.current)
    const size = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    if (!Number.isFinite(size.x) || !Number.isFinite(size.y) || !Number.isFinite(size.z)) console.warn('Procedural car has invalid bounds.', { center, size })
  }, [])
  useFrame((state) => { if (root.current && !reduced) { root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, state.pointer.x * .17 - .5, 3, state.clock.getDelta()); root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, -state.pointer.y * .07, 3, state.clock.getDelta()) } })
  const chrome = <meshStandardMaterial color="#c5d2d3" metalness={.95} roughness={.2} />
  return <group ref={root} position={[0, 0, 0]} rotation={[0, -.5, 0]} scale={.88}>
    <Part name="MainBody" explode={explode} label="BODYWORK"><mesh geometry={body}><Finish restoration={restoration} /><Edges color="#89d7ed" threshold={20} /></mesh></Part>
    <Part name="Chassis" explode={explode} label="CHASSIS"><group position={[0, -.57, 0]}><RoundedBox args={[6.5, .16, .16]} position={[0, 0, 1.05]}>{chrome}</RoundedBox><RoundedBox args={[6.5, .16, .16]} position={[0, 0, -1.05]}>{chrome}</RoundedBox>{[-2.2, 0, 2.2].map(x => <RoundedBox key={x} args={[.16, .14, 2.25]} position={[x, 0, 0]}>{chrome}</RoundedBox>)}</group></Part>
    <Part name="Hood" explode={explode} label="BODYWORK"><RoundedBox args={[2.35, .12, 2.22]} radius={.12} smoothness={4} position={[-2.02, .48, 0]}><Finish restoration={restoration} /></RoundedBox></Part>
    <Part name="RoofAndCabin" explode={explode} label="INTERIOR"><group position={[.72, .83, 0]}><RoundedBox args={[2.45, .64, 2.15]} radius={.24} smoothness={5}><meshStandardMaterial color="#142831" transparent opacity={.58} metalness={.25} roughness={.16} /></RoundedBox><Edges color="#94dbea" /></group></Part>
    {(['LeftDoor', 'RightDoor'] as const).map((name, i) => <Part key={name} name={name} explode={explode} label="BODYWORK"><RoundedBox args={[1.75, .62, .07]} radius={.08} position={[.72, .02, i ? -1.48 : 1.48]}><Finish restoration={restoration} /></RoundedBox></Part>)}
    {(['FrontLeftFender', 'FrontRightFender', 'RearLeftFender', 'RearRightFender'] as const).map((name, i) => <Part key={name} name={name} explode={explode}><mesh position={[i < 2 ? -2.2 : 2.25, -.05, i % 2 ? -1.38 : 1.38]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.78, .09, 10, 24, Math.PI]} /><Finish restoration={restoration} /></mesh></Part>)}
    <Part name="EngineBlock" explode={explode} label="V8 ENGINE"><group position={[-1.05, .12, 0]}><RoundedBox args={[1.25, .48, 1.25]}>{chrome}</RoundedBox><RoundedBox args={[.85, .24, .5]} position={[0, .36, .4]} rotation={[0, 0, -.18]}>{chrome}</RoundedBox><RoundedBox args={[.85, .24, .5]} position={[0, .36, -.4]} rotation={[0, 0, .18]}>{chrome}</RoundedBox><RoundedBox args={[.65, .35, .55]} position={[.8, -.02, 0]}>{chrome}</RoundedBox></group></Part>
    <Part name="Intake" explode={explode} label="V8 ENGINE"><mesh position={[-1.05, .58, 0]}><cylinderGeometry args={[.32, .4, .24, 24]} />{chrome}<Edges color="#9fe1ed" /></mesh></Part>
    <Part name="FrontBumper" explode={explode}><RoundedBox args={[.18, .18, 2.75]} position={[-4.04, -.14, 0]} radius={.08}>{chrome}</RoundedBox></Part><Part name="RearBumper" explode={explode}><RoundedBox args={[.18, .18, 2.65]} position={[4.02, -.12, 0]} radius={.08}>{chrome}</RoundedBox></Part>
    <Part name="Headlights" explode={explode}><group position={[-3.8, .18, 0]}>{[-.78, .78].map(z => <mesh key={z} position={[0, 0, z]} rotation={[0, Math.PI / 2, 0]}><cylinderGeometry args={[.24, .24, .08, 20]} /><meshStandardMaterial color="#fff2c8" emissive="#ffe9a6" emissiveIntensity={1} /></mesh>)}</group></Part><Part name="RearLights" explode={explode}><group position={[3.9, .16, 0]}>{[-.78, .78].map(z => <mesh key={z} position={[0, 0, z]}><boxGeometry args={[.08, .18, .45]} /><meshStandardMaterial color="#ba2425" emissive="#791313" emissiveIntensity={.5} /></mesh>)}</group></Part>
    <Wheel name="FrontLeftWheel" brake="FrontLeftBrake" position={[-2.35, -.52, 1.38]} explode={explode} restoration={restoration} /><Wheel name="FrontRightWheel" brake="FrontRightBrake" position={[-2.35, -.52, -1.38]} explode={explode} restoration={restoration} /><Wheel name="RearLeftWheel" brake="RearLeftBrake" position={[2.45, -.52, 1.42]} explode={explode} restoration={restoration} /><Wheel name="RearRightWheel" brake="RearRightBrake" position={[2.45, -.52, -1.42]} explode={explode} restoration={restoration} />
    <Part name="FrontAxle" explode={explode}><mesh position={[-2.35, -.55, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.08, .08, 2.65, 12]} />{chrome}</mesh></Part><Part name="RearAxle" explode={explode}><mesh position={[2.45, -.55, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.1, .1, 2.7, 12]} />{chrome}</mesh></Part>
    <Part name="ExhaustLeft" explode={explode} label="EXHAUST SYSTEM"><mesh position={[1.7, -.52, .78]} rotation={[0, Math.PI / 2, 0]}><cylinderGeometry args={[.07, .07, 3.5, 12]} />{chrome}</mesh></Part><Part name="ExhaustRight" explode={explode} label="EXHAUST SYSTEM"><mesh position={[1.7, -.52, -.78]} rotation={[0, Math.PI / 2, 0]}><cylinderGeometry args={[.07, .07, 3.5, 12]} />{chrome}</mesh></Part>
    <Part name="Seats" explode={explode} label="INTERIOR"><group position={[.9, .55, 0]}>{[-.48, .48].map(z => <RoundedBox key={z} args={[.55, .6, .45]} position={[0, 0, z]}><meshStandardMaterial color="#2a201c" roughness={.65} /></RoundedBox>)}</group></Part><Part name="Dashboard" explode={explode}><RoundedBox args={[.16, .2, 1.85]} position={[-.35, .78, 0]}><meshStandardMaterial color="#152027" /></RoundedBox></Part><Part name="SteeringWheel" explode={explode}><mesh position={[-.05, .88, -.55]} rotation={[Math.PI / 2, 0, .25]}><torusGeometry args={[.25, .035, 10, 20]} />{chrome}</mesh></Part>
  </group>
}
