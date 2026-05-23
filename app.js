/* ═══════════════════════════════════════════════════════
   WeatherVue — Vanilla JS Weather Engine
   ═══════════════════════════════════════════════════════ */

'use strict';

// ── Constants ──
const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const CACHE_KEY = 'weathervue_last_city';
const DEBOUNCE_MS = 350;

// ── WMO Weather Code Mapping ──
const WMO_MAP = {
  0:  { desc: 'Clear sky',       icon: '☀️', nightIcon: '🌙', theme: 'clear' },
  1:  { desc: 'Mainly clear',    icon: '🌤️', nightIcon: '🌙', theme: 'clear' },
  2:  { desc: 'Partly cloudy',   icon: '⛅',  nightIcon: '☁️', theme: 'cloudy' },
  3:  { desc: 'Overcast',        icon: '☁️',  nightIcon: '☁️', theme: 'cloudy' },
  45: { desc: 'Fog',             icon: '🌫️', nightIcon: '🌫️', theme: 'fog' },
  48: { desc: 'Rime fog',        icon: '🌫️', nightIcon: '🌫️', theme: 'fog' },
  51: { desc: 'Light drizzle',   icon: '🌧️', nightIcon: '🌧️', theme: 'rain' },
  53: { desc: 'Moderate drizzle',icon: '🌧️', nightIcon: '🌧️', theme: 'rain' },
  55: { desc: 'Dense drizzle',   icon: '🌧️', nightIcon: '🌧️', theme: 'rain' },
  61: { desc: 'Slight rain',     icon: '🌧️', nightIcon: '🌧️', theme: 'rain' },
  63: { desc: 'Moderate rain',   icon: '🌧️', nightIcon: '🌧️', theme: 'rain' },
  65: { desc: 'Heavy rain',      icon: '🌧️', nightIcon: '🌧️', theme: 'rain' },
  71: { desc: 'Slight snow',     icon: '🌨️', nightIcon: '🌨️', theme: 'snow' },
  73: { desc: 'Moderate snow',   icon: '❄️',  nightIcon: '❄️', theme: 'snow' },
  75: { desc: 'Heavy snow',      icon: '❄️',  nightIcon: '❄️', theme: 'snow' },
  80: { desc: 'Light showers',   icon: '🌦️', nightIcon: '🌧️', theme: 'rain' },
  81: { desc: 'Mod. showers',    icon: '🌦️', nightIcon: '🌧️', theme: 'rain' },
  82: { desc: 'Heavy showers',   icon: '🌦️', nightIcon: '🌧️', theme: 'rain' },
  95: { desc: 'Thunderstorm',    icon: '⛈️',  nightIcon: '⛈️', theme: 'storm' },
  96: { desc: 'T-storm w/ hail', icon: '⛈️',  nightIcon: '⛈️', theme: 'storm' },
  99: { desc: 'Heavy t-storm',   icon: '⛈️',  nightIcon: '⛈️', theme: 'storm' },
};

// Weather theme palettes (CSS custom property overrides)
const THEME_PALETTES = {
  clear:  { h: 38,  s: '85%', l: '55%', bg1: 'hsl(30, 50%, 12%)',  bg2: 'hsl(38, 45%, 16%)',  bg3: 'hsl(25, 40%, 10%)' },
  cloudy: { h: 220, s: '30%', l: '50%', bg1: 'hsl(220, 20%, 12%)', bg2: 'hsl(225, 18%, 16%)', bg3: 'hsl(215, 15%, 10%)' },
  fog:    { h: 200, s: '15%', l: '50%', bg1: 'hsl(200, 10%, 14%)', bg2: 'hsl(205, 8%, 18%)',  bg3: 'hsl(195, 8%, 11%)' },
  rain:   { h: 225, s: '60%', l: '45%', bg1: 'hsl(225, 35%, 10%)', bg2: 'hsl(230, 30%, 14%)', bg3: 'hsl(220, 25%, 8%)' },
  snow:   { h: 195, s: '40%', l: '65%', bg1: 'hsl(200, 20%, 14%)', bg2: 'hsl(210, 18%, 18%)', bg3: 'hsl(195, 15%, 11%)' },
  storm:  { h: 270, s: '55%', l: '40%', bg1: 'hsl(260, 30%, 8%)',  bg2: 'hsl(270, 25%, 12%)', bg3: 'hsl(255, 20%, 7%)' },
  night:  { h: 230, s: '50%', l: '40%', bg1: 'hsl(230, 25%, 6%)',  bg2: 'hsl(235, 22%, 10%)', bg3: 'hsl(225, 20%, 5%)' },
};

// ── DOM Refs ──
const $ = (sel) => document.querySelector(sel);
const dom = {
  searchInput:    $('#search-input'),
  searchResults:  $('#search-results'),
  locateBtn:      $('#locate-btn'),
  // States
  stateWelcome:   $('#state-welcome'),
  stateLoading:   $('#state-loading'),
  stateError:     $('#state-error'),
  stateNoResults: $('#state-no-results'),
  stateOffline:   $('#state-offline'),
  stateBlocked:   $('#state-location-blocked'),
  // Dashboard
  dashboard:      $('#weather-dashboard'),
  cityName:       $('#city-name'),
  cityMeta:       $('#city-meta'),
  currentIcon:    $('#current-icon'),
  currentTemp:    $('#current-temp'),
  weatherDesc:    $('#weather-desc'),
  feelsLike:      $('#feels-like'),
  highLow:        $('#high-low'),
  // Metrics
  humidity:       $('#humidity-val'),
  wind:           $('#wind-val'),
  uv:             $('#uv-val'),
  pressure:       $('#pressure-val'),
  precip:         $('#precip-val'),
  // Lists
  hourlyScroll:   $('#hourly-scroll'),
  dailyList:      $('#daily-list'),
  // Error
  errorTitle:     $('#error-title'),
  errorMessage:   $('#error-message'),
  errorRetry:     $('#error-retry'),
  offlineRetry:   $('#offline-retry'),
  bgLayer:        $('#bg-layer'),
};

// ── State ──
let lastFetchedLocation = null;
let searchAbortController = null;
let selectedResultIndex = -1;

// ══════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function getWMO(code, isDay = true) {
  const entry = WMO_MAP[code] || WMO_MAP[0];
  return {
    desc: entry.desc,
    icon: isDay ? entry.icon : entry.nightIcon,
    theme: isDay ? entry.theme : 'night',
  };
}

function round(n) {
  return Math.round(n);
}

function formatHour(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
}

function formatDay(isoString, i) {
  if (i === 0) return 'Today';
  const d = new Date(isoString + 'T00:00:00');
  return d.toLocaleDateString([], { weekday: 'short' });
}

// ══════════════════════════════════════
// UI STATE MANAGEMENT
// ══════════════════════════════════════

const allStates = [
  dom.stateWelcome, dom.stateLoading, dom.stateError,
  dom.stateNoResults, dom.stateOffline, dom.stateBlocked,
  dom.dashboard,
];

function showState(el) {
  allStates.forEach(s => s.classList.add('hidden'));
  if (el) el.classList.remove('hidden');
}

function showError(title, message) {
  dom.errorTitle.textContent = title;
  dom.errorMessage.textContent = message;
  showState(dom.stateError);
}

// ══════════════════════════════════════
// THEME MANAGEMENT
// ══════════════════════════════════════

function applyWeatherTheme(themeKey) {
  const palette = THEME_PALETTES[themeKey] || THEME_PALETTES.clear;
  const root = document.documentElement.style;
  root.setProperty('--accent-h', palette.h);
  root.setProperty('--accent-s', palette.s);
  root.setProperty('--accent-l', palette.l);
  root.setProperty('--bg-gradient-1', palette.bg1);
  root.setProperty('--bg-gradient-2', palette.bg2);
  root.setProperty('--bg-gradient-3', palette.bg3);
}

// ══════════════════════════════════════
// API — Geocoding
// ══════════════════════════════════════

async function searchCities(query) {
  if (!query || query.trim().length < 2) return [];
  if (searchAbortController) searchAbortController.abort();
  searchAbortController = new AbortController();

  const url = `${GEO_API}?name=${encodeURIComponent(query.trim())}&count=5&language=en&format=json`;

  try {
    const res = await fetch(url, { signal: searchAbortController.signal });
    if (!res.ok) throw new Error(`Geocoding API error: ${res.status}`);
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    if (err.name === 'AbortError') return [];
    throw err;
  }
}

// ══════════════════════════════════════
// API — Weather
// ══════════════════════════════════════

async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,pressure_msl,wind_speed_10m',
    hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,uv_index_max',
    timezone: 'auto',
  });

  const res = await fetch(`${WEATHER_API}?${params}`);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  return res.json();
}

// ══════════════════════════════════════
// RENDERING — Current Weather
// ══════════════════════════════════════

function renderDashboard(weather, cityInfo) {
  const c = weather.current;
  const isDay = !!c.is_day;
  const wmo = getWMO(c.weather_code, isDay);

  // Theme
  applyWeatherTheme(wmo.theme);

  // Hero
  dom.cityName.textContent = cityInfo.name;
  const metaParts = [cityInfo.admin1, cityInfo.country].filter(Boolean);
  dom.cityMeta.textContent = metaParts.join(', ');
  dom.currentIcon.textContent = wmo.icon;
  dom.currentTemp.textContent = `${round(c.temperature_2m)}°`;
  dom.weatherDesc.textContent = wmo.desc;
  dom.feelsLike.textContent = `Feels like ${round(c.apparent_temperature)}°`;

  // High / Low from daily
  const todayMax = round(weather.daily.temperature_2m_max[0]);
  const todayMin = round(weather.daily.temperature_2m_min[0]);
  dom.highLow.innerHTML = `H: ${todayMax}°&ensp;L: ${todayMin}°`;

  // Metrics
  dom.humidity.textContent = `${c.relative_humidity_2m}%`;
  dom.wind.textContent = `${round(c.wind_speed_10m)} km/h`;
  dom.uv.textContent = weather.daily.uv_index_max[0];
  dom.pressure.textContent = `${round(c.pressure_msl)} hPa`;

  // Current precipitation probability — find closest hour
  const now = new Date();
  const currentHourIdx = findCurrentHourIndex(weather.hourly.time, now);
  const precipProb = currentHourIdx >= 0
    ? weather.hourly.precipitation_probability[currentHourIdx]
    : '—';
  dom.precip.textContent = typeof precipProb === 'number' ? `${precipProb}%` : precipProb;

  // Hourly
  renderHourly(weather.hourly, currentHourIdx);

  // Daily
  renderDaily(weather.daily);

  showState(dom.dashboard);
}

// ══════════════════════════════════════
// RENDERING — Hourly Forecast
// ══════════════════════════════════════

function findCurrentHourIndex(times, now) {
  const nowMs = now.getTime();
  let closest = 0;
  let minDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - nowMs);
    if (diff < minDiff) { minDiff = diff; closest = i; }
  }
  return closest;
}

function renderHourly(hourly, startIdx) {
  dom.hourlyScroll.innerHTML = '';
  const count = 24;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const idx = startIdx + i;
    if (idx >= hourly.time.length) break;

    const isDay = hourly.is_day ? !!hourly.is_day[idx] : true;
    const wmo = getWMO(hourly.weather_code[idx], isDay);

    const el = document.createElement('div');
    el.className = 'hourly-item' + (i === 0 ? ' now' : '');
    el.setAttribute('role', 'listitem');
    el.innerHTML = `
      <span class="hourly-item__time">${i === 0 ? 'Now' : formatHour(hourly.time[idx])}</span>
      <span class="hourly-item__icon">${wmo.icon}</span>
      <span class="hourly-item__temp">${round(hourly.temperature_2m[idx])}°</span>
    `;
    el.style.animationDelay = `${i * 0.03}s`;
    fragment.appendChild(el);
  }
  dom.hourlyScroll.appendChild(fragment);
}

// ══════════════════════════════════════
// RENDERING — 7-Day Forecast
// ══════════════════════════════════════

function renderDaily(daily) {
  dom.dailyList.innerHTML = '';
  const fragment = document.createDocumentFragment();

  // Find global min/max for bar scaling
  const allMin = Math.min(...daily.temperature_2m_min);
  const allMax = Math.max(...daily.temperature_2m_max);
  const range = allMax - allMin || 1;

  for (let i = 0; i < daily.time.length; i++) {
    const wmo = getWMO(daily.weather_code[i], true);
    const minT = round(daily.temperature_2m_min[i]);
    const maxT = round(daily.temperature_2m_max[i]);
    const leftPct = ((daily.temperature_2m_min[i] - allMin) / range) * 100;
    const rightPct = 100 - ((daily.temperature_2m_max[i] - allMin) / range) * 100;

    const li = document.createElement('li');
    li.className = 'daily-item';
    li.setAttribute('role', 'listitem');
    li.innerHTML = `
      <div class="daily-item__day">
        ${formatDay(daily.time[i], i)}
        <span class="daily-item__desc">${wmo.desc}</span>
      </div>
      <span class="daily-item__icon">${wmo.icon}</span>
      <div class="daily-item__temps">
        <span class="daily-item__min">${minT}°</span>
        <div class="temp-bar-container">
          <div class="temp-bar" style="left:${leftPct}%;right:${rightPct}%"></div>
        </div>
        <span class="daily-item__max">${maxT}°</span>
      </div>
    `;
    fragment.appendChild(li);
  }
  dom.dailyList.appendChild(fragment);
}

// ══════════════════════════════════════
// AUTOCOMPLETE
// ══════════════════════════════════════

function renderSearchResults(results) {
  dom.searchResults.innerHTML = '';
  selectedResultIndex = -1;

  if (results.length === 0) {
    dom.searchResults.classList.remove('active');
    dom.searchInput.setAttribute('aria-expanded', 'false');
    return;
  }

  const fragment = document.createDocumentFragment();
  results.forEach((city, i) => {
    const li = document.createElement('li');
    li.className = 'search-results__item';
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.setAttribute('data-index', i);
    li.innerHTML = `
      <span class="search-results__name">${city.name}</span>
      <span class="search-results__detail">${[city.admin1, city.country].filter(Boolean).join(', ')}</span>
    `;
    li.addEventListener('click', () => selectCity(city));
    fragment.appendChild(li);
  });

  dom.searchResults.appendChild(fragment);
  dom.searchResults.classList.add('active');
  dom.searchInput.setAttribute('aria-expanded', 'true');
}

function closeAutocomplete() {
  dom.searchResults.classList.remove('active');
  dom.searchInput.setAttribute('aria-expanded', 'false');
  selectedResultIndex = -1;
}

// ══════════════════════════════════════
// MAIN FLOW — Select & Fetch
// ══════════════════════════════════════

async function selectCity(city) {
  closeAutocomplete();
  dom.searchInput.value = city.name;
  await loadWeather(city.latitude, city.longitude, {
    name: city.name,
    admin1: city.admin1 || '',
    country: city.country || '',
  });
}

async function loadWeather(lat, lon, cityInfo) {
  if (!navigator.onLine) {
    showState(dom.stateOffline);
    return;
  }

  showState(dom.stateLoading);

  try {
    const weather = await fetchWeather(lat, lon);
    lastFetchedLocation = { lat, lon, cityInfo };
    // Cache to localStorage
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lon, cityInfo }));
    } catch { /* storage full, ignore */ }

    renderDashboard(weather, cityInfo);
  } catch (err) {
    console.error('Weather fetch error:', err);
    showError('Failed to load weather', err.message || 'An unexpected error occurred. Please try again.');
  }
}

// ══════════════════════════════════════
// GEOLOCATION
// ══════════════════════════════════════

function requestGeolocation() {
  if (!('geolocation' in navigator)) {
    showState(dom.stateBlocked);
    return;
  }

  // Don't show loading if we have cached data already visible
  if (dom.dashboard.classList.contains('hidden')) {
    showState(dom.stateLoading);
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      // Reverse-lookup city name from geocoding (approximate)
      try {
        const res = await fetch(`${GEO_API}?name=&count=1&language=en&format=json`);
        // Open-Meteo doesn't have reverse geocoding, so we'll just show coordinates
      } catch { /* ignore */ }

      await loadWeather(latitude, longitude, {
        name: 'Your Location',
        admin1: '',
        country: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
      });
    },
    (err) => {
      console.warn('Geolocation error:', err.message);
      // Only show blocked state if no cached data
      const cached = loadFromCache();
      if (!cached) {
        showState(dom.stateBlocked);
      }
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
}

// ══════════════════════════════════════
// CACHE
// ══════════════════════════════════════

function loadFromCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.lat && data.lon && data.cityInfo) {
      loadWeather(data.lat, data.lon, data.cityInfo);
      return true;
    }
  } catch { /* corrupted cache, ignore */ }
  return null;
}

// ══════════════════════════════════════
// EVENT LISTENERS
// ══════════════════════════════════════

// Debounced search
let cachedResults = [];
const handleSearchInput = debounce(async (e) => {
  const query = e.target.value.trim();
  if (query.length < 2) {
    closeAutocomplete();
    cachedResults = [];
    return;
  }

  try {
    const results = await searchCities(query);
    cachedResults = results;
    if (results.length === 0 && query.length >= 2) {
      closeAutocomplete();
      // Don't switch to no-results state for autocomplete, just show empty dropdown
    } else {
      renderSearchResults(results);
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Search error:', err);
    }
  }
}, DEBOUNCE_MS);

dom.searchInput.addEventListener('input', handleSearchInput);

// Keyboard navigation for autocomplete
dom.searchInput.addEventListener('keydown', (e) => {
  const items = dom.searchResults.querySelectorAll('.search-results__item');
  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedResultIndex = Math.min(selectedResultIndex + 1, items.length - 1);
    updateSelectedResult(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedResultIndex = Math.max(selectedResultIndex - 1, 0);
    updateSelectedResult(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (selectedResultIndex >= 0 && cachedResults[selectedResultIndex]) {
      selectCity(cachedResults[selectedResultIndex]);
    } else if (cachedResults.length > 0) {
      selectCity(cachedResults[0]);
    }
  } else if (e.key === 'Escape') {
    closeAutocomplete();
  }
});

function updateSelectedResult(items) {
  items.forEach((item, i) => {
    item.setAttribute('aria-selected', i === selectedResultIndex ? 'true' : 'false');
  });
  if (items[selectedResultIndex]) {
    items[selectedResultIndex].scrollIntoView({ block: 'nearest' });
  }
}

// Close autocomplete on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-bar')) {
    closeAutocomplete();
  }
});

// Locate button
dom.locateBtn.addEventListener('click', () => {
  requestGeolocation();
});

// Retry buttons
dom.errorRetry.addEventListener('click', () => {
  if (lastFetchedLocation) {
    loadWeather(lastFetchedLocation.lat, lastFetchedLocation.lon, lastFetchedLocation.cityInfo);
  } else {
    requestGeolocation();
  }
});

dom.offlineRetry.addEventListener('click', () => {
  if (navigator.onLine) {
    if (lastFetchedLocation) {
      loadWeather(lastFetchedLocation.lat, lastFetchedLocation.lon, lastFetchedLocation.cityInfo);
    } else {
      requestGeolocation();
    }
  }
});

// Online / Offline detection
window.addEventListener('online', () => {
  if (dom.stateOffline && !dom.stateOffline.classList.contains('hidden')) {
    if (lastFetchedLocation) {
      loadWeather(lastFetchedLocation.lat, lastFetchedLocation.lon, lastFetchedLocation.cityInfo);
    } else {
      showState(dom.stateWelcome);
    }
  }
});

window.addEventListener('offline', () => {
  // Only interrupt if we're trying to do something
  if (!dom.stateLoading.classList.contains('hidden')) {
    showState(dom.stateOffline);
  }
});

// Prevent form submission
$('#search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  // Trigger search on Enter if no autocomplete selection
  const query = dom.searchInput.value.trim();
  if (query.length >= 2 && cachedResults.length > 0) {
    selectCity(cachedResults[0]);
  }
});

// ══════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════

(function init() {
  // 1. Try loading from cache for instant display
  const hasCache = loadFromCache();

  // 2. Also try geolocation (will update if successful)
  if (!hasCache) {
    requestGeolocation();
  }
})();
