const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.coingecko.com/api/v3';
const PRICE_TTL_MS = 60 * 1000;
const COINS_TTL_MS = 12 * 60 * 60 * 1000;
const TREND_TTL_MS = 60 * 1000;

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
    priceCache.delete(id);
    return null;
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
  }

  return results;
};

const getCoinsList = async () => {
  if (coinsCache.data && coinsCache.expiresAt > now()) {
    return coinsCache.data;
  }

  const response = await api.get('/coins/list');
  coinsCache.data = response.data || [];
  coinsCache.expiresAt = now() + COINS_TTL_MS;
  return coinsCache.data;
};

const getTrend = async (id) => {
  const cached = trendCache.get(id);
  if (cached && cached.expiresAt > now()) {
    return cached.value;
  }

  const response = await api.get(`/coins/${id}/market_chart`, {
    params: { vs_currency: 'usd', days: 1, interval: 'hourly' },
  });

  const series = (response.data?.prices || []).map((point) => ({
    time: Math.floor(point[0] / 1000),
    value: point[1],
  }));

  trendCache.set(id, { value: series, expiresAt: now() + TREND_TTL_MS });
  return series;
};

module.exports = {
  getUsdPrices,
  getCoinsList,
  getTrend,
};