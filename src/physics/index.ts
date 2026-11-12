/**
 * Public API of the compressible-flow physics module. Pure functions, no UI
 * dependencies. Numeric internals (root finding, input guards) stay private.
 */

export { ok, err, type ErrorCode, type PhysicsError, type Result } from './result'
export {
  areaRatio,
  isentropicFromMach,
  machFromAreaRatio,
  machFromMachAngle,
  machFromPP0,
  machFromPrandtlMeyer,
  machFromRhoRho0,
  machFromTT0,
  maxPrandtlMeyerDeg,
  prandtlMeyerDeg,
  pressureRatio,
  type FlowBranch,
  type IsentropicState,
} from './isentropic'
export {
  m1FromM2,
  m1FromP02P01,
  m1FromP1P02,
  m1FromP2P1,
  m1FromRho2Rho1,
  m1FromT2T1,
  normalShock,
  type NormalShockState,
} from './normalShock'
export {
  maxDeflection,
  obliqueFromBeta,
  obliqueFromM1n,
  obliqueFromTheta,
  thetaFromBetaDeg,
  type MaxDeflection,
  type ObliqueFromTheta,
  type ObliqueShockState,
} from './obliqueShock'
export {
  solveIsentropic,
  solveNormalShock,
  solveOblique,
  type IsentropicInputKind,
  type NormalShockInputKind,
  type ObliqueInputKind,
  type ObliqueSolution,
  type SolverInput,
} from './solvers'
