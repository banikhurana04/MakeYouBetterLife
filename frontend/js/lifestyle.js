// lifestyle.js — profile preferences, fashion, weather

(function () {
  const token = window.life3600Api.getToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  const topUserNameEl = document.getElementById('top-user-name');
  const logoutBtn = document.getElementById('logout-btn');

  const profileForm = document.getElementById('profile-form');
  const profileMessageEl = document.getElementById('profile-message');
  const lifestyleGoalEl = document.getElementById('lifestyle-goal');
  const profileSkinTypeEl = document.getElementById('profile-skin-type');
  const profileFashionStyleEl = document.getElementById('profile-fashion-style');

  const fashionForm = document.getElementById('fashion-form');
  const fashionResultEl = document.getElementById('fashion-result');
  const fashionOccasionEl = document.getElementById('fashion-occasion');
  const fashionTimeEl = document.getElementById('fashion-time');
  const fashionWeatherEl = document.getElementById('fashion-weather');
  const fashionStyleEl = document.getElementById('fashion-style');

  /** Slug from last successful Weather card lookup (OpenWeather → fashion engine). Null = use dropdown. */
  let liveFashionWeatherSlug = null;

  const weatherForm = document.getElementById('weather-form');
  const weatherResultEl = document.getElementById('weather-result');
  const weatherCityEl = document.getElementById('weather-city');
  const weatherLocateBtn = document.getElementById('weather-locate-btn');

  function showProfileMessage(type, text) {
    if (!profileMessageEl) return;
    profileMessageEl.className = `message mt-4 ${type}`;
    profileMessageEl.textContent = text || '';
    profileMessageEl.classList.remove('hidden');
  }

  function hideProfileMessage() {
    if (!profileMessageEl) return;
    profileMessageEl.classList.add('hidden');
    profileMessageEl.textContent = '';
  }

  function list(items) {
    return items && items.length
      ? `<ul class="mt-2 space-y-1">${items.map((x) => `<li class="text-slate-200">• ${x}</li>`).join('')}</ul>`
      : `<div class="text-slate-400 mt-2">—</div>`;
  }

  async function loadProfile() {
    const profile = await window.life3600Api.apiRequest('/get-profile', { method: 'GET' });
    if (topUserNameEl) topUserNameEl.textContent = profile.name || '';
    if (lifestyleGoalEl) lifestyleGoalEl.value = profile.lifestyle_goal || '';
    if (profileSkinTypeEl) profileSkinTypeEl.value = profile.skin_type || '';
    if (profileFashionStyleEl) profileFashionStyleEl.value = profile.fashion_style || '';
    return profile;
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.life3600Api.setToken(null);
      window.location.href = '/login.html';
    });
  }

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideProfileMessage();
      try {
        await window.life3600Api.apiRequest('/update-profile', {
          method: 'PUT',
          body: JSON.stringify({
            lifestyle_goal: lifestyleGoalEl ? lifestyleGoalEl.value.trim() : '',
            skin_type: profileSkinTypeEl ? profileSkinTypeEl.value.trim() : '',
            fashion_style: profileFashionStyleEl ? profileFashionStyleEl.value.trim() : '',
          }),
        });
        showProfileMessage('success', 'Preferences saved.');
      } catch (err) {
        showProfileMessage('error', err.message || 'Could not save preferences.');
      }
    });
  }

  function conditionToFashionWeatherSlug(condition) {
    const c = String(condition || '');
    if (c === 'Rainy') return 'rainy';
    if (c === 'Hot') return 'hot';
    if (c === 'Cold') return 'cold';
    return 'moderate';
  }

  function applyWeatherModuleToFashion(data) {
    const slug = conditionToFashionWeatherSlug(data.condition);
    liveFashionWeatherSlug = slug;
    if (fashionWeatherEl) fashionWeatherEl.value = slug;
  }

  if (fashionWeatherEl) {
    fashionWeatherEl.addEventListener('change', () => {
      liveFashionWeatherSlug = null;
    });
  }

  if (fashionForm && fashionResultEl) {
    fashionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      fashionResultEl.innerHTML = '<div class="text-slate-400">Generating outfit…</div>';

      const weather =
        liveFashionWeatherSlug !== null
          ? liveFashionWeatherSlug
          : fashionWeatherEl
            ? fashionWeatherEl.value
            : 'moderate';

      const payload = {
        occasion: fashionOccasionEl ? fashionOccasionEl.value : 'casual',
        time: fashionTimeEl ? fashionTimeEl.value : 'day',
        weather,
        style: fashionStyleEl ? fashionStyleEl.value || undefined : undefined,
      };

      try {
        const data = await window.life3600Api.apiRequest('/recommendations/fashion', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        const rec = data.recommendation;
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

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function renderWeatherResult(data) {
    applyWeatherModuleToFashion(data);
    const loc = data.location ? `<div class="text-slate-400 text-sm mt-2">${escapeHtml(data.location)}</div>` : '';
    weatherResultEl.innerHTML = `
        <div class="rounded-xl border border-slate-700/60 bg-slate-950/35 px-4 py-4">
          <div class="text-slate-400 text-xs uppercase tracking-wide">Current</div>
          <div class="text-white text-2xl font-bold mt-1">${escapeHtml(String(data.temperature))}°C</div>
          <div class="text-purple-200 text-sm mt-1">${escapeHtml(data.condition)}</div>
          ${loc}
        </div>
      `;
  }

  function geolocationErrorMessage(err) {
    if (!err) return 'Could not get your location.';
    if (err.code === 1) return 'Location permission denied. Allow location in your browser or enter a city.';
    if (err.code === 2) return 'Location unavailable. Try again or enter a city.';
    if (err.code === 3) return 'Location request timed out. Try again or enter a city.';
    return err.message || 'Could not get your location.';
  }

  function getCurrentPosition(options) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 300000,
        ...options,
      });
    });
  }

  async function fetchWeatherByCoords(lat, lon) {
    const q = `lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    return window.life3600Api.apiRequest(`/api/weather?${q}`, { method: 'GET' });
  }

  if (weatherLocateBtn && weatherResultEl) {
    weatherLocateBtn.addEventListener('click', async () => {
      weatherResultEl.innerHTML = '<div class="text-slate-400">Getting location…</div>';
      try {
        const pos = await getCurrentPosition();
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        weatherResultEl.innerHTML = '<div class="text-slate-400">Loading weather…</div>';
        const data = await fetchWeatherByCoords(lat, lon);
        renderWeatherResult(data);
      } catch (err) {
        const geoErr = err && typeof err.code === 'number';
        const msg = geoErr ? geolocationErrorMessage(err) : err.message || 'Could not get your location.';
        weatherResultEl.innerHTML = `<div class="message error">${escapeHtml(msg)}</div>`;
      }
    });
  }

  if (weatherForm && weatherResultEl && weatherCityEl) {
    weatherForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const city = weatherCityEl.value.trim();
      if (!city) {
        weatherResultEl.innerHTML =
          '<div class="message error">Enter a city, or use current location above.</div>';
        return;
      }
      weatherResultEl.innerHTML = '<div class="text-slate-400">Loading…</div>';
      try {
        const data = await window.life3600Api.apiRequest(`/api/weather?city=${encodeURIComponent(city)}`, {
          method: 'GET',
        });
        renderWeatherResult(data);
      } catch (err) {
        weatherResultEl.innerHTML = `<div class="message error">${escapeHtml(err.message || 'Weather lookup failed.')}</div>`;
      }
    });
  }

  loadProfile().catch(() => {
    window.life3600Api.setToken(null);
    window.location.href = '/login.html';
  });
})();
