import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import partMap from '../../config/mustangPartMap.json'

const MODEL_PATH = '/models/ford-mustang-1969.glb'
const BLUEPRINT_COLOR = new THREE.Color('#527ca5')
const BLUEPRINT_EMISSIVE = new THREE.Color('#201927')
const DISPLAY_LENGTH = 9.4
const EXPLOSION_STRENGTH = 2.3
const BASE_ROTATION_Y = -.32
const FRONT_ROTATION_Y = Math.atan2(-6.8, 8)
const AUTO_ROTATION_SPEED = Math.PI / 18
const ROOT_POSITION = new THREE.Vector3(.25, -.05, 0)
const EXPLODED_OFFSETS: Record<string, [number, number, number]> = {
  bodyPaint: [0, .35, 0], darkMechanical: [0, -.45, 0], brakes: [0, -.7, 0], chrome: [0, .05, .25], clearGlass: [0, .7, 0], interior: [0, .25, -.3], mirror: [0, .65, .85], frontLights: [-.55, .18, 0], rearLights: [.55, .18, 0], allWheelDetailsCombined: [0, -.05, .65], wheelFrontRight: [.65, -.1, .42], wheelFrontLeft: [-.65, -.1, .42], wheelRearLeft: [-.65, -.1, -.42], wheelRearRight: [.65, -.1, -.42], allTiresCombined: [0, -.28, 0], licensePlate: [-.75, .12, 0],
}

type Props = { reduced: boolean; assembled: boolean; onBoundsReady?: (sphere: THREE.Sphere) => void }
type AnimatedNode = { object: THREE.Object3D; base: THREE.Vector3; displayOffset: THREE.Vector3; target: THREE.Vector3; baseWorld: THREE.Vector3; worldPosition: THREE.Vector3 }
type MaterialState = { material: THREE.MeshStandardMaterial; color: THREE.Color; emissive: THREE.Color; emissiveIntensity: number; metalness: number; roughness: number; originalOpacity: number; originalTransparent: boolean; originalDepthWrite: boolean; originalDepthTest: boolean }
type PreparedModel = { model: THREE.Group; animatedNodes: AnimatedNode[]; materialStates: MaterialState[]; outlineMaterials: THREE.LineBasicMaterial[]; meshes: THREE.Mesh[] }

function groupOffset(group: string): THREE.Vector3 {
  const detailedOffset = EXPLODED_OFFSETS[group]
  if (detailedOffset) return new THREE.Vector3(...detailedOffset)
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
      const outlineMaterial = new THREE.LineBasicMaterial({ color: '#000000', transparent: true, opacity: .52 })
      outlineMaterials.push(outlineMaterial)
      object.add(new THREE.LineSegments(new THREE.EdgesGeometry(object.geometry, 25), outlineMaterial))
    }
  })

  const vehicleCenter = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3())
  const animatedNodes: AnimatedNode[] = []
  for (const [group, names] of Object.entries(partMap.groups) as [string, string[]][]) {
    for (const [nodeIndex, name] of names.entries()) {
      const object = nodesByName.get(name)
      if (!object) continue
      const centeredIndex = names.length > 1 ? nodeIndex / (names.length - 1) - .5 : 0
      const nodeCenter = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3())
      const radialDirection = nodeCenter.sub(vehicleCenter)
      radialDirection.y = 0
      if (radialDirection.lengthSq() > .0001) radialDirection.normalize()
      const displayOffset = groupOffset(group)
      displayOffset.addScaledVector(radialDirection, .35 + Math.abs(centeredIndex) * .35)
      displayOffset.y += centeredIndex * 1.4
      displayOffset.z += centeredIndex * .45
      animatedNodes.push({ object, base: object.position.clone(), displayOffset, target: object.position.clone(), baseWorld: new THREE.Vector3(), worldPosition: new THREE.Vector3() })
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
  outline.color.set('#000000')
  outline.opacity = THREE.MathUtils.lerp(.52, .08, progress)
}


function calculateExplodedBounds(prepared: PreparedModel, scale: number): THREE.Sphere {
  const localExplosionFactor = EXPLOSION_STRENGTH / Math.max(scale, .00000001)
  const originalPositions = prepared.animatedNodes.map((node) => node.object.position.clone())
  for (const node of prepared.animatedNodes) node.object.position.copy(node.base).addScaledVector(node.displayOffset, localExplosionFactor)
  prepared.model.updateMatrixWorld(true)
  const sphere = new THREE.Box3().setFromObject(prepared.model).getBoundingSphere(new THREE.Sphere())
  sphere.center.add(ROOT_POSITION)
  for (const [index, node] of prepared.animatedNodes.entries()) node.object.position.copy(originalPositions[index])
  prepared.model.updateMatrixWorld(true)
  return sphere
}

function writeBaseWorldPosition(node: AnimatedNode) {
  if (node.object.parent) node.baseWorld.copy(node.base).applyMatrix4(node.object.parent.matrixWorld)
}

function nearestEquivalentAngle(angle: number, reference: number) {
  return angle + Math.round((reference - angle) / (Math.PI * 2)) * Math.PI * 2
}

export function MustangModel({ reduced, assembled, onBoundsReady }: Props) {
  const { scene } = useGLTF(MODEL_PATH)
  const root = useRef<THREE.Group>(null)
  const assemblyProgress = useRef(0)
  const displayScale = useRef(1)
  const validationState = useRef({ exploded: false, assembled: false })
  const prepared = useMemo(() => prepareModel(scene), [scene])
  const preparedRef = useRef(prepared)

  useLayoutEffect(() => {
    preparedRef.current = prepared
    const bounds = new THREE.Box3().setFromObject(prepared.model)
    const size = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    const scale = Math.max(size.x, size.y, size.z) > 0 ? DISPLAY_LENGTH / Math.max(size.x, size.y, size.z) : 1
    if (!Number.isFinite(scale) || scale <= 0) throw new Error('Invalid Mustang display scale')
    displayScale.current = scale
    prepared.model.position.copy(center).multiplyScalar(-scale)
    prepared.model.scale.setScalar(scale)
    for (const node of prepared.animatedNodes) node.object.position.copy(node.base)
    root.current?.updateMatrixWorld(true)
    onBoundsReady?.(calculateExplodedBounds(prepared, scale))
    for (const node of prepared.animatedNodes) writeBaseWorldPosition(node)
    assemblyProgress.current = reduced ? 1 : 0
    const localExplosionFactor = EXPLOSION_STRENGTH / Math.max(scale, .00000001)
    if (!reduced) for (const node of prepared.animatedNodes) node.object.position.addScaledVector(node.displayOffset, localExplosionFactor)
    prepared.model.updateMatrixWorld(true)
  }, [onBoundsReady, prepared, reduced])

  useFrame((_, delta) => {
    const activePrepared = preparedRef.current
    const targetAssembly = reduced ? 1 : assembled ? 1 : 0
    assemblyProgress.current = THREE.MathUtils.damp(assemblyProgress.current, targetAssembly, 5, delta)
    const explosionProgress = 1 - assemblyProgress.current
    const restorationProgress = assemblyProgress.current
    const positionDamping = 1 - Math.exp(-7 * delta)
    const safeScale = Math.max(displayScale.current, .00000001)
    const localExplosionFactor = explosionProgress * EXPLOSION_STRENGTH / safeScale

    for (const node of activePrepared.animatedNodes) {
      node.target.copy(node.base).addScaledVector(node.displayOffset, localExplosionFactor)
      node.object.position.lerp(node.target, positionDamping)
    }
    for (const materialState of activePrepared.materialStates) applyMaterialState(materialState, restorationProgress)
    for (const outline of activePrepared.outlineMaterials) applyOutlineState(outline, restorationProgress)
    if (root.current && !reduced) {
      if (assembled) {
        const frontAngle = nearestEquivalentAngle(FRONT_ROTATION_Y, root.current.rotation.y)
        root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, frontAngle, 3, delta)
      } else {
        root.current.rotation.y += AUTO_ROTATION_SPEED * delta
      }
      root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, 0, 3, delta)
    }

    if (import.meta.env.DEV && assemblyProgress.current < .01 && !validationState.current.exploded) {
        root.current?.updateMatrixWorld(true)
        let movedOverPoint15 = 0
        let movedOverPoint40 = 0
        let maxDistance = 0
        for (const node of activePrepared.animatedNodes) {
          writeBaseWorldPosition(node)
          node.object.getWorldPosition(node.worldPosition)
          const distance = node.worldPosition.distanceTo(node.baseWorld)
          if (distance > .15) movedOverPoint15 += 1
          if (distance > .40) movedOverPoint40 += 1
          maxDistance = Math.max(maxDistance, distance)
        }
        const allVisible = activePrepared.meshes.every((mesh) => mesh.visible)
        const validMaterials = activePrepared.materialStates.every(({ material, originalOpacity, originalTransparent, originalDepthWrite, originalDepthTest }) => Number.isFinite(material.opacity) && Number.isFinite(material.metalness) && Number.isFinite(material.roughness) && material.opacity === originalOpacity && material.transparent === originalTransparent && material.depthWrite === originalDepthWrite && material.depthTest === originalDepthTest)
        if (movedOverPoint15 < 20 || movedOverPoint40 < 10 || maxDistance <= .80 || !allVisible || !validMaterials) console.error('Exploded view failed: world-space node displacement is not visible.', { movedOverPoint15, movedOverPoint40, maxDistance, allVisible, validMaterials })
        else console.info('Mustang exploded-state check', { movedOverPoint15, movedOverPoint40, maxDistance, allVisible, validMaterials })
        validationState.current.exploded = true
        validationState.current.assembled = false
    }
    if (import.meta.env.DEV && assemblyProgress.current > .99 && !validationState.current.assembled) {
        root.current?.updateMatrixWorld(true)
        let maxDistance = 0
        for (const node of activePrepared.animatedNodes) { writeBaseWorldPosition(node); node.object.getWorldPosition(node.worldPosition); maxDistance = Math.max(maxDistance, node.worldPosition.distanceTo(node.baseWorld)) }
        const allVisible = activePrepared.meshes.every((mesh) => mesh.visible)
        const validMaterials = activePrepared.materialStates.every(({ material, originalOpacity, originalTransparent, originalDepthWrite, originalDepthTest }) => Number.isFinite(material.opacity) && Number.isFinite(material.metalness) && Number.isFinite(material.roughness) && material.opacity === originalOpacity && material.transparent === originalTransparent && material.depthWrite === originalDepthWrite && material.depthTest === originalDepthTest)
        if (maxDistance >= .02 || !allVisible || !validMaterials) console.error('Mustang assembled-state check failed.', { maxDistance, allVisible, validMaterials, meshCount: activePrepared.meshes.length })
        else console.info('Mustang assembled-state check', { maxDistance, allVisible, validMaterials, meshCount: activePrepared.meshes.length })
        validationState.current.assembled = true
        validationState.current.exploded = false
    }
  })

  return <group ref={root} position={ROOT_POSITION} rotation={[0, BASE_ROTATION_Y, 0]}><primitive object={prepared.model} /></group>
}

useGLTF.preload(MODEL_PATH)
