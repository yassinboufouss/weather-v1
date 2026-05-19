

const WeatherService = (() => {

  // ── In-memory cache: city key → { data, timestamp } ───────
  const _cache = new Map();

  /**
   * Build a full OWM API URL.
   * @param {string} endpoint  e.g. 'weather' or 'forecast'
   * @param {Object} params    Query-string key/value pairs
   */
  function _buildURL(endpoint, params) {
    const url = new URL(`${CONFIG.BASE_URL}/${endpoint}`);
    url.searchParams.set('appid', CONFIG.API_KEY);
    url.searchParams.set('units', 'metric'); // Always fetch in °C; convert in UI
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    return url.toString();
  }

  /**
   * Generic fetch wrapper — routes through Electron main process via IPC.
   * This completely bypasses renderer CSP and CORS restrictions.
   */
  async function _fetch(url) {
    try {
      const result = await window.electronAPI.fetchUrl(url);

      let parsed;
      try { parsed = JSON.parse(result.body); }
      catch { throw new WeatherError('Invalid response from server.', 0); }

      if (result.status !== 200) {
        const msg = parsed.message || `HTTP ${result.status}`;
        throw new WeatherError(msg, result.status);
      }

      return parsed;
    } catch (err) {
      if (err instanceof WeatherError) throw err;
      const msg = err.message || 'Network error. Are you online?';
      if (msg.includes('timed out')) throw new WeatherError('Request timed out. Check your connection.', 408);
      throw new WeatherError('Network error. Are you online?', 0);
    }
  }

  /**
   * Check cache; return cached data if still fresh.
   */
  function _getCached(key) {
    const entry = _cache.get(key);
    if (!entry) return null;
    const age = Date.now() - entry.timestamp;
    return age < CONFIG.CACHE_DURATION_MS ? entry.data : null;
  }

  // ── Public API ──────────────────────────────────────────────

  /**
   * Fetch current weather by city name.
   * @param {string} city
   * @returns {Promise<WeatherData>}
   */
  async function getCurrentByCity(city) {
    const key = `current:${city.toLowerCase().trim()}`;
    const cached = _getCached(key);
    if (cached) return cached;

    const raw = await _fetch(_buildURL('weather', { q: city }));
    const data = _parseCurrentWeather(raw);
    _cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Fetch current weather by GPS coordinates.
   * @param {number} lat
   * @param {number} lon
   * @returns {Promise<WeatherData>}
   */
  async function getCurrentByCoords(lat, lon) {
    const key = `current:${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = _getCached(key);
    if (cached) return cached;

    const raw = await _fetch(_buildURL('weather', { lat, lon }));
    const data = _parseCurrentWeather(raw);
    _cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Fetch 5-day forecast by city name.
   * @param {string} city
   * @returns {Promise<ForecastDay[]>}
   */
  async function getForecastByCity(city) {
    const key = `forecast:${city.toLowerCase().trim()}`;
    const cached = _getCached(key);
    if (cached) return cached;

    const raw = await _fetch(_buildURL('forecast', { q: city }));
    const data = _parseForecast(raw);
    _cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Fetch 5-day forecast by GPS coordinates.
   */
  async function getForecastByCoords(lat, lon) {
    const key = `forecast:${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = _getCached(key);
    if (cached) return cached;

    const raw = await _fetch(_buildURL('forecast', { lat, lon }));
    const data = _parseForecast(raw);
    _cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  // ── Parsers ─────────────────────────────────────────────────

  /**
   * Normalise OWM current-weather response into our shape.
   * @typedef {Object} WeatherData
   */
  function _parseCurrentWeather(raw) {
    return {
      city:        raw.name,
      country:     raw.sys.country,
      lat:         raw.coord.lat,
      lon:         raw.coord.lon,
      tempC:       Math.round(raw.main.temp),
      feelsLikeC:  Math.round(raw.main.feels_like),
      humidity:    raw.main.humidity,
      windSpeed:   Math.round(raw.wind.speed * 3.6),   // m/s → km/h
      condition:   raw.weather[0].main,
      description: raw.weather[0].description,
      icon:        raw.weather[0].icon,
      conditionId: raw.weather[0].id,
      sunrise:     raw.sys.sunrise,   // Unix timestamp (UTC)
      sunset:      raw.sys.sunset,
      timezone:    raw.timezone,      // UTC offset in seconds
    };
  }

  /**
   * Aggregate 3-hour slots into one entry per day.
   * @typedef {Object} ForecastDay
   */
  function _parseForecast(raw) {
    const days = {};

    for (const item of raw.list) {
      // Key by YYYY-MM-DD in the city's local time
      const localDate = new Date((item.dt + raw.city.timezone) * 1000);
      const key = localDate.toISOString().split('T')[0];

      if (!days[key]) {
        days[key] = { date: key, temps: [], icons: [], descs: [] };
      }
      days[key].temps.push(item.main.temp);
      days[key].icons.push(item.weather[0].icon);
      days[key].descs.push(item.weather[0].description);
    }

    // Convert to array, skip today, take next 5 days
    return Object.values(days).slice(1, 6).map(day => ({
      date:    day.date,
      highC:   Math.round(Math.max(...day.temps)),
      lowC:    Math.round(Math.min(...day.temps)),
      // Use the noon icon (or closest); fallback to first
      icon:    day.icons[Math.floor(day.icons.length / 2)] || day.icons[0],
      // Most common description
      desc:    _mode(day.descs),
    }));
  }

  /** Return the most frequently occurring value in an array. */
  function _mode(arr) {
    const freq = {};
    let max = 0, result = arr[0];
    for (const v of arr) {
      freq[v] = (freq[v] || 0) + 1;
      if (freq[v] > max) { max = freq[v]; result = v; }
    }
    return result;
  }

  return { getCurrentByCity, getCurrentByCoords, getForecastByCity, getForecastByCoords };
})();

// ── Custom error class ─────────────────────────────────────────
class WeatherError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'WeatherError';
    this.code = code;
  }
}
