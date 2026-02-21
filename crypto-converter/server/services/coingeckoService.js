const axios = require('axios');

const API_KEY = process.env.free_cryptocurrency_api_key;
const API_BASE_URL = 'https://api.freecryptoapi.com/v1';

const PRICE_TTL_MS = 5 * 60 * 1000;
const COINS_TTL_MS = 12 * 60 * 60 * 1000;
const TREND_TTL_MS = 10 * 60 * 1000;

const priceCache = new Map();
const coinsCache = { data: null, expiresAt: 0 };
const trendCache = new Map();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Accept': 'application/json'
  },
});

const now = () => Date.now();

const getCachedPrice = (id) => {
  const entry = priceCache.get(id);
  if (!entry) return null;
  if (entry.expiresAt < now()) {
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
    const cachedUpper = getCachedPrice(id.toUpperCase());

    if (cached !== null) {
      results[id] = cached;
    } else if (cachedUpper !== null) {
      results[id] = cachedUpper;
    } else {
      missing.push(id.toUpperCase());
    }
  });

  if (missing.length > 0) {
    try {
      const response = await api.get('/getData', {
        params: { symbol: missing.join(',') },
      });

      const data = response.data.data || response.data || [];
      const dataArray = Array.isArray(data) ? data : [data];

      dataArray.forEach((coin) => {
        const symbol = coin.symbol ? coin.symbol.toLowerCase() : null;
        const price = coin.price_usd || coin.price || coin.close;

        if (symbol && typeof price === 'number') {
          // Store both lowercase and uppercase variations
          setCachedPrice(symbol, price);
          setCachedPrice(symbol.toUpperCase(), price);

          // Map back to requested ID if it matches
          if (missing.includes(symbol.toUpperCase())) {
            results[symbol] = price;
            // Also add the original requested ID if different
            ids.forEach(reqId => {
              if (reqId.toLowerCase() === symbol) {
                results[reqId] = price;
              }
            });
          }
        }
      });
    } catch (error) {
      console.warn('FreeCryptoAPI price fetch warning:', error.message);
    }
  }

  return results;
};

const getCoinsList = async () => {
  if (coinsCache.data && coinsCache.expiresAt > now()) {
    return coinsCache.data;
  }

  try {
    const response = await api.get('/getCryptoList');
    let rawList = response.data.data || response.data || [];

    // Ensure rawList is an array
    if (!Array.isArray(rawList)) {
      if (rawList.list && Array.isArray(rawList.list)) rawList = rawList.list;
      else if (rawList.coins && Array.isArray(rawList.coins)) rawList = rawList.coins;
      else {
        console.warn('Unexpected API response format for /getCryptoList:', JSON.stringify(rawList));
        rawList = [];
      }
    }

    // Map to our standard format: { id, symbol, name }
    // We use lowercase symbol as 'id' to be consistent with getUsdPrices
    const list = rawList.map((coin) => ({
      id: (coin.symbol || coin.code || '').toLowerCase(),
      symbol: (coin.symbol || coin.code || '').toLowerCase(),
      name: coin.name || 'Unknown',
    })).filter(c => c.id);

    coinsCache.data = list;
    coinsCache.expiresAt = now() + COINS_TTL_MS;
    return list;
  } catch (error) {
    console.error('Error fetching coins list:', error.message);
    if (coinsCache.data) return coinsCache.data;

    // Fallback static list
    return [
      { id: 'btc', symbol: 'btc', name: 'Bitcoin' },
      { id: 'eth', symbol: 'eth', name: 'Ethereum' },
      { id: 'usdt', symbol: 'usdt', name: 'Tether' },
      { id: 'bnb', symbol: 'bnb', name: 'BNB' },
      { id: 'sol', symbol: 'sol', name: 'Solana' },
      { id: 'xrp', symbol: 'xrp', name: 'XRP' },
      { id: 'ada', symbol: 'ada', name: 'Cardano' },
      { id: 'doge', symbol: 'doge', name: 'Dogecoin' },
    ];
  }
};

const getTrend = async (id) => {
  const cached = trendCache.get(id);
  if (cached && cached.expiresAt > now()) {
    return cached.value;
  }

  try {
    // API likely expects uppercase symbol
    const symbol = id.toUpperCase();
    const response = await api.get('/getHistory', {
      params: { symbol: symbol, interval: '1h', limit: 24 },
    });

    const data = response.data.data || response.data || [];

    // Map response to { time, value }
    const series = data.map((point) => ({
      time: Math.floor((new Date(point.time || point.date).getTime()) / 1000), // Ensure unix timestamp
      value: point.close || point.price,
    })).sort((a, b) => a.time - b.time); // Ensure sorted by time

    trendCache.set(id, { value: series, expiresAt: now() + TREND_TTL_MS });
    return series;
  } catch (error) {
    console.error(`Error fetching trend for ${id}:`, error.message);

    // Mock data fallback
    if (cached) return cached.value;

    const nowSec = Math.floor(Date.now() / 1000);
    const mockData = Array.from({ length: 24 }, (_, i) => ({
      time: nowSec - (23 - i) * 3600,
      value: 1000 + Math.random() * 500
    }));
    return mockData;
  }
};

module.exports = {
  getUsdPrices,
  getCoinsList,
  getTrend,
};