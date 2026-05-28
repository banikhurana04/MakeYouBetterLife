// dashboard.js - dashboard UI logic (fetch, render, charts, and habit logging)

(function () {
  const token = window.makeyoubetterApi.getToken();
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

  const weeklyCanvas = document.getElementById('weeklyChart');
  const monthlyCanvas = document.getElementById('monthlyChart');

  const logoutBtn = document.getElementById('logout-btn');
  const skincareForm = document.getElementById('skincare-form');
  const skincareResultEl = document.getElementById('skincare-result');
  const skinTypeEl = document.getElementById('skin-type');

  const fashionForm = document.getElementById('fashion-form');
  const fashionResultEl = document.getElementById('fashion-result');
  const fashionOccasionEl = document.getElementById('fashion-occasion');
  const fashionTimeEl = document.getElementById('fashion-time');
  const fashionWeatherEl = document.getElementById('fashion-weather');
  const fashionStyleEl = document.getElementById('fashion-style');
  const goalsForm = document.getElementById('goals-form');
  const goalsMessageEl = document.getElementById('goals-message');
  const waterGoalEl = document.getElementById('water-goal');
  const sleepGoalEl = document.getElementById('sleep-goal');
  const exerciseGoalEl = document.getElementById('exercise-goal');
  const wakeTimeEl = document.getElementById('wake-time');
  const sleepTimeEl = document.getElementById('sleep-time');

  const waterProgressBarEl = document.getElementById('water-progress-bar');
  const sleepProgressBarEl = document.getElementById('sleep-progress-bar');
  const exerciseProgressBarEl = document.getElementById('exercise-progress-bar');
  const waterProgressLabelEl = document.getElementById('water-progress-label');
  const sleepProgressLabelEl = document.getElementById('sleep-progress-label');
  const exerciseProgressLabelEl = document.getElementById('exercise-progress-label');
  const reminderMessageEl = document.getElementById('reminder-message');
  const reminderToastEl = document.getElementById('reminder-toast');

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
  let lastToastAt = 0;

  function showMessage(type, text) {
    if (!habitMessageEl) return;
    habitMessageEl.className = `message mt-4 ${type}`;
    habitMessageEl.textContent = text || '';
    habitMessageEl.classList.remove('hidden');
  }

  function showGoalsMessage(type, text) {
    if (!goalsMessageEl) return;
    goalsMessageEl.className = `message mt-4 ${type}`;
    goalsMessageEl.textContent = text || '';
    goalsMessageEl.classList.remove('hidden');
  }

  function showReminderToast(text, level = 'info') {
    if (!reminderToastEl) return;
    const color =
      level === 'warning'
        ? 'border-amber-400/50 text-amber-100'
        : level === 'success'
        ? 'border-green-400/50 text-green-100'
        : 'border-slate-500/50 text-slate-100';

    reminderToastEl.innerHTML = `
      <div class="glass-panel border ${color} rounded-xl px-4 py-3 shadow-xl">
        <div class="text-xs uppercase tracking-wide opacity-80 mb-1">Smart reminder</div>
        <div class="text-sm">${text}</div>
      </div>
    `;
    reminderToastEl.classList.remove('hidden');

    setTimeout(() => {
      reminderToastEl.classList.add('hidden');
    }, 5000);
  }

  function hideMessage() {
    if (!habitMessageEl) return;
    habitMessageEl.classList.add('hidden');
    habitMessageEl.textContent = '';
  }

  function setBar(el, labelEl, percent, current, goal, unit) {
    if (!el || !labelEl) return;
    const p = Math.max(0, Math.min(100, Number(percent || 0)));
    el.style.width = `${p}%`;
    labelEl.textContent = `${current}/${goal}${unit} (${p}%)`;
  }

  async function loadGoalsAndProgress() {
    if (!goalsForm) return;

    try {
      const goalsRes = await window.makeyoubetterApi.apiRequest('/get-goals', { method: 'GET' });
      const g = goalsRes.goals;
      if (waterGoalEl) waterGoalEl.value = g.water_goal;
      if (sleepGoalEl) sleepGoalEl.value = g.sleep_goal;
      if (exerciseGoalEl) exerciseGoalEl.value = g.exercise_goal;
      if (wakeTimeEl) wakeTimeEl.value = g.wake_time;
      if (sleepTimeEl) sleepTimeEl.value = g.sleep_time;
    } catch (err) {
      // Goals might not exist yet; keep empty form
    }

    try {
      const progressRes = await window.makeyoubetterApi.apiRequest('/goal-progress', { method: 'GET' });
      const p = progressRes.progress;
      setBar(waterProgressBarEl, waterProgressLabelEl, p.water.percent, p.water.current, p.water.goal, 'L');
      setBar(sleepProgressBarEl, sleepProgressLabelEl, p.sleep.percent, p.sleep.current, p.sleep.goal, 'h');
      setBar(exerciseProgressBarEl, exerciseProgressLabelEl, p.exercise.percent, p.exercise.current, p.exercise.goal, 'm');
    } catch (err) {
      if (waterProgressLabelEl) waterProgressLabelEl.textContent = 'Set goals first';
      if (sleepProgressLabelEl) sleepProgressLabelEl.textContent = 'Set goals first';
      if (exerciseProgressLabelEl) exerciseProgressLabelEl.textContent = 'Set goals first';
    }
  }

  async function loadReminderStatus() {
    if (!reminderMessageEl) return;
    try {
      const status = await window.makeyoubetterApi.apiRequest('/reminder-status', { method: 'GET' });
      const prefix =
        status.status === 'behind'
          ? 'Reminder'
          : status.status === 'completed'
          ? 'Completed'
          : status.status === 'sleeping'
          ? 'Paused'
          : 'Update';
      reminderMessageEl.textContent = `${prefix}: ${status.message}`;
      reminderMessageEl.className =
        status.status === 'behind' ? 'mt-5 text-sm text-amber-200' : 'mt-5 text-sm text-slate-300';

      // non-blocking toast, throttled by reminder interval
      if (status.shouldRemind) {
        const now = Date.now();
        const dynamicGap = (status.intervalMinutes || 60) * 60 * 1000 * 0.2;
        const minGapMs = Math.max(60 * 1000, Math.min(5 * 60 * 1000, dynamicGap));
        if (now - lastToastAt > minGapMs) {
          lastToastAt = now;
          const level =
            status.status === 'behind' ? 'warning' : status.status === 'completed' ? 'success' : 'info';
          showReminderToast(status.message, level);
        }
      }
    } catch (err) {
      reminderMessageEl.textContent = 'Set goals to start smart reminders.';
      reminderMessageEl.className = 'mt-5 text-sm text-slate-400';
    }
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
    const profile = await window.makeyoubetterApi.apiRequest('/get-profile', { method: 'GET' });
    if (userNameEl) userNameEl.textContent = profile.name || '';
    if (topUserNameEl) topUserNameEl.textContent = profile.name || '';

    if (prefGoalEl) prefGoalEl.textContent = profile.lifestyle_goal || '—';
    if (prefSkinEl) prefSkinEl.textContent = profile.skin_type || '—';
    if (prefStyleEl) prefStyleEl.textContent = profile.fashion_style || '—';

    // Prefill recommendation inputs (optional)
    if (skinTypeEl && profile.skin_type) {
      // only set if empty / "Use profile" selected
      if (!skinTypeEl.value) skinTypeEl.value = '';
    }
    if (fashionStyleEl && profile.fashion_style) {
      if (!fashionStyleEl.value) fashionStyleEl.value = '';
    }

    return profile;
  }

  function weekDayLabels(labels) {
    return labels.map((l) => l.replace(',', ''));
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
    const dashboardData = await window.makeyoubetterApi.apiRequest('/dashboard-data', { method: 'GET' });

    statTotalEl.textContent = dashboardData.summary.totalHabits;
    statCompletedEl.textContent = dashboardData.summary.completedToday ? 'Yes' : 'No';
    statStreakEl.textContent = dashboardData.summary.streakDays;

    avgSleepEl.textContent = dashboardData.averages.avgSleepHoursLast7Days;
    avgWaterEl.textContent = dashboardData.averages.avgWaterIntakeLast7Days;
    activityScoreEl.textContent = dashboardData.averages.activityScore;

    initCharts(dashboardData);
  }

  async function loadHabitsList() {
    if (!isHistoryMode) {
      // Default: show ONLY today's entry; if none, show the latest entry we can find (weekly range).
      const todayData = await window.makeyoubetterApi.apiRequest(`/get-habits?range=daily&date=${todayLocalISO}`, {
        method: 'GET',
      });

      const todays = todayData.habits || [];
      if (todays.length > 0) {
        currentHabits = todays;
      } else {
        const fallback = await window.makeyoubetterApi.apiRequest('/get-habits?range=weekly', { method: 'GET' });
        const all = fallback.habits || [];
        const latest = all
          .slice()
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 1);
        currentHabits = latest;
      }
    } else {
      const range = historyRangeEl ? historyRangeEl.value : 'weekly';
      const data = await window.makeyoubetterApi.apiRequest(`/get-habits?range=${range}`, { method: 'GET' });
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
      window.makeyoubetterApi.setToken(null);
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
        response = await window.makeyoubetterApi.apiRequest('/update-habit', {
          method: 'PUT',
          body: JSON.stringify({ habitId: editingHabitId, ...payload }),
        });
      } else {
        response = await window.makeyoubetterApi.apiRequest('/add-habit', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      showMessage('success', response.message || 'Saved!');
      clearFormMode();

      await loadHabitsList();
      await loadDashboardData();
      await loadGoalsAndProgress();
      await loadReminderStatus();
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
    const profile = await loadProfile();
    await loadDashboardData();
    await loadHabitsList();
    await loadGoalsAndProgress();
    await loadReminderStatus();

    if (goalsForm) {
      goalsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const payload = {
            water_goal: Number(waterGoalEl.value),
            sleep_goal: Number(sleepGoalEl.value),
            exercise_goal: Number(exerciseGoalEl.value),
            wake_time: wakeTimeEl.value,
            sleep_time: sleepTimeEl.value,
          };
          const res = await window.makeyoubetterApi.apiRequest('/set-goals', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          showGoalsMessage('success', res.message || 'Goals saved');
          await loadGoalsAndProgress();
          await loadReminderStatus();
        } catch (err) {
          showGoalsMessage('error', err.message || 'Failed to save goals');
        }
      });
    }

    // AI Integrations
    loadAiMoodInsights();

    const faceScanForm = document.getElementById('face-scan-form');
    const faceScanResult = document.getElementById('face-scan-result');
    const tabUpload = document.getElementById('tab-upload');
    const tabCamera = document.getElementById('tab-camera');
    const cameraInterface = document.getElementById('camera-interface');
    const startCameraBtn = document.getElementById('start-camera-btn');
    const captureBtn = document.getElementById('capture-btn');
    const webcamVideo = document.getElementById('webcam-video');
    const webcamCanvas = document.getElementById('webcam-canvas');

    let stream = null;

    if (tabUpload && tabCamera) {
      tabUpload.addEventListener('click', () => {
        tabUpload.className = "px-4 py-2 rounded-lg text-sm font-medium bg-teal-500/20 text-teal-300 border border-teal-500/30 transition-all";
        tabCamera.className = "px-4 py-2 rounded-lg text-sm font-medium bg-slate-800/50 text-slate-400 border border-transparent hover:text-slate-200 transition-all";
        faceScanForm.classList.remove('hidden');
        cameraInterface.classList.add('hidden');
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          stream = null;
          startCameraBtn.classList.remove('hidden');
          captureBtn.classList.add('hidden');
        }
      });

      tabCamera.addEventListener('click', () => {
        tabCamera.className = "px-4 py-2 rounded-lg text-sm font-medium bg-teal-500/20 text-teal-300 border border-teal-500/30 transition-all";
        tabUpload.className = "px-4 py-2 rounded-lg text-sm font-medium bg-slate-800/50 text-slate-400 border border-transparent hover:text-slate-200 transition-all";
        faceScanForm.classList.add('hidden');
        cameraInterface.classList.remove('hidden');
      });
    }

    if (startCameraBtn && captureBtn) {
      startCameraBtn.addEventListener('click', async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          webcamVideo.srcObject = stream;
          startCameraBtn.classList.add('hidden');
          captureBtn.classList.remove('hidden');
        } catch (err) {
          alert('Could not access camera: ' + err.message);
        }
      });

      captureBtn.addEventListener('click', async () => {
        if (!stream) return;
        
        webcamCanvas.width = webcamVideo.videoWidth;
        webcamCanvas.height = webcamVideo.videoHeight;
        const ctx = webcamCanvas.getContext('2d');
        ctx.drawImage(webcamVideo, 0, 0, webcamCanvas.width, webcamCanvas.height);
        
        webcamCanvas.toBlob(async (blob) => {
          if (!blob) return;
          
          const formData = new FormData();
          formData.append('image', blob, 'webcam-capture.jpg');

          faceScanResult.textContent = 'Analyzing camera image...';
          faceScanResult.classList.remove('hidden');

          try {
            const token = window.makeyoubetterApi.getToken();
            const response = await fetch('/analyze-face', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData
            });

            const data = await response.json();
            
            if (!response.ok || !data.success) {
              throw new Error(data.message || 'Failed to analyze face');
            }

            const aiData = data.data;
            let resultHtml = `<div class="font-semibold text-white mb-1">Analysis Complete</div>`;
            
            if (aiData.error) {
               resultHtml += `<div class="text-rose-400">${aiData.error}</div>`;
            } else if (aiData.result) {
               resultHtml += `<div>${aiData.result}</div>`;
               if (Array.isArray(aiData.concerns) && aiData.concerns.length > 0) {
                 const concernHtml = aiData.concerns
                   .map((c) => {
                     const title = (c.name || 'Concern').replaceAll('_', ' ');
                     const severity = c.severity ? ` (${c.severity})` : '';
                     const tips = Array.isArray(c.tips) ? c.tips : [];
                     return `
                       <div class="mt-3 p-3 rounded-lg bg-slate-900/60 border border-slate-700/60">
                         <div class="text-sm font-semibold text-teal-200">${title}${severity}</div>
                         <ul class="mt-2 text-xs text-slate-200 list-disc list-inside space-y-1">
                           ${tips.map((t) => `<li>${t}</li>`).join('')}
                         </ul>
                       </div>
                     `;
                   })
                   .join('');
                 resultHtml += `<div class="mt-3 text-xs text-slate-300">Suggestions:</div>${concernHtml}`;
               }
            } else {
               resultHtml += `<pre class="text-xs text-teal-100 overflow-x-auto">${JSON.stringify(aiData, null, 2)}</pre>`;
            }
            
            faceScanResult.innerHTML = resultHtml;
          } catch (err) {
            faceScanResult.innerHTML = `<div class="text-rose-400">Error: ${err.message}</div>`;
          }
        }, 'image/jpeg');
      });
    }
    
    if (faceScanForm && faceScanResult) {
      faceScanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fileInput = document.getElementById('face-image');
        if (!fileInput.files[0]) return;

        const formData = new FormData();
        formData.append('image', fileInput.files[0]);

        faceScanResult.textContent = 'Analyzing image...';
        faceScanResult.classList.remove('hidden');

        try {
          const token = window.makeyoubetterApi.getToken();
          const response = await fetch('/analyze-face', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          const data = await response.json();
          
          if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to analyze face');
          }

          const aiData = data.data;
          
          let resultHtml = `<div class="font-semibold text-white mb-1">Analysis Complete</div>`;
          
          if (aiData.error) {
             resultHtml += `<div class="text-rose-400">${aiData.error}</div>`;
          } else if (aiData.result) {
             resultHtml += `<div>${aiData.result}</div>`;
             if (Array.isArray(aiData.concerns) && aiData.concerns.length > 0) {
               const concernHtml = aiData.concerns
                 .map((c) => {
                   const title = (c.name || 'Concern').replaceAll('_', ' ');
                   const severity = c.severity ? ` (${c.severity})` : '';
                   const tips = Array.isArray(c.tips) ? c.tips : [];
                   return `
                     <div class="mt-3 p-3 rounded-lg bg-slate-900/60 border border-slate-700/60">
                       <div class="text-sm font-semibold text-teal-200">${title}${severity}</div>
                       <ul class="mt-2 text-xs text-slate-200 list-disc list-inside space-y-1">
                         ${tips.map((t) => `<li>${t}</li>`).join('')}
                       </ul>
                     </div>
                   `;
                 })
                 .join('');
               resultHtml += `<div class="mt-3 text-xs text-slate-300">Suggestions:</div>${concernHtml}`;
             }
          } else {
             resultHtml += `<pre class="text-xs text-teal-100 overflow-x-auto">${JSON.stringify(aiData, null, 2)}</pre>`;
          }
          
          faceScanResult.innerHTML = resultHtml;
          
        } catch (err) {
          faceScanResult.innerHTML = `<div class="text-rose-400">Error: ${err.message}</div>`;
        }
      });
    }

    // Wire Phase 2 forms (only if section exists)
    if (skincareForm && skincareResultEl) {
      skincareForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        skincareResultEl.innerHTML = '<div class="text-slate-400">Generating routine…</div>';

        const concerns = Array.from(skincareForm.querySelectorAll('input[type="checkbox"]:checked')).map(
          (i) => i.value
        );
        const skin_type = skinTypeEl ? skinTypeEl.value : '';

        try {
          const data = await window.makeyoubetterApi.apiRequest('/recommendations/skincare', {
            method: 'POST',
            body: JSON.stringify({
              skin_type: skin_type || undefined,
              concerns,
            }),
          });

          const rec = data.recommendation;
          const lifestyle = data.lifestyle || {};

          const list = (items) =>
            items && items.length
              ? `<ul class="mt-2 space-y-1">${items.map((x) => `<li class="text-slate-200">• ${x}</li>`).join('')}</ul>`
              : `<div class="text-slate-400 mt-2">—</div>`;

          skincareResultEl.innerHTML = `
            <div class="text-slate-400 text-xs">
              Lifestyle (avg 7d): sleep ${lifestyle.avg_sleep_last_7_days ?? '—'}h · water ${lifestyle.avg_water_intake ?? '—'}
            </div>

            <div class="mt-4 grid grid-cols-12 gap-4">
              <div class="col-span-12 sm:col-span-6">
                <div class="text-white font-semibold">Morning routine</div>
                <div class="mt-2 text-slate-300 text-sm">
                  <div class="text-slate-400">Cleanser</div>${list(rec.morningRoutine.cleanser)}
                  <div class="text-slate-400 mt-3">Serum</div>${list(rec.morningRoutine.serum)}
                  <div class="text-slate-400 mt-3">Moisturizer</div>${list(rec.morningRoutine.moisturizer)}
                  <div class="text-slate-400 mt-3">Sunscreen</div>${list(rec.morningRoutine.sunscreen)}
                </div>
              </div>

              <div class="col-span-12 sm:col-span-6">
                <div class="text-white font-semibold">Night routine</div>
                <div class="mt-2 text-slate-300 text-sm">
                  <div class="text-slate-400">Cleanser</div>${list(rec.nightRoutine.cleanser)}
                  <div class="text-slate-400 mt-3">Treatment</div>${list(rec.nightRoutine.treatment)}
                  <div class="text-slate-400 mt-3">Moisturizer</div>${list(rec.nightRoutine.moisturizer)}
                </div>
              </div>
            </div>

            <div class="mt-4">
              <div class="text-white font-semibold">Safety tips</div>
              ${list(rec.safetyTips)}
            </div>
          `;
        } catch (err) {
          skincareResultEl.innerHTML = `<div class="message error">${err.message || 'Failed to generate routine.'}</div>`;
        }
      });
    }

    if (fashionForm && fashionResultEl) {
      fashionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        fashionResultEl.innerHTML = '<div class="text-slate-400">Generating outfit…</div>';

        const payload = {
          occasion: fashionOccasionEl ? fashionOccasionEl.value : 'casual',
          time: fashionTimeEl ? fashionTimeEl.value : 'day',
          weather: fashionWeatherEl ? fashionWeatherEl.value : 'moderate',
          style: fashionStyleEl ? fashionStyleEl.value || undefined : undefined,
        };

        try {
          const data = await window.makeyoubetterApi.apiRequest('/recommendations/fashion', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

          const rec = data.recommendation;
          const list = (items) =>
            items && items.length
              ? `<ul class="mt-2 space-y-1">${items.map((x) => `<li class="text-slate-200">• ${x}</li>`).join('')}</ul>`
              : `<div class="text-slate-400 mt-2">—</div>`;

          fashionResultEl.innerHTML = `
            <div class="text-white font-semibold">Full outfit</div>
            ${list(rec.outfitSuggestion)}

            <div class="mt-4">
              <div class="text-white font-semibold">Color combination</div>
              <div class="text-slate-200 mt-2">• ${rec.colorCombination}</div>
            </div>

            <div class="mt-4">
              <div class="text-white font-semibold">Fabric suggestion</div>
              ${list(rec.fabricSuggestion)}
            </div>

            <div class="mt-4">
              <div class="text-white font-semibold">Styling tip</div>
              ${list(rec.stylingTip)}
            </div>
          `;
        } catch (err) {
          fashionResultEl.innerHTML = `<div class="message error">${err.message || 'Failed to generate outfit.'}</div>`;
        }
      });
    }

  }

  async function loadAiMoodInsights() {
    const aiEnergyLevel = document.getElementById('ai-energy-level');
    const aiMoodLevel = document.getElementById('ai-mood-level');
    
    if (!aiEnergyLevel || !aiMoodLevel) return;

    try {
      const response = await window.makeyoubetterApi.apiRequest('/get-mood-prediction', { method: 'GET' });
      if (response.success && response.data && !response.data.error) {
         aiEnergyLevel.textContent = response.data.energy_level || 'Unknown';
         aiMoodLevel.textContent = response.data.mood || 'Unknown';
      } else {
         aiEnergyLevel.textContent = 'Service Unavailable';
         aiMoodLevel.textContent = 'Service Unavailable';
         if(response.data && response.data.error) {
             console.warn("AI Mood Service Error:", response.data.error);
         }
      }
    } catch (error) {
      console.warn("Could not load AI mood insights:", error);
      aiEnergyLevel.textContent = 'Unavailable';
      aiMoodLevel.textContent = 'Unavailable';
    }
  }

  init().catch((err) => {
    showMessage('error', err.message || 'Failed to load dashboard.');
  });

  // Poll reminder/progress periodically without refreshing page
  setInterval(async () => {
    try {
      await loadGoalsAndProgress();
      await loadReminderStatus();
    } catch (err) {
      // silent polling failure
    }
  }, 120000);
})();

