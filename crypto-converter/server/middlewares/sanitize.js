const sanitizeId = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (!/^[a-z0-9-]+$/.test(trimmed)) return null;
  return trimmed;
};

const sanitizeAmount = (value) => {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) return null;
  return amount;
};

module.exports = {
  sanitizeId,
  sanitizeAmount,
};