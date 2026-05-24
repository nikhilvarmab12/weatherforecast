
# ⛅ WeatherVue

A premium, single-page weather forecast dashboard built with **vanilla HTML, CSS, and JavaScript** — no frameworks, no build tools, no API keys. Just open and go.

> Powered by the free [Open-Meteo API](https://open-meteo.com/). Zero registration, zero cost, zero friction.

---

## ✨ Features

### 🌦️ Real-Time Weather
- **Auto-location detection** via the HTML5 Geolocation API — weather loads instantly on permission
- **Current conditions** at a glance: temperature, feels-like, high/low, description, and dynamic weather icon
- **Secondary metrics grid**: Humidity, Wind Speed, UV Index, Atmospheric Pressure, and Precipitation Probability

### 🔍 City Search & Autocomplete
- Debounced, instant search as you type (350ms)
- Dropdown results showing city name, state/region, and country
- Full keyboard navigation — Arrow keys, Enter to select, Escape to dismiss

### ⏱️ Hourly Forecast
- Horizontally scrollable 24-hour timeline
- Each hour shows time, weather icon, and temperature
- "Now" indicator highlights the current hour with an accent glow

### 📅 7-Day Forecast
- Day-by-day vertical list with weather icons and descriptions
- **Temperature range bars** scaled across the full week for visual comparison of min/max temperatures

### 🎨 Premium Design
- **Dark glassmorphism aesthetic** — frosted glass cards, subtle blurs, glowing gradients
- **Dynamic weather themes** — the entire color palette shifts based on current conditions:
  | Condition | Palette |
  |-----------|---------|
  | ☀️ Clear / Sunny | Warm golden amber |
  | ☁️ Cloudy / Overcast | Muted steel blue |
  | 🌧️ Rain / Drizzle | Deep indigo blue |
  | ❄️ Snow | Soft icy cyan |
  | ⛈️ Thunderstorm | Electric purple |
  | 🌫️ Fog | Desaturated grey |
  | 🌙 Night | Dark starry blue |
- **Animated background orbs** that float and drift continuously
- **Micro-interactions**: hover scale on cards, pulsing glow on temperature, floating weather icon, staggered fade-in animations
- **Shimmer skeleton loaders** instead of boring "Loading…" text
- **Custom scrollbars** and smooth transitions throughout

### 🛡️ Robust Error Handling
- **Offline detection** — friendly message when you lose connection, with auto-retry on reconnect
- **Location denied** — helpful card guiding users to search manually
- **API failures** — clear error state with a retry button
- **No results** — graceful empty state for unrecognized city names
- **localStorage caching** — the last viewed city loads instantly on return visits, no waiting for geolocation

---

## 🚀 Getting Started

### Prerequisites

A modern web browser. That's it. No Node.js, no npm, no build step.

### Run Locally

```bash
# Clone the repository
git clone https://github.com/nikhilvarmab12/weatherforecast.git
cd weathervue

# Open in your browser
# Option 1: Double-click index.html
# Option 2: Use a local server (recommended for best experience)
npx serve .
# or
python -m http.server 8000
```

> **Note**: The app works by opening `index.html` directly, but using a local server avoids potential CORS issues with some browsers.

---

## 📂 Project Structure

```
weathervue/
├── index.html      # Semantic HTML5 layout — all sections and state containers
├── style.css       # Design system — glassmorphism, themes, animations, responsive grid
├── app.js          # Weather engine — API calls, rendering, state management, caching
└── README.md       # You are here
```

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | ~130 | Semantic markup with ARIA roles, search form, dashboard sections, and 6 error/empty state containers |
| `style.css` | ~480 | CSS custom properties for dynamic theming, glassmorphism tokens, grid/flexbox layouts, keyframe animations, responsive breakpoints |
| `app.js` | ~610 | Async/await API integration, WMO weather code mapping, DOM rendering, debounced search, geolocation, localStorage cache, online/offline listeners |

---

## 🔗 APIs Used

All endpoints are **100% free** with **no API key** required.

### Geocoding (City Search)
```
GET https://geocoding-api.open-meteo.com/v1/search
    ?name={query}&count=5&language=en&format=json
```
Returns matching cities with name, state, country, latitude, and longitude.

### Weather Forecast
```
GET https://api.open-meteo.com/v1/forecast
    ?latitude={lat}&longitude={lon}
    &current=temperature_2m,relative_humidity_2m,apparent_temperature,
             is_day,precipitation,weather_code,pressure_msl,wind_speed_10m
    &hourly=temperature_2m,precipitation_probability,weather_code,is_day
    &daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max
    &timezone=auto
```
Returns current conditions, 7 days of hourly data, and 7-day daily summaries.

### WMO Weather Codes
The API returns integer `weather_code` values mapped to conditions:

| Code | Condition | Day Icon | Night Icon |
|------|-----------|----------|------------|
| 0 | Clear sky | ☀️ | 🌙 |
| 1–3 | Partly cloudy → Overcast | 🌤️ ⛅ ☁️ | 🌙 ☁️ |
| 45, 48 | Fog | 🌫️ | 🌫️ |
| 51–55 | Drizzle | 🌧️ | 🌧️ |
| 61–65 | Rain | 🌧️ | 🌧️ |
| 71–75 | Snow | 🌨️ ❄️ | 🌨️ ❄️ |
| 80–82 | Showers | 🌦️ | 🌧️ |
| 95–99 | Thunderstorm | ⛈️ | ⛈️ |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    index.html                        │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Search   │  │  State Cards │  │   Dashboard   │  │
│  │  + A11y   │  │  (6 states)  │  │  Hero|Metrics │  │
│  │  Dropdown │  │              │  │  Hourly|Daily │  │
│  └──────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────┐
│                     app.js                           │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ API Layer │  │  Rendering   │  │    State      │  │
│  │ fetch()   │  │  DOM updates │  │  Management   │  │
│  │ geocoding │  │  WMO mapping │  │  Cache/Geo    │  │
│  └──────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────┐
│                    style.css                         │
│  CSS Custom Properties (dynamic weather theming)     │
│  Glassmorphism tokens · Responsive grid · Keyframes  │
└─────────────────────────────────────────────────────┘
```

---

## 📱 Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| < 768px | Single column, stacked cards (mobile-first) |
| ≥ 768px | 2-column grid, full-width hero and hourly |
| ≥ 1024px | Hero + metrics side-by-side, optimized spacing |
| ≥ 1200px | Hourly and daily side-by-side in bottom row |

---

## 🎯 Browser Support

| Browser | Supported |
|---------|-----------|
| Chrome 80+ | ✅ |
| Firefox 78+ | ✅ |
| Safari 14+ | ✅ |
| Edge 80+ | ✅ |

> Requires support for `backdrop-filter`, `CSS Custom Properties`, `async/await`, and `AbortController`.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgements

- **[Open-Meteo](https://open-meteo.com/)** — Free, open-source weather API with no key required
- **[Google Fonts — Outfit](https://fonts.google.com/specimen/Outfit)** — Premium sans-serif typeface
- **[WMO Weather Codes](https://www.nodc.noaa.gov/archive/arc0021/0002199/1.1/data/0-data/HTML/WMO-CODE/WMO4677.HTM)** — Standardized weather interpretation codes

---

