function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function normalizeSkinType(value) {
  const v = String(value || '').toLowerCase().trim();
  const allowed = ['oily', 'dry', 'combination', 'sensitive'];
  return allowed.includes(v) ? v : 'combination';
}

function normalizeConcerns(concerns) {
  const allowed = ['acne', 'pigmentation', 'dullness', 'aging', 'dryness'];
  const list = Array.isArray(concerns) ? concerns : concerns ? [concerns] : [];
  return uniq(list.map((c) => String(c).toLowerCase().trim()).filter((c) => allowed.includes(c)));
}

function lifestyleFlags(lifestyle) {
  const sleep = typeof lifestyle?.sleep_hours === 'number' ? lifestyle.sleep_hours : null;
  const water = typeof lifestyle?.water_intake === 'number' ? lifestyle.water_intake : null;

  return {
    lowSleep: sleep !== null && sleep < 6.5,
    lowHydration: water !== null && water < 1.8,
  };
}

function buildSkinCareRecommendation({ skin_type, concerns, lifestyle }) {
  const skinType = normalizeSkinType(skin_type);
  const concernsList = normalizeConcerns(concerns);
  const flags = lifestyleFlags(lifestyle);

  const safetyTips = [];
  const morning = {
    cleanser: [],
    serum: [],
    moisturizer: [],
    sunscreen: [],
  };
  const night = {
    cleanser: [],
    treatment: [],
    moisturizer: [],
  };

  // Base: cleanser + moisturizer + sunscreen
  if (skinType === 'oily') {
    morning.cleanser.push('oil-control gentle cleanser');
    night.cleanser.push('gentle foaming cleanser');
    morning.moisturizer.push('lightweight gel moisturizer');
    night.moisturizer.push('lightweight gel moisturizer');
  } else if (skinType === 'dry') {
    morning.cleanser.push('hydrating cream cleanser');
    night.cleanser.push('hydrating cream cleanser');
    morning.moisturizer.push('rich barrier-repair moisturizer');
    night.moisturizer.push('rich barrier-repair moisturizer');
  } else if (skinType === 'sensitive') {
    morning.cleanser.push('fragrance-free gentle cleanser');
    night.cleanser.push('fragrance-free gentle cleanser');
    morning.moisturizer.push('soothing ceramide moisturizer');
    night.moisturizer.push('soothing ceramide moisturizer');
    safetyTips.push('Patch test new products and introduce one product at a time.');
    safetyTips.push('Avoid strong fragrance and harsh scrubs.');
  } else {
    // combination default
    morning.cleanser.push('balanced gentle cleanser');
    night.cleanser.push('balanced gentle cleanser');
    morning.moisturizer.push('light moisturizer (gel-cream)');
    night.moisturizer.push('light moisturizer (gel-cream)');
  }

  morning.sunscreen.push('broad-spectrum sunscreen SPF 50 (mandatory)');

  // Concern rules (multiple concerns supported)
  const has = (c) => concernsList.includes(c);

  if (has('acne')) {
    morning.cleanser.push('salicylic acid cleanser (if tolerated)');
    morning.serum.push('niacinamide serum');
    night.treatment.push('benzoyl peroxide spot treatment (optional)');
    safetyTips.push('If dryness/irritation happens, use salicylic acid fewer days per week.');
  }

  if (has('pigmentation')) {
    morning.serum.push('vitamin C serum (morning)');
    // Sunscreen already added, but emphasize it
    safetyTips.push('Sunscreen is non-negotiable for pigmentation improvement.');
  }

  if (has('dullness')) {
    morning.serum.push('antioxidant serum (vitamin C or niacinamide)');
    night.treatment.push('gentle exfoliant (AHA) 1–2 nights/week');
  }

  // Advanced conflict handling: retinol + strong acids in same night
  let wantsRetinol = false;
  if (has('aging')) {
    wantsRetinol = true;
    safetyTips.push('Retinol: night only, start 2–3 nights/week and build up slowly.');
    safetyTips.push('Do not combine retinol with strong acids in the same night.');
  }

  // Dryness concern can be both a skin type and a concern.
  if (has('dryness')) {
    morning.serum.push('hyaluronic acid serum');
    night.treatment.push('hydrating serum (hyaluronic acid / glycerin)');
    safetyTips.push('Apply hydrating serum on damp skin, then moisturize to lock it in.');
  }

  // Lifestyle influence
  if (flags.lowSleep) {
    morning.serum.push('caffeine or peptide eye serum (tap under eyes, AM)');
    night.treatment.push('gentle eye cream or ceramide eye balm (PM, under-eye area)');
    night.treatment.push('calming / barrier support serum (panthenol or centella)');
    safetyTips.push('Low sleep can increase sensitivity—keep tonight routine gentle.');
  }

  if (flags.lowHydration) {
    morning.serum.push('hydration-focused serum (hyaluronic acid)');
    morning.moisturizer.push('layer moisturizer on slightly damp skin to lock in water');
    night.moisturizer.push('occlusive layer (thin petrolatum on dry areas, optional)');
    safetyTips.push('Low hydration: prioritize drinking water and moisturizing consistently.');
  }

  // Conflict resolution: if retinol is desired and AHA exfoliant was added, separate nights.
  const nightTreatments = uniq(night.treatment);
  const hasAha = nightTreatments.some((t) => t.toLowerCase().includes('aha'));

  if (wantsRetinol) {
    if (hasAha) {
      night.treatment = [
        'retinol treatment (alternate nights)',
        'gentle exfoliant (AHA) 1–2 nights/week (not on retinol nights)',
      ];
    } else {
      night.treatment = ['retinol treatment (night only)'].concat(nightTreatments);
      night.treatment = uniq(night.treatment);
    }
  } else {
    night.treatment = nightTreatments;
  }

  // Final cleanup (unique, readable)
  morning.cleanser = uniq(morning.cleanser);
  morning.serum = uniq(morning.serum);
  morning.moisturizer = uniq(morning.moisturizer);
  morning.sunscreen = uniq(morning.sunscreen);

  night.cleanser = uniq(night.cleanser);
  night.moisturizer = uniq(night.moisturizer);
  safetyTips.push('Use sunscreen daily, especially when using vitamin C, acids, or retinol.');
  safetyTips.push('If irritation occurs, reduce actives and focus on cleanser + moisturizer + sunscreen.');

  return {
    inputs: { skin_type: skinType, concerns: concernsList, lifestyle: lifestyle || {} },
    morningRoutine: morning,
    nightRoutine: night,
    safetyTips: uniq(safetyTips),
  };
}

module.exports = {
  buildSkinCareRecommendation,
  normalizeConcerns,
  normalizeSkinType,
};

