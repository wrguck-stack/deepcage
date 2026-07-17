import { readFile } from 'node:fs/promises'

const modelPath = new URL('../public/brand/models/ford-mustang-1969.glb', import.meta.url)
const mapPath = new URL('../src/config/mustangPartMap.json.json', import.meta.url)
const glbMagic = 0x46546c67
const jsonChunkType = 0x4e4f534a

function readGltfJson(glb) {
  if (glb.readUInt32LE(0) !== glbMagic) {
    throw new Error('The model is not a valid binary glTF (GLB) file.')
  }

  const jsonLength = glb.readUInt32LE(12)
  if (glb.readUInt32LE(16) !== jsonChunkType) {
    throw new Error('The first GLB chunk is not a JSON chunk.')
  }

  return JSON.parse(glb.toString('utf8', 20, 20 + jsonLength))
}

const [glb, mapFile] = await Promise.all([readFile(modelPath), readFile(mapPath, 'utf8')])
const gltf = readGltfJson(glb)
const partMap = JSON.parse(mapFile)
const assignments = Object.entries(partMap.groups).flatMap(([group, names]) =>
  names.map((name) => ({ group, name })),
)
const nodeNames = new Set(gltf.nodes.flatMap((node) => (node.name ? [node.name] : [])))
const mappedNames = new Set(assignments.map(({ name }) => name))
const missingNames = [...mappedNames].filter((name) => !nodeNames.has(name))
const foundMappingEntries = assignments.filter(({ name }) => nodeNames.has(name)).length
const groupsByName = new Map()

for (const { group, name } of assignments) {
  groupsByName.set(name, [...(groupsByName.get(name) ?? []), group])
}

const duplicateAssignments = [...groupsByName].filter(([, groups]) => groups.length > 1)
const unassignedObjectNodes = gltf.nodes
  .filter((node) => node.mesh !== undefined && /^Object_\d+$/.test(node.name ?? ''))
  .map((node) => node.name)
  .filter((name) => !mappedNames.has(name))

console.log(`Mapping-Einträge: ${assignments.length}`)
console.log(`Gefundene Node-Namen: ${foundMappingEntries}`)
console.log(`Fehlende Node-Namen: ${missingNames.length}`)
console.log(`Doppelte Gruppenzuordnungen: ${duplicateAssignments.length}`)
console.log(`Nicht zugeordnete Object_*-Nodes: ${unassignedObjectNodes.length}`)

if (missingNames.length > 0) console.error(`Fehlend: ${missingNames.join(', ')}`)
if (duplicateAssignments.length > 0) {
  console.error(
    `Doppelt zugeordnet: ${duplicateAssignments.map(([name, groups]) => `${name} (${groups.join(', ')})`).join(', ')}`,
  )
}
if (unassignedObjectNodes.length > 0) console.error(`Nicht zugeordnet: ${unassignedObjectNodes.join(', ')}`)

if (missingNames.length || duplicateAssignments.length || unassignedObjectNodes.length) process.exitCode = 1
