import type { Pose } from './pose';

/**
 * Key poses, authored for a right-hander. Left-handers use mirrorPose(). Yaw -90 faces the third-base side,
 * which is how a right-hander stands in the set with his glove side toward the plate.
 */
export const PITCHER_POSES = {
  stand: {
    yaw: -90,
    joints: { shoulderL: [0, 0, 6], shoulderR: [0, 0, -6], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0] },
  },
  stretch: {
    yaw: -90,
    joints: {
      shoulderL: [-75, 0, -30],
      elbowL: [-75, 0, 0],
      shoulderR: [-75, 0, 30],
      elbowR: [-75, 0, 0],
      spine: [-4, 0, 0],
    },
  },
  set: {
    yaw: -90,
    hipDrop: 0.015,
    joints: {
      shoulderL: [-32, 0, -30],
      elbowL: [-98, 0, 0],
      shoulderR: [-32, 0, 30],
      elbowR: [-98, 0, 0],
      hipL: [-10, 0, 0],
      hipR: [-6, 0, 0],
      kneeL: [14, 0, 0],
      kneeR: [10, 0, 0],
      spine: [6, 0, 0],
    },
  },
  legLift: {
    yaw: -95,
    joints: {
      shoulderL: [-55, 0, -30],
      elbowL: [-105, 0, 0],
      shoulderR: [-55, 0, 30],
      elbowR: [-105, 0, 0],
      hipL: [-88, 0, 0],
      kneeL: [100, 0, 0],
      hipR: [-4, 0, 0],
      kneeR: [14, 0, 0],
      spine: [-8, 0, 0],
    },
  },
  stride: {
    yaw: -55,
    hipDrop: 0.1,
    offset: [0, 2.6],
    joints: {
      shoulderL: [-80, 0, 40],
      elbowL: [-30, 0, 0],
      shoulderR: [30, 0, -85],
      elbowR: [-95, 0, 0],
      hipL: [-55, 0, 20],
      kneeL: [35, 0, 0],
      hipR: [20, 0, 0],
      kneeR: [40, 0, 0],
      spine: [4, -20, 0],
    },
  },
  release: {
    yaw: -5,
    hipDrop: 0.13,
    offset: [0, 4.2],
    joints: {
      shoulderL: [-40, 0, -50],
      elbowL: [-120, 0, 0],
      shoulderR: [-165, 0, 15],
      elbowR: [-15, 0, 0],
      hipL: [-50, 0, 0],
      kneeL: [25, 0, 0],
      hipR: [40, 0, 0],
      kneeR: [55, 0, 0],
      spine: [28, 0, 0],
    },
  },
  follow: {
    yaw: 15,
    hipDrop: 0.1,
    offset: [0, 4.8],
    joints: {
      shoulderL: [-20, 0, -30],
      elbowL: [-110, 0, 0],
      shoulderR: [-60, 0, 50],
      elbowR: [-40, 0, 0],
      hipL: [-35, 0, 0],
      kneeL: [30, 0, 0],
      hipR: [-20, 0, 0],
      kneeR: [70, 0, 0],
      spine: [42, 0, 0],
    },
  },
} as const satisfies Record<string, Pose>;

/** Right-handed batter facing the plate; root yaw is set by the actor (+90 for a righty). */
export const BATTER_POSES = {
  stance: {
    hipDrop: 0.04,
    joints: {
      spine: [16, 0, 0],
      hipL: [-22, 0, 8],
      hipR: [-18, 0, -8],
      kneeL: [28, 0, 0],
      kneeR: [26, 0, 0],
      shoulderL: [-70, 0, -55],
      elbowL: [-60, 0, 0],
      shoulderR: [-55, 0, -10],
      elbowR: [-100, 0, 0],
      head: [-14, -55, 0],
    },
  },
} as const satisfies Record<string, Pose>;

/**
 * Catcher's receiving crouch for a 5 ft 10 in rig: hips under 0.9 ft up, torso tipped well forward, head up.
 * The helmet top lands near 3.2 ft, so the slot camera sees the zone beside and over it (U5).
 */
export const CATCHER_POSES = {
  crouch: {
    hipDrop: 0.38,
    joints: {
      spine: [45, 0, 0],
      chest: [8, 0, 0],
      head: [-50, 0, 0],
      hipL: [-95, 0, 24],
      hipR: [-95, 0, -24],
      kneeL: [158, 0, 0],
      kneeR: [158, 0, 0],
      footL: [-63, 0, 0],
      footR: [-63, 0, 0],
      shoulderL: [-60, 0, -15],
      elbowL: [-30, 0, 0],
      shoulderR: [-15, 0, -20],
      elbowR: [-95, 0, 0],
    },
  },
} as const satisfies Record<string, Pose>;
