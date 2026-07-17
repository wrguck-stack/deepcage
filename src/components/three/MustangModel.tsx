import { useCursor, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import partMap from '../../config/mustangPartMap.json'

const MODEL_PATH = '/models/ford-mustang-1969.glb'
const BLUEPRINT_COLOR = new THREE.Color('#4da7c3')
const BLUEPRINT_EMISSIVE = new THREE.Color('#123b4a')
const DISPLAY_LENGTH = 9.4
const EXPLOSION_STRENGTH = 1.8
const BASE_ROTATION_Y = -.32

type Props = { reduced: boolean }
type AnimatedNode = { object: THREE.Object3D; base: THREE.Vector3; offset: THREE.Vector3; target: THREE.Vector3 }
type MaterialState = { material: THREE.MeshStandardMaterial; color: THREE.Color; emissive: THREE.Color; opacity: number; metalness: number; roughness: number }

function groupOffset(group: string): THREE.Vector3 {
  const configured = partMap.recommendedExplodedView[group as keyof typeof partMap.recommendedExplodedView]
  if (configured) return new THREE.Vector3(...configured)

  // Groups without an explicit recommendation remain separated, but use a subtle, deterministic offset.
  const index = Object.keys(partMap.groups).indexOf(group)
  return new THREE.Vector3((index % 2 ? -1 : 1) * .16, .08 + (index % 3) * .06, (index % 4 - 1.5) * .12)
}

export function MustangModel({ reduced }: Props) {
  const { scene } = useGLTF(MODEL_PATH)
  const root = useRef<THREE.Group>(null)
  const assemblyProgress = useRef(0)
  const [hovered, setHovered] = useState(false)
  const [hitboxSize, setHitboxSize] = useState<[number, number, number]>([1, 1, 1])
  const model = useMemo(() => scene.clone(true), [scene])
  const animationData = useRef<{ animatedNodes: AnimatedNode[]; materialStates: MaterialState[]; outlineMaterials: THREE.LineBasicMaterial[] } | null>(null)
  useCursor(hovered)
  if (animationData.current == null) {
    const nodesByName = new Map<string, THREE.Object3D>()
    const states: MaterialState[] = []
    const animated: AnimatedNode[] = []
    const outlines: THREE.LineBasicMaterial[] = []

    model.traverse((object) => {
      if (object.name) nodesByName.set(object.name, object)
      if (!(object instanceof THREE.Mesh)) return

      const materials = Array.isArray(object.material) ? object.material : [object.material]
      object.material = materials.map((material) => material.clone())
      const clonedMaterials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of clonedMaterials) {
        if (material instanceof THREE.MeshStandardMaterial) {
          states.push({ material, color: material.color.clone(), emissive: material.emissive.clone(), opacity: material.opacity, metalness: material.metalness, roughness: material.roughness })
        }
      }
      if (object.geometry.getAttribute('position')) {
        const outlineMaterial = new THREE.LineBasicMaterial({ color: '#9ce8f5', transparent: true, opacity: .38 })
        const outline = new THREE.LineSegments(new THREE.EdgesGeometry(object.geometry, 25), outlineMaterial)
        outlines.push(outlineMaterial)
        object.add(outline)
      }
    })

    for (const [group, names] of Object.entries(partMap.groups) as [string, string[]][]) {
      const offset = groupOffset(group)
      for (const name of names) {
        const object = nodesByName.get(name)
        if (object) animated.push({ object, base: object.position.clone(), offset: offset.clone(), target: object.position.clone() })
      }
    }

    animationData.current = { animatedNodes: animated, materialStates: states, outlineMaterials: outlines }
  }

  useLayoutEffect(() => {
    if (!root.current) return
    const bounds = new THREE.Box3().setFromObject(model)
    const size = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    const largestDimension = Math.max(size.x, size.y, size.z)
    const scale = largestDimension > 0 ? DISPLAY_LENGTH / largestDimension : 1

    model.position.copy(center).multiplyScalar(-scale)
    model.scale.setScalar(scale)
    setHitboxSize([size.x * scale * 1.08, size.y * scale * 1.2, size.z * scale * 1.12])
  }, [model])

  useFrame((state, delta) => {
    const { animatedNodes, materialStates, outlineMaterials } = animationData.current!
    assemblyProgress.current = reduced ? 1 : THREE.MathUtils.damp(assemblyProgress.current, hovered ? 1 : 0, 4.5, delta)
    const explosionProgress = 1 - assemblyProgress.current
    const restorationProgress = assemblyProgress.current
    const damping = 1 - Math.exp(-7 * delta)
    for (const node of animatedNodes) {
      node.target.copy(node.base).addScaledVector(node.offset, explosionProgress * EXPLOSION_STRENGTH)
      node.object.position.lerp(node.target, damping)
    }
    for (const { material, color, emissive, opacity, metalness, roughness } of materialStates) {
      material.color.lerpColors(BLUEPRINT_COLOR, color, restorationProgress)
      material.emissive.lerpColors(BLUEPRINT_EMISSIVE, emissive, restorationProgress)
      material.opacity = THREE.MathUtils.lerp(.46, opacity, restorationProgress)
      material.transparent = restorationProgress < .99 || opacity < 1
      material.metalness = THREE.MathUtils.lerp(.18, metalness, restorationProgress)
      material.roughness = THREE.MathUtils.lerp(.46, roughness, restorationProgress)
    }
    for (const outline of outlineMaterials) { outline.opacity = THREE.MathUtils.lerp(.38, 0, restorationProgress); outline.visible = outline.opacity > .01 }
    if (root.current && !reduced) {
      root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, BASE_ROTATION_Y + (hovered ? state.pointer.x * .18 : 0), 3, delta)
      root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, hovered ? -state.pointer.y * .08 : 0, 3, delta)
    }
  })

  return <group ref={root} position={[.25, -.05, 0]} rotation={[0, BASE_ROTATION_Y, 0]}>
    <primitive object={model} />
    <mesh onPointerOver={(event) => { if (event.nativeEvent.pointerType !== 'touch') { event.stopPropagation(); setHovered(true) } }} onPointerOut={(event) => { if (event.nativeEvent.pointerType !== 'touch') { event.stopPropagation(); setHovered(false) } }} onClick={(event) => { if ('pointerType' in event.nativeEvent && event.nativeEvent.pointerType === 'touch') { event.stopPropagation(); setHovered((value) => !value) } }}>
      <boxGeometry args={hitboxSize} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

useGLTF.preload(MODEL_PATH)
