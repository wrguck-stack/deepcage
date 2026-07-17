import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import partMap from '../../config/mustangPartMap.json'

const MODEL_PATH = '/models/ford-mustang-1969.glb'
const BLUEPRINT_COLOR = new THREE.Color('#4da7c3')
const BLUEPRINT_EMISSIVE = new THREE.Color('#123b4a')
const DISPLAY_LENGTH = 9.4
const EXPLOSION_STRENGTH = 2.3
const BASE_ROTATION_Y = -.32

type Props = { reduced: boolean; assembled: boolean }
type AnimatedNode = { object: THREE.Object3D; base: THREE.Vector3; offset: THREE.Vector3; target: THREE.Vector3 }
type MaterialState = { material: THREE.MeshStandardMaterial; color: THREE.Color; emissive: THREE.Color; emissiveIntensity: number; metalness: number; roughness: number; originalOpacity: number; originalTransparent: boolean; originalDepthWrite: boolean; originalDepthTest: boolean }
type PreparedModel = { model: THREE.Group; animatedNodes: AnimatedNode[]; materialStates: MaterialState[]; outlineMaterials: THREE.LineBasicMaterial[]; meshes: THREE.Mesh[] }

function groupOffset(group: string): THREE.Vector3 {
  const configured = partMap.recommendedExplodedView[group as keyof typeof partMap.recommendedExplodedView]
  if (configured) return new THREE.Vector3(...configured)
  const index = Object.keys(partMap.groups).indexOf(group)
  return new THREE.Vector3((index % 2 ? -1 : 1) * .16, .08 + (index % 3) * .06, (index % 4 - 1.5) * .12)
}

function prepareModel(scene: THREE.Group): PreparedModel {
  const model = scene.clone(true)
  const nodesByName = new Map<string, THREE.Object3D>()
  const materialStates: MaterialState[] = []
  const outlineMaterials: THREE.LineBasicMaterial[] = []
  const meshes: THREE.Mesh[] = []

  model.traverse((object) => {
    if (object.name) nodesByName.set(object.name, object)
    if (!(object instanceof THREE.Mesh)) return
    meshes.push(object)
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    object.material = materials.map((material) => material.clone())
    const clonedMaterials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of clonedMaterials) {
      if (material instanceof THREE.MeshStandardMaterial) {
        materialStates.push({ material, color: material.color.clone(), emissive: material.emissive.clone(), emissiveIntensity: material.emissiveIntensity, metalness: material.metalness, roughness: material.roughness, originalOpacity: material.opacity, originalTransparent: material.transparent, originalDepthWrite: material.depthWrite, originalDepthTest: material.depthTest })
      }
    }
    if (object.geometry.getAttribute('position')) {
      const outlineMaterial = new THREE.LineBasicMaterial({ color: '#9ce8f5', transparent: true, opacity: .52 })
      outlineMaterials.push(outlineMaterial)
      object.add(new THREE.LineSegments(new THREE.EdgesGeometry(object.geometry, 25), outlineMaterial))
    }
  })

  const animatedNodes: AnimatedNode[] = []
  for (const [group, names] of Object.entries(partMap.groups) as [string, string[]][]) {
    const offset = groupOffset(group)
    for (const name of names) {
      const object = nodesByName.get(name)
      if (object) animatedNodes.push({ object, base: object.position.clone(), offset: offset.clone(), target: object.position.clone() })
    }
  }
  return { model, animatedNodes, materialStates, outlineMaterials, meshes }
}

function applyMaterialState(state: MaterialState, progress: number) {
  const { material, color, emissive, emissiveIntensity, metalness, roughness } = state
  material.color.lerpColors(BLUEPRINT_COLOR, color, progress)
  material.emissive.lerpColors(BLUEPRINT_EMISSIVE, emissive, progress)
  material.emissiveIntensity = THREE.MathUtils.lerp(.28, emissiveIntensity, progress)
  material.metalness = THREE.MathUtils.lerp(.18, metalness, progress)
  material.roughness = THREE.MathUtils.lerp(.46, roughness, progress)
}

function applyOutlineState(outline: THREE.LineBasicMaterial, progress: number) {
  outline.opacity = THREE.MathUtils.lerp(.52, .08, progress)
}

export function MustangModel({ reduced, assembled }: Props) {
  const { scene } = useGLTF(MODEL_PATH)
  const root = useRef<THREE.Group>(null)
  const assemblyProgress = useRef(0)
  const validationState = useRef({ exploded: false, assembled: false })
  const prepared = useMemo(() => prepareModel(scene), [scene])
  const preparedRef = useRef(prepared)

  useLayoutEffect(() => {
    preparedRef.current = prepared
    const bounds = new THREE.Box3().setFromObject(prepared.model)
    const size = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    const scale = Math.max(size.x, size.y, size.z) > 0 ? DISPLAY_LENGTH / Math.max(size.x, size.y, size.z) : 1
    prepared.model.position.copy(center).multiplyScalar(-scale)
    prepared.model.scale.setScalar(scale)
    assemblyProgress.current = reduced ? 1 : 0
    for (const node of prepared.animatedNodes) {
      node.object.position.copy(node.base)
      if (!reduced) node.object.position.addScaledVector(node.offset, EXPLOSION_STRENGTH)
    }
  }, [prepared, reduced])

  useFrame((state, delta) => {
    const activePrepared = preparedRef.current
    const targetAssembly = reduced ? 1 : assembled ? 1 : 0
    assemblyProgress.current = THREE.MathUtils.damp(assemblyProgress.current, targetAssembly, 5, delta)
    const explosionProgress = 1 - assemblyProgress.current
    const restorationProgress = assemblyProgress.current
    const positionDamping = 1 - Math.exp(-7 * delta)

    for (const node of activePrepared.animatedNodes) {
      node.target.copy(node.base).addScaledVector(node.offset, explosionProgress * EXPLOSION_STRENGTH)
      node.object.position.lerp(node.target, positionDamping)
    }
    for (const materialState of activePrepared.materialStates) applyMaterialState(materialState, restorationProgress)
    for (const outline of activePrepared.outlineMaterials) applyOutlineState(outline, restorationProgress)
    if (root.current && !reduced) {
      root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, BASE_ROTATION_Y + (assembled ? state.pointer.x * .18 : 0), 3, delta)
      root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, assembled ? -state.pointer.y * .08 : 0, 3, delta)
    }

    if (import.meta.env.DEV) {
      const maxDistance = Math.max(...activePrepared.animatedNodes.map((node) => node.object.position.distanceTo(node.base)))
      const allVisible = activePrepared.meshes.every((mesh) => mesh.visible)
      const validMaterials = activePrepared.materialStates.every(({ material, originalOpacity, originalTransparent, originalDepthWrite, originalDepthTest }) => Number.isFinite(material.opacity) && Number.isFinite(material.metalness) && Number.isFinite(material.roughness) && material.opacity === originalOpacity && material.transparent === originalTransparent && material.depthWrite === originalDepthWrite && material.depthTest === originalDepthTest)
      if (assemblyProgress.current < .01 && !validationState.current.exploded) {
        const movedNodes = activePrepared.animatedNodes.filter((node) => node.object.position.distanceTo(node.base) > .05).length
        console.info('Mustang exploded-state check', { movedNodes, maxDistance, allVisible, validMaterials })
        validationState.current.exploded = true
        validationState.current.assembled = false
      }
      if (assemblyProgress.current > .99 && !validationState.current.assembled) {
        console.info('Mustang assembled-state check', { maxDistance, allVisible, validMaterials, meshCount: activePrepared.meshes.length })
        validationState.current.assembled = true
        validationState.current.exploded = false
      }
    }
  })

  return <group ref={root} position={[.25, -.05, 0]} rotation={[0, BASE_ROTATION_Y, 0]}><primitive object={prepared.model} /></group>
}

useGLTF.preload(MODEL_PATH)
