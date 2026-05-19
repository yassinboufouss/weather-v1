# 🌤 WeatherApp — Electron Desktop App

A beautiful, modern desktop weather application built with **Electron.js**, vanilla JavaScript, HTML & CSS.

---

## 📁 Project Structure

```
weather-app/
├── main.js              # Electron main process
├── preload.js           # Secure IPC bridge (contextBridge)
├── package.json
├── README.md
└── src/
    ├── index.html       # App shell
    ├── assets/
    │   └── icon.png     # App icon (add your own 512×512 PNG)
    ├── css/
    │   └── style.css    # All styles (glassmorphism, dark/light, animations)
    └── js/
        ├── config.js    # API key + constants
        ├── weather.js   # OpenWeatherMap API service
        ├── canvas.js    # Particle effects (rain, snow, stars)
        └── app.js       # Main UI controller
```

---

## 🚀 Installation

### Prerequisites
- **Node.js** ≥ 18  →  https://nodejs.org
- An **OpenWeatherMap API key** (free)  →  https://openweathermap.org/api

### Steps

```bash
# 1. Clone / extract the project
cd weather-app

# 2. Install dependencies
npm install

# 3. Add your API key
#    Open src/js/config.js and replace:
#      API_KEY: 'YOUR_API_KEY_HERE'
#    with your real key, e.g.:
#      API_KEY: 'a1b2c3d4e5f6...'

# 4. Run in development mode
npm run dev

# 5. Run normally
npm start
```

---

## 🔑 API Key Setup

1. Go to https://openweathermap.org/api
2. Sign up for a free account
3. Navigate to **My API Keys**
4. Copy your key
5. Open `src/js/config.js` and paste it:

```js
API_KEY: 'paste_your_key_here',
```

> ⚠️ Free-tier keys may take up to 2 hours to activate after creation.

---

## 📦 npm Packages

| Package | Purpose |
|---------|---------|
| `electron` | Desktop app framework |
| `electron-builder` | Cross-platform packaging / installer |

No other runtime dependencies — everything is vanilla JS.

---

## 🏗 Build Executable

### Windows (.exe installer)
```bash
npm run build:win
```
Output: `dist/WeatherApp Setup 1.0.0.exe`

### macOS (.dmg)
```bash
npm run build:mac
```
Output: `dist/WeatherApp-1.0.0.dmg`

### Linux (.AppImage)
```bash
npm run build:linux
```
Output: `dist/WeatherApp-1.0.0.AppImage`

### All platforms
```bash
npm run build:all
```

> **Note:** Building for macOS requires a Mac. Building for Windows on Mac/Linux requires Wine.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| **Real-time weather** | Current temp, condition, humidity, wind, feels like, sunrise/sunset |
| **5-day forecast** | Daily high/low + condition icons |
| **City search** | Type + Enter or click arrow button |
| **Geolocation** | "My Location" button auto-detects via browser GPS |
| **Recent cities** | Last 8 searches saved to localStorage |
| **°C / °F toggle** | Instant conversion, persisted between sessions |
| **Dark / Light mode** | Toggle button in title bar, persisted |
| **Dynamic backgrounds** | Gradient orbs + particle canvas change per weather condition |
| **Severe weather alerts** | In-app toast + native OS notification |
| **Glassmorphism UI** | Blur-backdrop glass cards throughout |
| **Loading animation** | Spinner while fetching data |
| **Error handling** | Friendly messages for 404, 401, network errors |
| **Request caching** | 5-minute in-memory cache to avoid redundant API calls |
| **Custom title bar** | Frameless Electron window with minimize/maximize/close |
| **Keyboard support** | Press Enter to search |

---

## 🎨 Design

- **Display font:** Syne (800 weight for headings)
- **Body font:** DM Sans (300–500 weight)
- **Style:** Glassmorphism dashboard with animated gradient orbs
- **Particle effects:** Rain, snow, or twinkling stars based on condition
- **Colour palette adapts** to weather condition (rain = blue tones, clear = warm gold, storm = purple)

---

## 🔧 Configuration (`src/js/config.js`)

```js
CONFIG.API_KEY            // Your OpenWeatherMap key
CONFIG.MAX_RECENT_CITIES  // How many cities to remember (default: 8)
CONFIG.CACHE_DURATION_MS  // Cache lifetime in ms (default: 5 min)
CONFIG.SEVERE_CODES       // Set of OWM condition IDs that trigger alerts
CONFIG.CONDITION_CLASSES  // Maps OWM condition names to CSS background classes
```

---

## 🛠 Development Tips

- Run with `npm run dev` to open DevTools automatically
- The app uses `contextBridge` + `preload.js` for secure IPC — never enable `nodeIntegration: true`
- To add a custom app icon, replace `src/assets/icon.png` with a 512×512 PNG
  - For Windows builds, also add `src/assets/icon.ico`
  - For macOS builds, also add `src/assets/icon.icns`

---

## 📄 License

MIT
