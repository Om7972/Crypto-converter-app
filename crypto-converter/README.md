# Crypto Converter

Production-ready crypto converter with a secure Node.js/Express backend and a modern vanilla JS frontend.

## Features
- Live conversion using CoinGecko
- Glassmorphism UI, light/dark mode
- Searchable dropdowns + keyboard navigation
- Auto-convert while typing
- Swap currencies
- Conversion history + favorites
- 24h mini trend chart
- Offline banner, toasts, skeleton loaders
- In-memory price cache (60s)

## Tech
- Node.js, Express, Axios
- MVC architecture
- Helmet, rate limiting, CORS, compression, logging
- Vanilla JS, HTML5, CSS3

## Folder Structure
```
crypto-converter/
  public/
    index.html
    styles.css
    app.js
  server/
    controllers/
    middlewares/
    routes/
    services/
    server.js
  scripts/
    build.js
```

## Setup
1. Install dependencies:
```
npm install
```

2. Create `.env`:
```
cp .env.example .env
```

3. Run in dev:
```
npm run dev
```

App will be served at `http://localhost:5000`.

## Build for Production
```
npm run build
NODE_ENV=production npm start
```

Build outputs to `dist/`. In production mode, the server will serve `dist/` if present.

## API
- `GET /api/convert?from=bitcoin&to=ethereum&amount=1`
- `GET /api/coins`
- `GET /api/trend?coin=bitcoin`
- `GET /api/health`

## Deployment Steps
1. `npm install`
2. Add `.env`
3. `npm run build`
4. `NODE_ENV=production npm start`

## Notes
- CoinGecko API is public and rate limited. Caching and backend rate limiting are enabled.
- No secrets are exposed to the frontend.