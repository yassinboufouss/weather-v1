
const CONFIG = {
  API_KEY:  'aab28b7f8469b71bc6980b988483b4ea',   // 🔑 Replace this!
  BASE_URL: 'https://api.openweathermap.org/data/2.5',

  MAX_RECENT_CITIES: 8,
  CACHE_DURATION_MS: 5 * 60_000,  // 5 minutes

  SEVERE_CODES: new Set([
    200, 201, 202, 210, 211, 212, 221, 230, 231, 232,
    504, 511,
    600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622,
    781, 751, 761, 762,
  ]),

  CONDITION_CLASSES: {
    Thunderstorm: 'weather-storm',
    Drizzle:      'weather-rain',
    Rain:         'weather-rain',
    Snow:         'weather-snow',
    Clear:        'weather-clear',
    Clouds:       'weather-clouds',
    Mist:         'weather-clouds',
    Fog:          'weather-clouds',
    Haze:         'weather-clouds',
    Smoke:        'weather-clouds',
    Dust:         'weather-clouds',
    Sand:         'weather-clouds',
    Ash:          'weather-clouds',
    Squall:       'weather-storm',
    Tornado:      'weather-storm',
  },
};

// Guard: warn loudly if the API key was never set
if (CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
  console.warn(
    '%c⚠ WeatherApp: API key not set!\n' +
    'Open src/js/config.js and replace YOUR_API_KEY_HERE\n' +
    'Get a free key at https://openweathermap.org/api',
    'color: orange; font-size: 14px; font-weight: bold;'
  );
}
