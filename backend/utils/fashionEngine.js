function norm(value, allowed, fallback) {
  const v = String(value || '').toLowerCase().trim();
  return allowed.includes(v) ? v : fallback;
}

function buildFashionRecommendation({ occasion, time, weather, style }) {
  const occ = norm(occasion, ['formal', 'party', 'date', 'casual', 'meeting'], 'casual');
  const t = norm(time, ['day', 'night'], 'day');
  const w = norm(weather, ['hot', 'cold', 'moderate', 'rainy'], 'moderate');
  const s = norm(style, ['casual', 'formal', 'streetwear'], 'casual');

  const outfit = [];
  const fabrics = [];
  const tips = [];

  // Occasion base
  if (occ === 'formal') {
    outfit.push('crisp shirt', 'tailored trousers', 'structured blazer');
    tips.push('Keep the fit clean at shoulders and waist for a sharper silhouette.');
  } else if (occ === 'meeting') {
    outfit.push('smart shirt or knit polo', 'chinos or tailored trousers', 'light blazer (optional)');
    tips.push('Choose one “quiet statement” piece: a watch, clean shoes, or a subtle jacket texture.');
  } else if (occ === 'party') {
    outfit.push('statement top (texture or bold color)', 'dark trousers or jeans', 'clean sneakers or boots');
    tips.push('One bold item is enough—balance the rest with neutrals.');
  } else if (occ === 'date') {
    outfit.push('well-fitted tee or shirt', 'dark jeans or chinos', 'minimal sneakers or loafers');
    tips.push('Keep it “intentional casual”: clean shoes, good fit, and one accent color.');
  } else {
    outfit.push('relaxed tee or overshirt', 'jeans or joggers', 'sneakers');
    tips.push('Add one layer (overshirt/hoodie) to look styled without trying too hard.');
  }

  // Style rules
  if (s === 'formal') {
    tips.push('Prefer structured pieces: collars, blazers, trousers, clean lines.');
  } else if (s === 'streetwear') {
    tips.push('Use one oversized element and keep the rest fitted to avoid looking bulky.');
    outfit.push('optional: bomber jacket or oversized overshirt');
  } else {
    tips.push('Stick to simple staples and let fit do the work.');
  }

  // Time rules (color direction)
  let colorCombo = '';
  if (t === 'day') {
    colorCombo = 'light top + dark bottom (or neutrals like beige/white/charcoal)';
    tips.push('Daytime: lighter shades feel fresh and intentional.');
  } else {
    colorCombo = 'dark top + dark/neutral bottom (black/charcoal/navy) with one subtle accent';
    tips.push('Night: darker tones look sharper and photograph better.');
  }

  // Weather rules
  if (w === 'hot') {
    fabrics.push('cotton', 'linen', 'lightweight blends');
    tips.push('Hot weather: prioritize breathable fabrics and avoid heavy layering.');
    outfit.push('optional: linen shirt or lightweight tee');
  } else if (w === 'cold') {
    fabrics.push('wool', 'denim', 'knits', 'fleece');
    tips.push('Cold weather: build with layers (base + mid + outer).');
    outfit.push('layer: knit sweater or hoodie', 'outer: coat or puffer');
  } else if (w === 'rainy') {
    fabrics.push('quick-dry blends', 'cotton', 'water-resistant outer');
    tips.push('Rainy weather: water-friendly shoes and a compact umbrella help.');
    outfit.push('waterproof jacket or trench', 'dark bottoms (fewer water marks)');
  } else {
    fabrics.push('cotton', 'denim', 'light knit');
    tips.push('Moderate weather: light layering keeps you comfortable and styled.');
    outfit.push('layer: light jacket or overshirt');
  }

  // Color matching safety
  tips.push('Neutral colors (black, white, grey, navy, beige) are always safe.');
  tips.push('Avoid mixing too many bright colors—use 1 bright accent max.');

  return {
    inputs: { occasion: occ, time: t, weather: w, style: s },
    outfitSuggestion: Array.from(new Set(outfit)),
    colorCombination: colorCombo,
    fabricSuggestion: Array.from(new Set(fabrics)),
    stylingTip: Array.from(new Set(tips)).slice(0, 6), // keep readable
  };
}

module.exports = { buildFashionRecommendation };

