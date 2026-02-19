const { getUsdPrices, getCoinsList, getTrend } = require('../services/coingeckoService');
const { sanitizeId, sanitizeAmount } = require('../middlewares/sanitize');

const convert = async (req, res, next) => {
  try {
    const from = sanitizeId(req.query.from);
    const to = sanitizeId(req.query.to);
    const amount = sanitizeAmount(req.query.amount);

    if (!from || !to || amount === null) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters. Expected from, to, and amount.',
      });
    }

    const prices = await getUsdPrices([from, to]);
    const fromPrice = prices[from];
    const toPrice = prices[to];

    if (!fromPrice || !toPrice) {
      return res.status(404).json({
        success: false,
        error: 'Unable to fetch prices for the provided currencies.',
      });
    }

    const result = (amount * fromPrice) / toPrice;

    return res.json({
      success: true,
      from,
      to,
      amount,
      result: Number(result.toFixed(12)),
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
};

const coins = async (req, res, next) => {
  try {
    const list = await getCoinsList();
    const payload = list
      .filter((coin) => coin.id && coin.name)
      .map((coin) => ({ id: coin.id, name: coin.name, symbol: coin.symbol }));

    return res.json({ success: true, data: payload });
  } catch (err) {
    return next(err);
  }
};

const trend = async (req, res, next) => {
  try {
    const coinId = sanitizeId(req.query.coin);
    if (!coinId) {
      return res.status(400).json({ success: false, error: 'Invalid coin id.' });
    }

    const series = await getTrend(coinId);
    return res.json({ success: true, data: series, lastUpdated: new Date().toISOString() });
  } catch (err) {
    return next(err);
  }
};

const health = (req, res) => {
  res.json({ success: true, status: 'ok' });
};

module.exports = {
  convert,
  coins,
  trend,
  health,
};