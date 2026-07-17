export const carDimensions = {
  length: 8.15, width: 3.05, height: 1.72, wheelBase: 5.15,
  frontTrack: 2.62, rearTrack: 2.7, wheelRadius: 0.7, wheelWidth: 0.43,
  motorPosition: -1.05, bodyColor: '#0b1820', blueprintColor: '#8bd7ee',
} as const

export const carSections = [
  [-4.05, .42, 1.06, 1.22], [-3.55, .5, 1.28, 1.34], [-2.55, .54, 1.42, 1.43],
  [-.75, .57, 1.48, 1.43], [.75, .56, 1.5, 1.4], [2.05, .55, 1.47, 1.32],
  [3.15, .5, 1.4, 1.23], [3.95, .4, 1.14, 1.06],
] as const

export const explodeConfig = {
  MainBody: [0, .5, 0], Hood: [-.75, .9, 0], RoofAndCabin: [0, .75, 0],
  LeftDoor: [0, .22, .75], RightDoor: [0, .22, -.75],
  FrontLeftFender: [-.3, .18, .35], FrontRightFender: [-.3, .18, -.35],
  RearLeftFender: [.3, .15, .35], RearRightFender: [.3, .15, -.35],
  Chassis: [0, -.65, 0], EngineBlock: [0, 1.05, 0], Intake: [0, 1.25, 0],
  FrontBumper: [-.7, 0, 0], RearBumper: [.7, 0, 0],
  FrontLeftWheel: [-.35, -.25, .55], FrontRightWheel: [-.35, -.25, -.55],
  RearLeftWheel: [.35, -.25, .55], RearRightWheel: [.35, -.25, -.55],
  FrontLeftBrake: [-.22, 0, .32], FrontRightBrake: [-.22, 0, -.32],
  RearLeftBrake: [.22, 0, .32], RearRightBrake: [.22, 0, -.32],
  FrontAxle: [-.45, -.35, 0], RearAxle: [.45, -.35, 0], ExhaustLeft: [.2, -.5, .2], ExhaustRight: [.2, -.5, -.2],
  Headlights: [-.35, .22, 0], RearLights: [.35, .15, 0], Seats: [0, .7, 0], SteeringWheel: [-.1, .65, -.2], Dashboard: [-.1, .6, 0],
} as const

export type CarPartName = keyof typeof explodeConfig
