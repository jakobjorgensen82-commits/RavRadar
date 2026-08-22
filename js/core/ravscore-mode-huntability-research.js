const clamp = (value, minimum = 0, maximum = 100) => Math.max(minimum, Math.min(maximum, Number(value)));

export const MODE_COUPLING_POLICIES = Object.freeze([
  Object.freeze({
    id: 'W-WEIGHTS-45-35-20',
    description: 'Waders uses 45 percent huntability, 35 percent transport/delivery and 20 percent mobilisation',
  }),
  Object.freeze({
    id: 'W-SOFT-CAP-30-70',
    description: 'Waders keeps Candidate G but cannot exceed 30 plus 0.70 times huntability',
  }),
  Object.freeze({
    id: 'W-HUNTABILITY-CAP',
    description: 'Waders keeps Candidate G but cannot exceed the huntability component',
  }),
  Object.freeze({
    id: 'W-PHYSICAL-HUNT-MIN',
    description: 'Waders is the lower of physical amber potential and huntability, without additive huntability double counting',
  }),
  Object.freeze({
    id: 'W-PHYSICAL-HUNT-GEOMEAN',
    description: 'Waders is the geometric mean of physical amber potential and huntability',
  }),
]);

export function evaluateModeHuntabilityCoupling(candidate, mode, policyId) {
  if (!candidate?.scoreCalculation || !Number.isFinite(Number(candidate.score))) {
    throw new Error('Mode-coupling research requires an available Candidate G result');
  }
  const calculation = candidate.scoreCalculation;
  const huntability = Number(calculation.components.huntability);
  const transportAndDelivery = Number(calculation.components.transportAndDelivery);
  const mobilisation = Number(calculation.components.mobilisation);
  const gateFactor = Number(calculation.gateFactor);
  if (![huntability, transportAndDelivery, mobilisation, gateFactor].every(Number.isFinite)) {
    throw new Error('Mode-coupling research requires finite exact components and gate factor');
  }
  if (mode === 'beach') {
    return { score: candidate.score, changed: false, method: 'BEACH_UNCHANGED' };
  }
  if (mode !== 'waders') throw new Error(`Unknown hunt mode: ${mode}`);

  if (policyId === 'W-WEIGHTS-45-35-20') {
    const additiveScore = huntability * 0.45
      + transportAndDelivery * 0.35
      + mobilisation * 0.20;
    const score = Math.round(clamp(additiveScore * gateFactor));
    return { score, changed: score !== candidate.score, method: 'MODE_SPECIFIC_WEIGHTS', additiveScore };
  }

  if (policyId === 'W-SOFT-CAP-30-70') {
    const maximumScore = Math.round(clamp(30 + 0.70 * huntability));
    const score = Math.min(candidate.score, maximumScore);
    return { score, changed: score !== candidate.score, method: 'VISIBLE_SOFT_MAXIMUM', maximumScore };
  }

  if (policyId === 'W-HUNTABILITY-CAP') {
    const maximumScore = Math.round(clamp(huntability));
    const score = Math.min(candidate.score, maximumScore);
    return { score, changed: score !== candidate.score, method: 'VISIBLE_HUNTABILITY_MAXIMUM', maximumScore };
  }

  if (policyId === 'W-PHYSICAL-HUNT-MIN') {
    const physicalPotential = Math.round(clamp((
      transportAndDelivery * 0.45
      + mobilisation * 0.35
    ) / 0.80 * gateFactor));
    const maximumScore = Math.round(clamp(huntability));
    const score = Math.min(physicalPotential, maximumScore);
    return {
      score,
      changed: score !== candidate.score,
      method: 'TWO_STAGE_LOWER_OF_PHYSICAL_AND_HUNTABILITY',
      physicalPotential,
      maximumScore,
    };
  }

  if (policyId === 'W-PHYSICAL-HUNT-GEOMEAN') {
    const physicalPotential = clamp((
      transportAndDelivery * 0.45
      + mobilisation * 0.35
    ) / 0.80 * gateFactor);
    const score = Math.round(clamp(Math.sqrt(physicalPotential * huntability)));
    return { score, changed: score !== candidate.score, method: 'TWO_STAGE_GEOMETRIC_MEAN', physicalPotential };
  }

  throw new Error(`Unknown mode-coupling policy: ${policyId}`);
}
