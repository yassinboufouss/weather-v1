// ════════════════════════════════════════════════════════════════
//  STATE
// ════════════════════════════════════════════════════════════════

const State = {
  theme:          'dark',
  unit:           'C',          // 'C' | 'F'
  currentWeather: null,         // last WeatherData fetched
  lastQuery:      null,         // { type: 'city'|'coords', value }
  recentCities:   [],
};

// ════════════════════════════════════════════════════════════════
//  DOM REFS
// ════════════════════════════════════════════════════════════════

const $  = id => document.getElementById(id);

const DOM = {
  html:          document.documentElement,
  themeToggle:   $('themeToggle'),
  minBtn:        $('minBtn'),
  maxBtn:        $('maxBtn'),
  closeBtn:      $('closeBtn'),
  searchInput:   $('searchInput'),
  searchBtn:     $('searchBtn'),
  locateBtn:     $('locateBtn'),
  recentSection: $('recentSection'),
  recentList:    $('recentList'),
  unitToggle:    $('unitToggle'),
  loader:        $('loader'),
  errorState:    $('errorState'),
  errorTitle:    $('errorTitle'),
  errorMsg:      $('errorMsg'),
  retryBtn:      $('retryBtn'),
  emptyState:    $('emptyState'),
  dashboard:     $('dashboard'),
  bgLayer:       $('bgLayer'),
  alertToast:    $('alertToast'),
  alertTitle:    $('alertTitle'),
  alertMsg:      $('alertMsg'),
  alertClose:    $('alertClose'),
  // Dashboard fields
  cityName:         $('cityName'),
  countryDate:      $('countryDate'),
  tempValue:        $('tempValue'),
  tempUnitDisplay:  $('tempUnitDisplay'),
  conditionText:    $('conditionText'),
  feelsLike:        $('feelsLike'),
  weatherIconMain:  $('weatherIconMain'),
  iconGlow:         $('iconGlow'),
  humidity:         $('humidity'),
  windSpeed:        $('windSpeed'),
  sunrise:          $('sunrise'),
  sunset:           $('sunset'),
  forecastRow:      $('forecastRow'),
};

// ════════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════════

async function init() {
  // Load persisted preferences
  State.theme        = localStorage.getItem('theme') || 'dark';
  State.unit         = localStorage.getItem('unit')  || 'C';
  State.recentCities = JSON.parse(localStorage.getItem('recentCities') || '[]');

  applyTheme(State.theme);
  applyUnit(State.unit);
  renderRecentList();

  // Electron window-control buttons
  DOM.minBtn.addEventListener('click',   () => window.electronAPI?.minimize());
  DOM.maxBtn.addEventListener('click',   () => window.electronAPI?.maximize());
  DOM.closeBtn.addEventListener('click', () => window.electronAPI?.close());

  // Theme toggle
  DOM.themeToggle.addEventListener('click', toggleTheme);

  // Search
  DOM.searchBtn.addEventListener('click', handleSearch);
  DOM.searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSearch();
  });

  // Geolocation
  DOM.locateBtn.addEventListener('click', handleGeolocate);

  // Unit toggle
  DOM.unitToggle.addEventListener('click', e => {
    const btn = e.target.closest('.unit-btn');
    if (btn) switchUnit(btn.dataset.unit);
  });

  // Retry
  DOM.retryBtn.addEventListener('click', () => {
    if (State.lastQuery) retryLastQuery();
  });

  // Alert toast close
  DOM.alertClose.addEventListener('click', hideAlert);

  // Auto-load first recent city or geolocate silently
  if (State.recentCities.length > 0) {
    await fetchWeatherByCity(State.recentCities[0], false);
  } else {
    silentGeolocate();
  }
}

// ════════════════════════════════════════════════════════════════
//  THEME
// ════════════════════════════════════════════════════════════════

function applyTheme(theme) {
  State.theme = theme;
  DOM.html.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  applyTheme(State.theme === 'dark' ? 'light' : 'dark');
}

// ════════════════════════════════════════════════════════════════
//  UNIT TOGGLE
// ════════════════════════════════════════════════════════════════

function applyUnit(unit) {
  State.unit = unit;
  localStorage.setItem('unit', unit);

  // Update toggle button active state
  DOM.unitToggle.querySelectorAll('.unit-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.unit === unit);
  });
}

function switchUnit(unit) {
  if (unit === State.unit) return;
  applyUnit(unit);
  // Re-render current data with new unit (no network request)
  if (State.currentWeather) renderCurrentWeather(State.currentWeather);
}

/** Convert Celsius to Fahrenheit. */
function toF(c) { return Math.round(c * 9 / 5 + 32); }

/** Format temperature in current unit. */
function formatTemp(c) {
  return State.unit === 'F' ? toF(c) : c;
}

// ════════════════════════════════════════════════════════════════
//  SEARCH
// ════════════════════════════════════════════════════════════════

async function handleSearch() {
  const city = DOM.searchInput.value.trim();
  if (!city) return;
  DOM.searchInput.blur();
  await fetchWeatherByCity(city, true);
}

async function fetchWeatherByCity(city, addToRecent = true) {
  State.lastQuery = { type: 'city', value: city };
  showLoader();

  try {
    const [weather, forecast] = await Promise.all([
      WeatherService.getCurrentByCity(city),
      WeatherService.getForecastByCity(city),
    ]);

    State.currentWeather = weather;
    renderCurrentWeather(weather);
    renderForecast(forecast);
    showDashboard();

    if (addToRecent) addRecentCity(weather.city);
    DOM.searchInput.value = '';

    checkSevereWeather(weather);
    updateBackground(weather.condition);
    WeatherCanvas.setCondition(weather.condition);

  } catch (err) {
    showError(err);
  }
}

// ════════════════════════════════════════════════════════════════
//  GEOLOCATION
// ════════════════════════════════════════════════════════════════

function handleGeolocate() {
  DOM.locateBtn.classList.add('loading');
  geolocate(true);
}

/** Silently try geolocation on startup — no error banner on fail. */
function silentGeolocate() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    ()  => showEmptyState(),          // Silent fail — just show empty state
    { timeout: 8000 }
  );
}

function geolocate(showErrors = false) {
  if (!navigator.geolocation) {
    if (showErrors) showError({ message: 'Geolocation is not supported by your browser.', code: 0 });
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async pos => {
      DOM.locateBtn.classList.remove('loading');
      await fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
    },
    err => {
      DOM.locateBtn.classList.remove('loading');
      if (showErrors) showError({ message: 'Could not get your location. Please allow access.', code: 0 });
    },
    { timeout: 10_000 }
  );
}

async function fetchWeatherByCoords(lat, lon) {
  State.lastQuery = { type: 'coords', value: { lat, lon } };
  showLoader();

  try {
    const [weather, forecast] = await Promise.all([
      WeatherService.getCurrentByCoords(lat, lon),
      WeatherService.getForecastByCoords(lat, lon),
    ]);

    State.currentWeather = weather;
    renderCurrentWeather(weather);
    renderForecast(forecast);
    showDashboard();

    checkSevereWeather(weather);
    updateBackground(weather.condition);
    WeatherCanvas.setCondition(weather.condition);

  } catch (err) {
    showError(err);
  }
}

async function retryLastQuery() {
  const q = State.lastQuery;
  if (!q) return;
  if (q.type === 'city')   await fetchWeatherByCity(q.value, false);
  if (q.type === 'coords') await fetchWeatherByCoords(q.value.lat, q.value.lon);
}

// ════════════════════════════════════════════════════════════════
//  RENDERERS
// ════════════════════════════════════════════════════════════════

function renderCurrentWeather(w) {
  // Temperature + unit
  DOM.tempValue.textContent     = formatTemp(w.tempC);
  DOM.tempUnitDisplay.textContent = `°${State.unit}`;

  // City & location
  DOM.cityName.textContent    = w.city;
  DOM.countryDate.textContent = `${w.country} · ${formatDate(new Date())}`;

  // Condition
  DOM.conditionText.textContent = w.description;
  DOM.feelsLike.textContent     = `Feels like ${formatTemp(w.feelsLikeC)}°${State.unit}`;

  // Weather icon from OWM CDN
  const iconUrl = `https://openweathermap.org/img/wn/${w.icon}@2x.png`;
  DOM.weatherIconMain.src = iconUrl;
  DOM.weatherIconMain.alt = w.description;

  // Stats
  DOM.humidity.textContent  = `${w.humidity}%`;
  DOM.windSpeed.textContent = `${w.windSpeed} km/h`;
  DOM.sunrise.textContent   = formatUnixTime(w.sunrise, w.timezone);
  DOM.sunset.textContent    = formatUnixTime(w.sunset,  w.timezone);
}

function renderForecast(days) {
  DOM.forecastRow.innerHTML = '';   // Clear previous

  for (const day of days) {
    const el = document.createElement('div');
    el.className = 'forecast-day fade-in';
    el.innerHTML = `
      <span class="forecast-day-name">${formatDayName(day.date)}</span>
      <img class="forecast-icon"
           src="https://openweathermap.org/img/wn/${day.icon}@2x.png"
           alt="${day.desc}"
           loading="lazy" />
      <div class="forecast-temp">
        <span class="forecast-high">${formatTemp(day.highC)}°</span>
        <span class="forecast-low">${formatTemp(day.lowC)}°</span>
      </div>
      <span class="forecast-desc">${day.desc}</span>
    `;
    DOM.forecastRow.appendChild(el);
  }
}

// ════════════════════════════════════════════════════════════════
//  BACKGROUND THEMING
// ════════════════════════════════════════════════════════════════

/** Swap weather-condition class on the background layer. */
function updateBackground(condition) {
  // Remove all weather-* classes
  const cls = DOM.bgLayer.className
    .split(' ')
    .filter(c => !c.startsWith('weather-'))
    .join(' ');

  const weatherClass = CONFIG.CONDITION_CLASSES[condition] || '';
  DOM.bgLayer.className = weatherClass ? `${cls} ${weatherClass}` : cls;
}

// ════════════════════════════════════════════════════════════════
//  RECENT CITIES
// ════════════════════════════════════════════════════════════════

function addRecentCity(city) {
  const normalised = city.trim();
  // Remove duplicate (case-insensitive) then prepend
  State.recentCities = [
    normalised,
    ...State.recentCities.filter(c => c.toLowerCase() !== normalised.toLowerCase()),
  ].slice(0, CONFIG.MAX_RECENT_CITIES);

  localStorage.setItem('recentCities', JSON.stringify(State.recentCities));
  renderRecentList();
}

function removeRecentCity(city) {
  State.recentCities = State.recentCities.filter(c => c !== city);
  localStorage.setItem('recentCities', JSON.stringify(State.recentCities));
  renderRecentList();
}

function renderRecentList() {
  DOM.recentList.innerHTML = '';
  DOM.recentSection.style.display = State.recentCities.length ? '' : 'none';

  for (const city of State.recentCities) {
    const li = document.createElement('li');
    li.className = 'recent-item';
    li.innerHTML = `
      <span>${escapeHtml(city)}</span>
      <button class="recent-del" title="Remove" aria-label="Remove ${escapeHtml(city)}">✕</button>
    `;
    li.querySelector('span').addEventListener('click', () => fetchWeatherByCity(city, false));
    li.querySelector('.recent-del').addEventListener('click', e => {
      e.stopPropagation();
      removeRecentCity(city);
    });
    DOM.recentList.appendChild(li);
  }
}

// ════════════════════════════════════════════════════════════════
//  SEVERE WEATHER ALERTS
// ════════════════════════════════════════════════════════════════

function checkSevereWeather(w) {
  if (!CONFIG.SEVERE_CODES.has(w.conditionId)) return;

  const title = '⚠️ Severe Weather Alert';
  const body  = `${w.city}: ${w.description}. Stay safe!`;

  // In-app toast
  showAlert(title, body);

  // Native desktop notification via Electron
  window.electronAPI?.showNotification(title, body);
}

function showAlert(title, msg) {
  DOM.alertTitle.textContent = title;
  DOM.alertMsg.textContent   = msg;
  DOM.alertToast.hidden = false;

  // Auto-dismiss after 8 s
  clearTimeout(showAlert._timer);
  showAlert._timer = setTimeout(hideAlert, 8_000);
}

function hideAlert() {
  DOM.alertToast.hidden = true;
}

// ════════════════════════════════════════════════════════════════
//  UI STATE HELPERS
// ════════════════════════════════════════════════════════════════

function showLoader() {
  DOM.loader.classList.remove('hidden');
  DOM.dashboard.hidden  = true;
  DOM.errorState.hidden = true;
  DOM.emptyState.hidden = true;
}

function showDashboard() {
  DOM.loader.classList.add('hidden');
  DOM.dashboard.hidden  = false;
  DOM.errorState.hidden = true;
  DOM.emptyState.hidden = true;
}

function showEmptyState() {
  DOM.loader.classList.add('hidden');
  DOM.dashboard.hidden  = true;
  DOM.errorState.hidden = true;
  DOM.emptyState.hidden = false;
}

function showError(err) {
  DOM.loader.classList.add('hidden');
  DOM.dashboard.hidden  = true;
  DOM.emptyState.hidden = true;
  DOM.errorState.hidden = false;

  // Map HTTP codes to friendly messages
  const friendly = {
    404: `City not found. Check the spelling and try again.`,
    401: `Invalid API key. Update CONFIG.API_KEY in config.js.`,
    408: `Request timed out. Check your internet connection.`,
    429: `Too many requests. Please wait a moment.`,
    0:   `Network error. Make sure you're connected to the internet.`,
  };

  DOM.errorTitle.textContent = err.code === 404 ? 'City Not Found' : 'Oops!';
  DOM.errorMsg.textContent   = friendly[err.code] || err.message || 'An unexpected error occurred.';
}

// ════════════════════════════════════════════════════════════════
//  FORMATTERS
// ════════════════════════════════════════════════════════════════

/** Format a JS Date to "Mon, 19 May" */
function formatDate(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Format a Unix timestamp + UTC offset to "HH:MM" in local city time. */
function formatUnixTime(unix, tzOffset) {
  const d = new Date((unix + tzOffset) * 1000);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** "2025-05-20" → "Tue" */
function formatDayName(dateStr) {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

/** Basic XSS prevention for city names injected via innerHTML. */
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ════════════════════════════════════════════════════════════════
//  BOOTSTRAP
// ════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', init);
