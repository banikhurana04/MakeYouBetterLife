// dashboard.js - dashboard UI logic (fetch, render, charts, and habit logging)

(function () {
  const token = window.life3600Api.getToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  const userNameEl = document.getElementById('user-name');
  const topUserNameEl = document.getElementById('top-user-name');

  const statTotalEl = document.getElementById('stat-total-habits');
  const statCompletedEl = document.getElementById('stat-completed-today');
  const statStreakEl = document.getElementById('stat-streak');

  const prefGoalEl = document.getElementById('pref-goal');
  const prefSkinEl = document.getElementById('pref-skin');
  const prefStyleEl = document.getElementById('pref-style');

  const habitForm = document.getElementById('habit-form');
  const habitMessageEl = document.getElementById('habit-message');
  const habitSubmitBtn = document.getElementById('habit-submit-btn');

  const habitDateEl = document.getElementById('habit-date');
  const sleepHoursEl = document.getElementById('sleep-hours');
  const waterIntakeEl = document.getElementById('water-intake');
  const mealsEl = document.getElementById('meals');
  const exerciseMinutesEl = document.getElementById('exercise-minutes');

  const habitListEl = document.getElementById('habit-list');
  const toggleHistoryBtn = document.getElementById('toggle-history-btn');
  const historyRangeEl = document.getElementById('history-range');
  const logsSubtitleEl = document.getElementById('logs-subtitle');

  const avgSleepEl = document.getElementById('avg-sleep');
  const avgWaterEl = document.getElementById('avg-water');
  const activityScoreEl = document.getElementById('activity-score');
  const insightsContainerEl = document.getElementById('insights-container');

  const weeklyCanvas = document.getElementById('weeklyChart');
  const monthlyCanvas = document.getElementById('monthlyChart');

  const logoutBtn = document.getElementById('logout-btn');
  const toastStackEl = document.getElementById('toast-stack');

  const TOAST_AUTO_HIDE_MS = 4800;

  /** Same numeric gating as backend/utils/insights.js level-based tips (7-day window). */
  function numericWeekSeries(arr) {
    return (Array.isArray(arr) ? arr : []).filter((v) => typeof v === 'number' && Number.isFinite(v));
  }

  function avgOfSeries(arr) {
    const nums = numericWeekSeries(arr);
    if (nums.length === 0) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  /**
   * @param {object} dashboardData full /dashboard-data response
   * @returns {string[]} fixed user-facing messages (order: sleep, water, exercise)
   */
  function habitToastMessagesFromInsightsContext(dashboardData) {
    const habits = dashboardData.habits || dashboardData;
    if (!habits || typeof habits !== 'object') return [];

    const weekly = habits.weeklyTrends || {};
    const av = habits.averages || {};

    const sleepVals = numericWeekSeries(weekly.sleep_hours);
    const waterVals = numericWeekSeries(weekly.water_intake);
    const exerciseVals = numericWeekSeries(weekly.exercise_minutes);

    const sleepAvg =
      typeof av.avgSleepHoursLast7Days === 'number' && Number.isFinite(av.avgSleepHoursLast7Days)
        ? av.avgSleepHoursLast7Days
        : typeof av.avg_sleep_last_7_days === 'number' && Number.isFinite(av.avg_sleep_last_7_days)
          ? av.avg_sleep_last_7_days
          : null;

    const waterAvg =
      typeof av.avgWaterIntakeLast7Days === 'number' && Number.isFinite(av.avgWaterIntakeLast7Days)
        ? av.avgWaterIntakeLast7Days
        : typeof av.avg_water_intake === 'number' && Number.isFinite(av.avg_water_intake)
          ? av.avg_water_intake
          : null;

    const exerciseAvgFromApi =
      typeof av.avgExerciseMinutesLast7Days === 'number' && Number.isFinite(av.avgExerciseMinutesLast7Days)
        ? av.avgExerciseMinutesLast7Days
        : typeof av.avg_exercise_minutes_last_7_days === 'number' && Number.isFinite(av.avg_exercise_minutes_last_7_days)
          ? av.avg_exercise_minutes_last_7_days
          : null;

    const exerciseAvg = exerciseAvgFromApi !== null ? exerciseAvgFromApi : avgOfSeries(weekly.exercise_minutes);

    const messages = [];

    if (sleepVals.length >= 1 && sleepAvg !== null && sleepAvg < 6) {
      messages.push('Low sleep detected');
    }
    if (waterVals.length >= 1 && waterAvg !== null && waterAvg < 2) {
      messages.push('Drink more water');
    }
    if (exerciseVals.length >= 1 && exerciseAvg !== null && exerciseAvg < 20) {
      messages.push('Increase activity');
    }

    return messages;
  }

  function showToast(message) {
    if (!toastStackEl || !message) return;

    const el = document.createElement('div');
    el.className = 'toast-item';
    el.setAttribute('role', 'status');
    el.textContent = message;
    toastStackEl.appendChild(el);

    window.setTimeout(() => {
      el.remove();
    }, TOAST_AUTO_HIDE_MS);
  }

  function showHabitInsightToasts(dashboardData) {
    const fromDataset = dashboardData.healthDataset?.notifications;
    const msgs =
      Array.isArray(fromDataset) && fromDataset.length > 0
        ? fromDataset
        : habitToastMessagesFromInsightsContext(dashboardData);
    msgs.forEach((m) => showToast(m));
  }

  function toLocalISODate(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const todayLocalISO = toLocalISODate(new Date());

  habitDateEl.value = habitDateEl.value || todayLocalISO;

  let editingHabitId = null;
  let currentHabits = [];
  let weeklyChart = null;
  let monthlyChart = null;
  let isHistoryMode = false;

  function showMessage(type, text) {
    if (!habitMessageEl) return;
    habitMessageEl.className = `message mt-4 ${type}`;
    habitMessageEl.textContent = text || '';
    habitMessageEl.classList.remove('hidden');
  }

  function hideMessage() {
    if (!habitMessageEl) return;
    habitMessageEl.classList.add('hidden');
    habitMessageEl.textContent = '';
  }

  function numOrNull(value) {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  }

  function setFormFromHabit(h) {
    editingHabitId = h._id;

    habitDateEl.value = h.date ? toLocalISODate(h.date) : todayLocalISO;
    sleepHoursEl.value = h.sleep_hours ?? '';
    waterIntakeEl.value = h.water_intake ?? '';
    mealsEl.value = h.meals ?? '';
    exerciseMinutesEl.value = h.exercise_minutes ?? '';

    habitSubmitBtn.textContent = 'Update entry';
    hideMessage();
  }

  function clearFormMode() {
    editingHabitId = null;
    habitSubmitBtn.textContent = 'Save entry';
    sleepHoursEl.value = '';
    waterIntakeEl.value = '';
    mealsEl.value = '';
    exerciseMinutesEl.value = '';
    habitDateEl.value = todayLocalISO;
    hideMessage();
  }

  function renderHabitCard(habit) {
    const card = document.createElement('div');
    card.className = 'glass-panel rounded-2xl p-5 border border-slate-700/50';

    const dateText = habit.date ? new Date(habit.date).toLocaleDateString() : '';
    const sleepText = habit.sleep_hours === null || habit.sleep_hours === undefined ? '—' : habit.sleep_hours;
    const waterText = habit.water_intake === null || habit.water_intake === undefined ? '—' : habit.water_intake;
    const mealsText = habit.meals === null || habit.meals === undefined ? '—' : habit.meals;
    const exerciseText =
      habit.exercise_minutes === null || habit.exercise_minutes === undefined ? '—' : habit.exercise_minutes;

    card.innerHTML = `
        <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-white text-lg font-bold">${dateText}</div>
          <div class="text-slate-400 text-sm mt-1">Sleep · Water · Meals · Exercise</div>
        </div>
        <button class="px-4 py-2 rounded-xl border border-slate-700/60 text-slate-200 hover:text-white transition-all bg-slate-950/20 shadow-glow"
          type="button"
          data-edit-id="${habit._id}"
        >
          Edit
        </button>
      </div>

      <div class="grid grid-cols-12 gap-3 mt-4">
        <div class="col-span-6">
          <div class="text-slate-500 text-xs">Sleep</div>
          <div class="text-white text-2xl font-semibold mt-1">${sleepText}</div>
          <div class="text-slate-400 text-xs mt-1">hours</div>
        </div>
        <div class="col-span-6">
          <div class="text-slate-500 text-xs">Water</div>
          <div class="text-white text-2xl font-semibold mt-1">${waterText}</div>
          <div class="text-slate-400 text-xs mt-1">cups</div>
        </div>

        <div class="col-span-6">
          <div class="text-slate-500 text-xs">Meals</div>
          <div class="text-white text-2xl font-semibold mt-1">${mealsText}</div>
          <div class="text-slate-400 text-xs mt-1">count</div>
        </div>
        <div class="col-span-6">
          <div class="text-slate-500 text-xs">Exercise</div>
          <div class="text-white text-2xl font-semibold mt-1">${exerciseText}</div>
          <div class="text-slate-400 text-xs mt-1">minutes</div>
        </div>
      </div>
    `;

    card.querySelector('[data-edit-id]').addEventListener('click', () => {
      setFormFromHabit(habit);
    });

    return card;
  }

  async function loadProfile() {
    const profile = await window.life3600Api.apiRequest('/get-profile', { method: 'GET' });
    if (userNameEl) userNameEl.textContent = profile.name || '';
    if (topUserNameEl) topUserNameEl.textContent = profile.name || '';

    if (prefGoalEl) prefGoalEl.textContent = profile.lifestyle_goal || '—';
    if (prefSkinEl) prefSkinEl.textContent = profile.skin_type || '—';
    if (prefStyleEl) prefStyleEl.textContent = profile.fashion_style || '—';

    return profile;
  }

  function weekDayLabels(labels) {
    return labels.map((l) => l.replace(',', ''));
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function renderInsights(insights) {
    if (!insightsContainerEl) return;

    const items = Array.isArray(insights) ? insights.filter((s) => typeof s === 'string' && s.trim()) : [];

    if (items.length === 0) {
      insightsContainerEl.innerHTML =
        '<p class="text-slate-400 text-sm leading-relaxed">You are on track — no specific tips for this week.</p>';
      insightsContainerEl.removeAttribute('role');
      return;
    }

    insightsContainerEl.setAttribute('role', 'list');
    insightsContainerEl.innerHTML = items
      .map(
        (text, index) => `
      <article
        class="rounded-xl border border-slate-700/60 bg-slate-950/35 px-4 py-3.5 flex gap-3 items-start shadow-sm"
        role="listitem"
      >
        <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300 text-xs font-bold" aria-hidden="true">${index + 1}</span>
        <p class="text-slate-200 text-sm leading-relaxed">${escapeHtml(text)}</p>
      </article>
    `
      )
      .join('');
  }

  function destroyCharts() {
    if (weeklyChart) weeklyChart.destroy();
    if (monthlyChart) monthlyChart.destroy();
    weeklyChart = null;
    monthlyChart = null;
  }

  function initCharts(dashboardData) {
    destroyCharts();

    const weeklyCtx = weeklyCanvas.getContext('2d');
    const monthlyCtx = monthlyCanvas.getContext('2d');

    const weeklyLabels = weekDayLabels(dashboardData.weeklyTrends.labels);

    weeklyChart = new Chart(weeklyCtx, {
      type: 'line',
      data: {
        labels: weeklyLabels,
        datasets: [
          {
            label: 'Sleep (hours)',
            data: dashboardData.weeklyTrends.sleep_hours,
            borderColor: '#a78bfa',
            backgroundColor: 'rgba(167, 139, 250, 0.15)',
            borderWidth: 2,
            tension: 0.35,
            spanGaps: false,
          },
          {
            label: 'Water (cups)',
            data: dashboardData.weeklyTrends.water_intake,
            borderColor: '#fb7185',
            backgroundColor: 'rgba(251, 113, 133, 0.12)',
            borderWidth: 2,
            tension: 0.35,
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#e2e8f0' } },
          tooltip: { mode: 'index', intersect: false },
        },
        interaction: { mode: 'nearest', intersect: false },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.12)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.12)' }, beginAtZero: true },
        },
      },
    });

    const monthlyLabels = dashboardData.monthlyTrends.labels;
    monthlyChart = new Chart(monthlyCtx, {
      type: 'line',
      data: {
        labels: monthlyLabels,
        datasets: [
          {
            label: 'Sleep (hours)',
            data: dashboardData.monthlyTrends.sleep_hours,
            borderColor: '#a78bfa',
            backgroundColor: 'rgba(167, 139, 250, 0.14)',
            borderWidth: 2,
            tension: 0.35,
            spanGaps: false,
          },
          {
            label: 'Exercise (minutes)',
            data: dashboardData.monthlyTrends.exercise_minutes,
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96, 165, 250, 0.12)',
            borderWidth: 2,
            tension: 0.35,
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#e2e8f0' } },
          tooltip: { mode: 'index', intersect: false },
        },
        interaction: { mode: 'nearest', intersect: false },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.12)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.12)' }, beginAtZero: true },
        },
      },
    });
  }

  async function loadDashboardData() {
    const dashboardData = await window.life3600Api.apiRequest('/dashboard-data', { method: 'GET' });
    const habits = dashboardData.habits || dashboardData;

    statTotalEl.textContent = habits.summary.totalHabits;
    statCompletedEl.textContent = habits.summary.completedToday ? 'Yes' : 'No';
    statStreakEl.textContent = habits.summary.streakDays;

    avgSleepEl.textContent = habits.averages.avgSleepHoursLast7Days;
    avgWaterEl.textContent = habits.averages.avgWaterIntakeLast7Days;
    activityScoreEl.textContent = habits.averages.activityScore;

    initCharts(habits);
    renderInsights(dashboardData.insights);
    showHabitInsightToasts(dashboardData);
  }

  async function loadHabitsList() {
    if (!isHistoryMode) {
      // Default: show ONLY today's entry; if none, show the latest entry we can find (weekly range).
      const todayData = await window.life3600Api.apiRequest(`/get-habits?range=daily&date=${todayLocalISO}`, {
        method: 'GET',
      });

      const todays = todayData.habits || [];
      if (todays.length > 0) {
        currentHabits = todays;
      } else {
        const fallback = await window.life3600Api.apiRequest('/get-habits?range=weekly', { method: 'GET' });
        const all = fallback.habits || [];
        const latest = all
          .slice()
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 1);
        currentHabits = latest;
      }
    } else {
      const range = historyRangeEl ? historyRangeEl.value : 'weekly';
      const data = await window.life3600Api.apiRequest(`/get-habits?range=${range}`, { method: 'GET' });
      currentHabits = data.habits || [];
    }

    habitListEl.innerHTML = '';

    if (currentHabits.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'text-slate-400 text-sm py-10';
      empty.textContent = 'No logs yet. Add one above to get started.';
      habitListEl.appendChild(empty);
      return;
    }

    // Render newest first
    currentHabits
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((h) => habitListEl.appendChild(renderHabitCard(h)));

    if (logsSubtitleEl) {
      if (!isHistoryMode) {
        logsSubtitleEl.textContent = 'Showing today (or your latest entry).';
      } else {
        const label = historyRangeEl ? historyRangeEl.options[historyRangeEl.selectedIndex].text : 'History';
        logsSubtitleEl.textContent = `Showing ${label.toLowerCase()} history. Click an entry to edit.`;
      }
    }
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.life3600Api.setToken(null);
      window.location.href = '/login.html';
    });
  }

  habitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showMessage('error', '');

    const date = habitDateEl.value;
    const sleep_hours = numOrNull(sleepHoursEl.value);
    const water_intake = numOrNull(waterIntakeEl.value);
    const meals = numOrNull(mealsEl.value);
    const exercise_minutes = numOrNull(exerciseMinutesEl.value);

    // If the user entered a non-number, stop early with a friendly message
    if (sleep_hours === undefined || water_intake === undefined || meals === undefined || exercise_minutes === undefined) {
      showMessage('error', 'Please enter valid numbers for your metrics.');
      return;
    }

    try {
      const payload = { date, sleep_hours, water_intake, meals, exercise_minutes };
      let response;

      if (editingHabitId) {
        response = await window.life3600Api.apiRequest('/update-habit', {
          method: 'PUT',
          body: JSON.stringify({ habitId: editingHabitId, ...payload }),
        });
      } else {
        response = await window.life3600Api.apiRequest('/add-habit', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      showMessage('success', response.message || 'Saved!');
      clearFormMode();

      await loadHabitsList();
      await loadDashboardData();
    } catch (err) {
      showMessage('error', err.message || 'Failed to save entry.');
    }
  });

  function setHistoryMode(next) {
    isHistoryMode = next;
    if (toggleHistoryBtn) {
      toggleHistoryBtn.textContent = isHistoryMode ? 'Hide history' : 'View history';
    }
    if (historyRangeEl) {
      historyRangeEl.classList.toggle('hidden', !isHistoryMode);
    }
  }

  if (toggleHistoryBtn) {
    toggleHistoryBtn.addEventListener('click', async () => {
      setHistoryMode(!isHistoryMode);
      await loadHabitsList();
    });
  }

  if (historyRangeEl) {
    historyRangeEl.addEventListener('change', async () => {
      if (!isHistoryMode) return;
      await loadHabitsList();
    });
  }

  async function init() {
    hideMessage();
    setHistoryMode(false);
    await loadProfile();
    await loadDashboardData();
    await loadHabitsList();
  }

  init().catch((err) => {
    showMessage('error', err.message || 'Failed to load dashboard.');
  });
})();

