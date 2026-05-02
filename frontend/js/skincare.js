// skincare.js — authenticated skincare routine page

(function () {
  const token = window.life3600Api.getToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  const topUserNameEl = document.getElementById('top-user-name');
  const logoutBtn = document.getElementById('logout-btn');
  const skincareForm = document.getElementById('skincare-form');
  const skincareResultEl = document.getElementById('skincare-result');
  const skinTypeEl = document.getElementById('skin-type');

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function list(items) {
    return items && items.length
      ? `<ul class="mt-2 space-y-1">${items.map((x) => `<li class="text-slate-200">• ${escapeHtml(x)}</li>`).join('')}</ul>`
      : `<div class="text-slate-400 mt-2">—</div>`;
  }

  function resultCard({ title, subtitle, borderClass, bodyHtml }) {
    return `
      <section class="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-700/50 border-l-4 ${borderClass}">
        <h3 class="text-white font-semibold text-base">${escapeHtml(title)}</h3>
        ${subtitle ? `<p class="text-slate-500 text-xs mt-1">${escapeHtml(subtitle)}</p>` : ''}
        <div class="mt-3">${bodyHtml}</div>
      </section>
    `;
  }

  function routineLevelBadge(level) {
    const l = String(level || 'moderate').toLowerCase();
    const map = {
      basic: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/35',
      moderate: 'bg-violet-500/15 text-violet-200 border-violet-500/35',
      advanced: 'bg-rose-500/15 text-rose-200 border-rose-500/35',
    };
    const cls = map[l] || map.moderate;
    return `<span class="inline-block mt-2 px-3 py-1 rounded-lg text-sm font-semibold capitalize border ${cls}">${escapeHtml(l)}</span>`;
  }

  function habitCategoryBadge(category) {
    const c = String(category || 'Insufficient data');
    const map = {
      Healthy: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/35',
      Moderate: 'bg-amber-500/15 text-amber-200 border-amber-500/35',
      'Needs Improvement': 'bg-rose-500/15 text-rose-200 border-rose-500/35',
      'Insufficient data': 'bg-slate-500/15 text-slate-300 border-slate-500/35',
    };
    const cls = map[c] || map['Insufficient data'];
    return `<span class="inline-block px-3 py-1 rounded-lg text-sm font-semibold border ${cls}">${escapeHtml(c)}</span>`;
  }

  function renderSkincareResults(data) {
    const rec = data.recommendation;
    const lifestyle = data.lifestyle || {};
    const meta = data.meta || {};

    const sleepVal = lifestyle.avg_sleep_last_7_days ?? lifestyle.sleep_hours;
    const waterVal = lifestyle.avg_water_intake ?? lifestyle.water_intake;
    const lifestyleLine = `Sleep (7d avg): ${sleepVal != null ? `${sleepVal}h` : '—'} · Water (7d avg): ${
      waterVal != null ? `${waterVal} L` : '—'
    }`;

    const score =
      typeof meta.skinHealthScore === 'number' && Number.isFinite(meta.skinHealthScore)
        ? Math.round(meta.skinHealthScore)
        : null;
    const issues = Array.isArray(meta.detectedIssues) ? meta.detectedIssues : [];
    const boosts = meta.lifestyleBoosts || {};
    const underEye = Array.isArray(boosts.underEyeCare) ? boosts.underEyeCare : [];
    const hydrationTips = Array.isArray(boosts.hydrationSuggestions) ? boosts.hydrationSuggestions : [];

    const scoreBody =
      score !== null
        ? `<div class="flex items-end gap-2">
             <span class="text-white text-4xl sm:text-5xl font-bold tabular-nums">${score}</span>
             <span class="text-slate-400 text-sm pb-1">/ 100</span>
           </div>
           <p class="text-slate-400 text-xs mt-2">Weighted from sleep, water, and selected concerns (rule-based estimate).</p>`
        : `<p class="text-slate-400 text-sm">Score unavailable—log a few days of habits for a fuller read.</p>`;

    const issuesBody =
      issues.length > 0
        ? `<ul class="space-y-2 text-sm text-slate-200">${issues
            .map((t) => `<li class="flex gap-2"><span class="text-pink-300 shrink-0">▸</span><span>${escapeHtml(t)}</span></li>`)
            .join('')}</ul>`
        : `<p class="text-slate-400 text-sm">No major flags from your selections and recent habits. Keep up steady routines.</p>`;

    const levelBody = `
      ${routineLevelBadge(meta.routineLevel)}
      <p class="text-slate-400 text-sm mt-3">More concerns or sensitive skin raises the routine tier (basic → moderate → advanced).</p>
    `;

    const timelineBody = `<p class="text-white text-lg font-semibold">${escapeHtml(meta.expectedImprovement || '4–8 weeks')}</p>
      <p class="text-slate-400 text-xs mt-2">Typical range for visible routine benefits—individual results vary.</p>`;

    let lifestyleCards = '';
    if (underEye.length > 0) {
      lifestyleCards += resultCard({
        title: 'Under-eye care (low sleep signal)',
        subtitle: 'Based on your 7-day sleep average',
        borderClass: 'border-l-indigo-500/60',
        bodyHtml: list(underEye),
      });
    }
    if (hydrationTips.length > 0) {
      lifestyleCards += resultCard({
        title: 'Hydration focus (low water signal)',
        subtitle: 'Based on your 7-day water average',
        borderClass: 'border-l-sky-500/60',
        bodyHtml: list(hydrationTips),
      });
    }

    const hh = meta.habitHealth || null;
    let habitDatasetSection = '';
    if (hh) {
      const ideals = hh.ideals || {};
      const sc = hh.scores || {};
      const tr = hh.trends || {};
      const trendLines = [tr.sleep?.summary, tr.water?.summary, tr.exercise?.summary].filter(Boolean);
      const hi = Array.isArray(hh.insights) ? hh.insights : [];
      const hs =
        typeof hh.healthScore === 'number' && Number.isFinite(hh.healthScore) ? Math.round(hh.healthScore) : null;

      const componentsHtml = `
        <div class="grid grid-cols-3 gap-3 mt-4 text-center">
          <div class="rounded-xl bg-slate-950/40 border border-slate-700/50 px-2 py-3">
            <div class="text-slate-500 text-xs">Sleep</div>
            <div class="text-white text-lg font-bold tabular-nums">${sc.sleepScore != null ? escapeHtml(String(sc.sleepScore)) : '—'}</div>
            <div class="text-slate-500 text-[10px] mt-0.5">vs ${ideals.sleepHours ?? 8}h</div>
          </div>
          <div class="rounded-xl bg-slate-950/40 border border-slate-700/50 px-2 py-3">
            <div class="text-slate-500 text-xs">Water</div>
            <div class="text-white text-lg font-bold tabular-nums">${sc.waterScore != null ? escapeHtml(String(sc.waterScore)) : '—'}</div>
            <div class="text-slate-500 text-[10px] mt-0.5">vs ${ideals.waterLitres ?? 3}L</div>
          </div>
          <div class="rounded-xl bg-slate-950/40 border border-slate-700/50 px-2 py-3">
            <div class="text-slate-500 text-xs">Exercise</div>
            <div class="text-white text-lg font-bold tabular-nums">${sc.exerciseScore != null ? escapeHtml(String(sc.exerciseScore)) : '—'}</div>
            <div class="text-slate-500 text-[10px] mt-0.5">vs ${ideals.exerciseMinutes ?? 30}m</div>
          </div>
        </div>
      `;

      const trendsBlock =
        trendLines.length > 0
          ? `<div class="mt-4"><p class="text-slate-500 text-xs uppercase tracking-wide mb-2">7-day trends</p><ul class="space-y-1.5 text-sm text-slate-200">${trendLines
              .map((t) => `<li class="flex gap-2"><span class="text-cyan-300 shrink-0">↳</span><span>${escapeHtml(t)}</span></li>`)
              .join('')}</ul></div>`
          : '';

      const insightsBlock =
        hi.length > 0
          ? `<div class="mt-4"><p class="text-slate-500 text-xs uppercase tracking-wide mb-2">Dataset insights</p><ul class="space-y-1.5 text-sm text-slate-200">${hi
              .map((t) => `<li class="flex gap-2"><span class="text-violet-300 shrink-0">•</span><span>${escapeHtml(t)}</span></li>`)
              .join('')}</ul></div>`
          : '';

      const headline =
        hs !== null
          ? `<div class="flex flex-wrap items-end gap-3">
               <span class="text-white text-3xl font-bold tabular-nums">${hs}</span>
               <span class="text-slate-400 text-sm pb-1">combined health score</span>
             </div>`
          : `<p class="text-slate-400 text-sm">Log sleep, water, and exercise to unlock a combined habit score.</p>`;

      habitDatasetSection = `<div class="mb-4">
        ${resultCard({
          title: 'Habit health (dataset)',
          subtitle: 'Rule-based scores vs ideals; feeds skincare context',
          borderClass: 'border-l-cyan-500/55',
          bodyHtml: `
            ${headline}
            <div class="mt-3 flex flex-wrap items-center gap-2">${habitCategoryBadge(hh.category)}</div>
            ${componentsHtml}
            ${trendsBlock}
            ${insightsBlock}
          `,
        })}
      </div>`;
    }

    const topGrid = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        ${resultCard({
          title: 'Skin health score',
          subtitle: '0–100 estimate',
          borderClass: 'border-l-fuchsia-500/60',
          bodyHtml: scoreBody,
        })}
        ${resultCard({
          title: 'Routine level',
          subtitle: 'Complexity of your plan',
          borderClass: 'border-l-purple-500/60',
          bodyHtml: levelBody,
        })}
        ${resultCard({
          title: 'Expected improvement',
          subtitle: 'Rule-based timeline',
          borderClass: 'border-l-pink-500/60',
          bodyHtml: timelineBody,
        })}
        ${resultCard({
          title: 'Detected issues',
          subtitle: 'Concerns + habit signals',
          borderClass: 'border-l-rose-500/55',
          bodyHtml: issuesBody,
        })}
      </div>
    `;

    const lifestyleRow =
      lifestyleCards !== ''
        ? `<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">${lifestyleCards}</div>`
        : '';

    return `
      ${habitDatasetSection}
      ${topGrid}
      ${lifestyleRow}

      <div class="mt-6 glass-panel rounded-2xl p-5 border border-slate-700/50">
        <p class="text-slate-400 text-xs uppercase tracking-wide">Lifestyle snapshot</p>
        <p class="text-slate-200 text-sm mt-1">${escapeHtml(lifestyleLine)}</p>
        ${
          data.reason
            ? `<p class="text-slate-300 text-sm mt-4 leading-relaxed border-t border-slate-700/50 pt-4">${escapeHtml(data.reason)}</p>`
            : ''
        }
      </div>

      <h3 class="text-white font-bold text-lg mt-8 mb-3">Your routine steps</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${resultCard({
          title: 'Morning',
          subtitle: 'Cleanser → serum → moisturizer → SPF',
          borderClass: 'border-l-amber-500/50',
          bodyHtml: `
            <div class="text-slate-300 text-sm space-y-3">
              <div><span class="text-slate-500 text-xs block">Cleanser</span>${list(rec.morningRoutine.cleanser)}</div>
              <div><span class="text-slate-500 text-xs block">Serum</span>${list(rec.morningRoutine.serum)}</div>
              <div><span class="text-slate-500 text-xs block">Moisturizer</span>${list(rec.morningRoutine.moisturizer)}</div>
              <div><span class="text-slate-500 text-xs block">Sunscreen</span>${list(rec.morningRoutine.sunscreen)}</div>
            </div>
          `,
        })}
        ${resultCard({
          title: 'Night',
          subtitle: 'Cleanse → treat → moisturize',
          borderClass: 'border-l-violet-500/50',
          bodyHtml: `
            <div class="text-slate-300 text-sm space-y-3">
              <div><span class="text-slate-500 text-xs block">Cleanser</span>${list(rec.nightRoutine.cleanser)}</div>
              <div><span class="text-slate-500 text-xs block">Treatment</span>${list(rec.nightRoutine.treatment)}</div>
              <div><span class="text-slate-500 text-xs block">Moisturizer</span>${list(rec.nightRoutine.moisturizer)}</div>
            </div>
          `,
        })}
      </div>

      <div class="mt-4">
        ${resultCard({
          title: 'Safety tips',
          subtitle: 'Patch tests & actives',
          borderClass: 'border-l-slate-500/60',
          bodyHtml: list(rec.safetyTips),
        })}
      </div>
    `;
  }

  async function loadProfile() {
    const profile = await window.life3600Api.apiRequest('/get-profile', { method: 'GET' });
    if (topUserNameEl) topUserNameEl.textContent = profile.name || '';
    return profile;
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.life3600Api.setToken(null);
      window.location.href = '/login.html';
    });
  }

  if (skincareForm && skincareResultEl) {
    skincareForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      skincareResultEl.innerHTML = '<div class="text-slate-400 py-4">Generating routine…</div>';

      const concerns = Array.from(skincareForm.querySelectorAll('input[type="checkbox"]:checked')).map((i) => i.value);
      const skin_type = skinTypeEl ? skinTypeEl.value : '';

      try {
        const data = await window.life3600Api.apiRequest('/recommendations/skincare', {
          method: 'POST',
          body: JSON.stringify({
            skin_type: skin_type || undefined,
            concerns,
          }),
        });

        skincareResultEl.innerHTML = `<div class="space-y-2">${renderSkincareResults(data)}</div>`;
      } catch (err) {
        skincareResultEl.innerHTML = `<div class="message error">${escapeHtml(err.message || 'Failed to generate routine.')}</div>`;
      }
    });
  }

  loadProfile().catch(() => {
    window.life3600Api.setToken(null);
    window.location.href = '/login.html';
  });
})();
