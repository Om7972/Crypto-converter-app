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

    let prices = await getUsdPrices([from, to]);
    let fromPrice = prices[from];
    let toPrice = prices[to];

    // Retry mechanism: If prices are missing, try to find symbol from coin list
    if (!fromPrice || !toPrice) {
      const coinsList = await getCoinsList();

      const findSymbol = (id) => {
        const coin = coinsList.find(c => c.id === id || c.name.toLowerCase() === id.toLowerCase());
        return coin ? coin.symbol : id;
      };

      const fromSymbol = findSymbol(from);
      const toSymbol = findSymbol(to);

      if (fromSymbol !== from || toSymbol !== to) {
        prices = await getUsdPrices([fromSymbol, toSymbol]);
        // Update price refs, checking both symbol and original id
        fromPrice = prices[fromSymbol] || prices[from];
        toPrice = prices[toSymbol] || prices[to];
      }
    }

    if (!fromPrice || !toPrice) {
      return res.status(404).json({
        success: false,
        error: `Unable to fetch prices for ${!fromPrice ? from : ''} ${!toPrice ? to : ''}`.trim(),
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