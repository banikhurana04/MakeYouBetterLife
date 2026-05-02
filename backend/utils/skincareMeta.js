const { normalizeConcerns, normalizeSkinType } = require('./skinCareEngine');

const CONCERN_LABELS = {
  acne: 'Acne-prone',
  pigmentation: 'Pigmentation / dark spots',
  dullness: 'Dull or uneven tone',
  aging: 'Fine lines & elasticity',
  dryness: 'Dehydration / barrier dryness',
};

/**
 * Rule-based skincare summary for UI (not medical diagnosis).
 */
function buildSkincareMeta({ lifestyle, concerns, skin_type }) {
  const concernsList = normalizeConcerns(concerns);
  const skinType = normalizeSkinType(skin_type);

  const sleep = lifestyle?.avg_sleep_last_7_days ?? lifestyle?.sleep_hours;
  const water = lifestyle?.avg_water_intake ?? lifestyle?.water_intake;

  const lowSleep = typeof sleep === 'number' && Number.isFinite(sleep) && sleep < 6.5;
  const lowWater = typeof water === 'number' && Number.isFinite(water) && water < 1.8;

  const detectedIssues = concernsList.map((c) => CONCERN_LABELS[c] || c);
  if (lowSleep) detectedIssues.push('Under-eye fatigue risk (low recent sleep)');
  if (lowWater) detectedIssues.push('Below-target daily hydration (habit data)');

  const sleepScore =
    typeof sleep === 'number' && Number.isFinite(sleep)
      ? Math.min(100, Math.max(0, (sleep / 8) * 100))
      : 72;
  const waterScore =
    typeof water === 'number' && Number.isFinite(water)
      ? Math.min(100, Math.max(0, (water / 3) * 100))
      : 72;

  const concernPenalty = Math.min(45, concernsList.length * 9);
  const concernScore = Math.max(38, 100 - concernPenalty);
  const stressPenalty = (lowSleep ? 7 : 0) + (lowWater ? 5 : 0);

  const raw = sleepScore * 0.38 + waterScore * 0.37 + concernScore * 0.25 - stressPenalty;
  const skinHealthScore = Math.round(Math.min(100, Math.max(0, raw)));

  let routineLevel = 'moderate';
  if (concernsList.length <= 1 && !lowSleep && !lowWater && skinType !== 'sensitive') {
    routineLevel = 'basic';
  }
  if (
    concernsList.length >= 3 ||
    (concernsList.includes('aging') && concernsList.length >= 2) ||
    (skinType === 'sensitive' && concernsList.length >= 2)
  ) {
    routineLevel = 'advanced';
  }

  const timeline = {
    basic: '2–4 weeks',
    moderate: '4–8 weeks',
    advanced: '8–12 weeks',
  };
  const expectedImprovement = timeline[routineLevel];

  const lifestyleBoosts = { underEyeCare: [], hydrationSuggestions: [] };

  if (lowSleep) {
    lifestyleBoosts.underEyeCare.push(
      'Use a gentle caffeine or peptide eye product in the morning; pat with your ring finger—do not rub.',
      'When sleep is low, keep the eye area simple: one eye product plus sunscreen, avoid strong actives there.',
      'Aim for more consistent rest (7–9h when possible); under-eye appearance often tracks with recovery.'
    );
  }

  if (lowWater) {
    lifestyleBoosts.hydrationSuggestions.push(
      'Your 7-day water average is under ~1.8 L—sip steadily through the day rather than chugging once.',
      'Apply humectants (e.g. hyaluronic acid) to slightly damp skin, then seal with moisturizer.',
      'Pair skincare with habit change: limit very long hot showers and harsh soaps while you rebuild intake.'
    );
  }

  return {
    skinHealthScore,
    detectedIssues,
    routineLevel,
    expectedImprovement,
    lifestyleBoosts,
  };
}

module.exports = { buildSkincareMeta };
