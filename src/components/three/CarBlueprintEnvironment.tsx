import { Grid, Line } from '@react-three/drei'

export function CarBlueprintEnvironment({ reduced }: { reduced: boolean }) {
  return <group>
    <Grid args={[18, 18]} cellSize={.5} cellThickness={.45} sectionSize={3} sectionThickness={.8} fadeDistance={13} fadeStrength={1.5} position={[0, -.95, 0]} cellColor="#174a75" sectionColor="#b52f39" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.91, 0]}><ringGeometry args={[4.3, 4.34, 64]} /><meshBasicMaterial color="#f4efe4" transparent opacity={.25} /></mesh>
    <Line points={[[-4.5, -.84, 0], [4.5, -.84, 0]]} color="#df4c4d" transparent opacity={.4} lineWidth={.5} />
    {!reduced && <pointLight color="#b52f39" intensity={8} distance={7} position={[-2, 3, 2]} />}
  </group>
}
