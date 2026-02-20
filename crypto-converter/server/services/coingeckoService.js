const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.coingecko.com/api/v3';
const PRICE_TTL_MS = 5 * 60 * 1000; // Increased to 5 minutes for better rate limit management
const COINS_TTL_MS = 12 * 60 * 60 * 1000;
const TREND_TTL_MS = 10 * 60 * 1000; // Increased to 10 minutes

const priceCache = new Map();
const coinsCache = { data: null, expiresAt: 0 };
const trendCache = new Map();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: { Accept: 'application/json' },
});

const now = () => Date.now();

const getCachedPrice = (id) => {
  const entry = priceCache.get(id);
  if (!entry) return null;
  if (entry.expiresAt < now()) {
    return null; // Expired, but we keep it in Map for stale fallback
  }
  return entry.value;
};

const setCachedPrice = (id, value) => {
  priceCache.set(id, { value, expiresAt: now() + PRICE_TTL_MS });
};

const getUsdPrices = async (ids) => {
  const results = {};
  const missing = [];

  ids.forEach((id) => {
    const cached = getCachedPrice(id);
    if (cached !== null) {
      results[id] = cached;
    } else {
      missing.push(id);
    }
  });

  if (missing.length > 0) {
    try {
      const response = await api.get('/simple/price', {
        params: {
          ids: missing.join(','),
          vs_currencies: 'usd',
        },
      });

      missing.forEach((id) => {
        const value = response.data?.[id]?.usd;
        if (typeof value === 'number') {
          results[id] = value;
          setCachedPrice(id, value);
        }
      });
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.warn('CoinGecko API rate limit hit. Falling back to stale cache.');
        missing.forEach((id) => {
          const entry = priceCache.get(id);
          if (entry) {
            results[id] = entry.value;
            // Optionally extend expiry slightly to avoid immediate retry storm
            entry.expiresAt = now() + 60 * 1000;
            priceCache.set(id, entry);
          }
        });
      } else {
        console.error('Error fetching prices from CoinGecko:', error.message);
        // Don't throw, let it return partial results so app doesn't crash
      }
    }
  }

  return results;
};

const getCoinsList = async () => {
  if (coinsCache.data && coinsCache.expiresAt > now()) {
    return coinsCache.data;
  }

  try {
    const response = await api.get('/coins/list');
    coinsCache.data = response.data || [];
    coinsCache.expiresAt = now() + COINS_TTL_MS;
    return coinsCache.data;
  } catch (error) {
    console.error('Error fetching coins list:', error.message);
    if (coinsCache.data) return coinsCache.data; // Return stale if available

    // Fallback static list
    return [
      { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
      { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
      { id: 'tether', symbol: 'usdt', name: 'Tether' },
      { id: 'binancecoin', symbol: 'bnb', name: 'BNB' },
      { id: 'solana', symbol: 'sol', name: 'Solana' },
      { id: 'ripple', symbol: 'xrp', name: 'XRP' },
      { id: 'cardano', symbol: 'ada', name: 'Cardano' },
      { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin' },
    ];
  }
};

const getTrend = async (id) => {
  const cached = trendCache.get(id);
  if (cached && cached.expiresAt > now()) {
    return cached.value;
  }

  try {
    const response = await api.get(`/coins/${id}/market_chart`, {
      params: { vs_currency: 'usd', days: 1, interval: 'hourly' },
    });

    const series = (response.data?.prices || []).map((point) => ({
      time: Math.floor(point[0] / 1000),
      value: point[1],
    }));

    trendCache.set(id, { value: series, expiresAt: now() + TREND_TTL_MS });
    return series;
  } catch (error) {
    console.error(`Error fetching trend for ${id}:`, error.message);

    // Fallback to mock data on 401 (Unauthorized) or if no cache
    if (error.response?.status === 401 || !cached) {
      console.warn(`Generating mock trend data for ${id}`);
      const mockData = Array.from({ length: 24 }, (_, i) => ({
        time: Math.floor(Date.now() / 1000) - (23 - i) * 3600,
        value: 10000 + Math.random() * 5000 // Generic mock value
      }));
      return mockData;
    }

    if (cached) return cached.value;
    return [];
  }
};

module.exports = {
  getUsdPrices,
  getCoinsList,
  getTrend,
};