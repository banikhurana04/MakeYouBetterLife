/**
 * Smart insights from the last 7 days of habits (averages + simple trends).
 * @param {{
 *   averages?: { sleep?: number|null, water?: number|null, exercise?: number|null },
 *   trends?: {
 *     sleep?: { direction: string, changePercent: number },
 *     water?: { direction: string, changePercent: number },
 *     exercise?: { direction: string, changePercent: number },
 *   },
 *   series?: {
 *     sleep?: Array<number|null|undefined>,
 *     water?: Array<number|null|undefined>,
 *     exercise?: Array<number|null|undefined>,
 *   },
 * }} ctx
 * @returns {string[]}
 */
function numericSeries(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter((v) => typeof v === 'number' && Number.isFinite(v));
}

function generateInsights(ctx) {
  const insights = [];
  if (!ctx || typeof ctx !== 'object') return insights;

  const averages = ctx.averages || {};
  const series = ctx.series || {};

  const sleepAvg = averages.sleep;
  const waterAvg = averages.water;
  const exerciseAvg = averages.exercise;

  const sleepVals = numericSeries(series.sleep);
  const waterVals = numericSeries(series.water);
  const exerciseVals = numericSeries(series.exercise);

  // Week-over-week trend lines are supplied by healthDataset (dashboard merge); keep consistency + levels here.

  // --- Consistency: sleep mostly low across logged days ---
  if (sleepVals.length >= 2) {
    const lowNights = sleepVals.filter((h) => h < 6.5).length;
    const mostlyLow = lowNights / sleepVals.length >= 0.5;
    const avgLow = typeof sleepAvg === 'number' && Number.isFinite(sleepAvg) && sleepAvg < 6.5;
    if (mostlyLow && avgLow) {
      insights.push('Your sleep has been consistently low this week');
    }
  }

  // --- Level-based tips (when averages are meaningful) ---
  if (typeof sleepAvg === 'number' && Number.isFinite(sleepAvg) && sleepAvg < 6 && sleepVals.length >= 1) {
    const already = insights.some((s) => s.includes('sleep') && s.includes('low'));
    if (!already) {
      insights.push('Low sleep may affect your energy and skin');
    }
  }

  if (typeof waterAvg === 'number' && Number.isFinite(waterAvg) && waterAvg < 2 && waterVals.length >= 1) {
    insights.push('Increase water intake for better health');
  }

  if (
    typeof exerciseAvg === 'number' &&
    Number.isFinite(exerciseAvg) &&
    exerciseAvg < 20 &&
    exerciseVals.length >= 1
  ) {
    const alreadyImproving = insights.some((s) => s.includes('activity level is improving'));
    if (!alreadyImproving) {
      insights.push('Try to include more physical activity');
    }
  }

  // De-duplicate while preserving order
  return [...new Set(insights)];
}

module.exports = { generateInsights };
