const elements = {
  fromInput: document.getElementById('fromInput'),
  toInput: document.getElementById('toInput'),
  fromList: document.getElementById('fromList'),
  toList: document.getElementById('toList'),
  amountInput: document.getElementById('amountInput'),
  convertBtn: document.getElementById('convertBtn'),
  copyBtn: document.getElementById('copyBtn'),
  swapBtn: document.getElementById('swapBtn'),
  favoriteBtn: document.getElementById('favoriteBtn'),
  result: document.getElementById('result'),
  status: document.getElementById('status'),
  lastUpdated: document.getElementById('lastUpdated'),
  toast: document.getElementById('toast'),
  offline: document.getElementById('offline'),
  historyList: document.getElementById('historyList'),
  favoriteList: document.getElementById('favoriteList'),
  themeToggle: document.getElementById('themeToggle'),
  chart: document.getElementById('chart'),
  trendLabel: document.getElementById('trendLabel'),
};

const state = {
  coins: [],
  from: null,
  to: null,
  amount: 1,
  loading: false,
  history: [],
  favorites: [],
  lastUpdated: null,
  theme: localStorage.getItem('theme') || 'light',
  chart: null,
  series: null,
};

const STORAGE_KEYS = {
  history: 'crypto-history',
  favorites: 'crypto-favorites',
  last: 'crypto-last',
  theme: 'theme',
};

const setTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  state.theme = theme;
  localStorage.setItem(STORAGE_KEYS.theme, theme);
};

const showToast = (message) => {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  window.clearTimeout(elements.toast._timer);
  elements.toast._timer = window.setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 2500);
};

const setComboLoading = (loading) => {
  document.querySelectorAll('.combo').forEach((combo) => {
    combo.classList.toggle('loading', loading);
  });
};

const setLoading = (loading) => {
  state.loading = loading;
  elements.convertBtn.disabled = loading;
  elements.convertBtn.classList.toggle('loading', loading);
};

const formatResult = (value) => {
  if (!Number.isFinite(value)) return '--';
  return value.toFixed(8);
};

const saveState = () => {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
  localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(state.favorites));
};

const loadState = () => {
  try {
    state.history = JSON.parse(localStorage.getItem(STORAGE_KEYS.history)) || [];
    state.favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites)) || [];
    const last = JSON.parse(localStorage.getItem(STORAGE_KEYS.last));
    if (last) {
      state.from = last.from;
      state.to = last.to;
      state.amount = last.amount;
    }
  } catch (err) {
    state.history = [];
    state.favorites = [];
  }
};

const updateHistory = (entry) => {
  state.history = [entry, ...state.history.filter((item) => item.key !== entry.key)].slice(0, 10);
  renderHistory();
  saveState();
};

const updateFavorites = () => {
  renderFavorites();
  saveState();
};

const renderHistory = () => {
  elements.historyList.innerHTML = '';
  if (!state.history.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No conversions yet.';
    elements.historyList.appendChild(empty);
    return;
  }

  state.history.forEach((item) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${item.fromLabel} ? ${item.toLabel} • ${item.amount}</span>`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Use';
    btn.addEventListener('click', () => {
      selectCoin('from', item.fromId);
      selectCoin('to', item.toId);
      elements.amountInput.value = item.amount;
      state.amount = item.amount;
      triggerConvert();
    });
    li.appendChild(btn);
    elements.historyList.appendChild(li);
  });
};

const renderFavorites = () => {
  elements.favoriteList.innerHTML = '';
  if (!state.favorites.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No favorites saved.';
    elements.favoriteList.appendChild(empty);
    return;
  }

  state.favorites.forEach((pair) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${pair.fromLabel} ? ${pair.toLabel}</span>`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Use';
    btn.addEventListener('click', () => {
      selectCoin('from', pair.fromId);
      selectCoin('to', pair.toId);
      triggerConvert();
    });
    li.appendChild(btn);
    elements.favoriteList.appendChild(li);
  });
};

const sanitizeInput = (value) => value.replace(/[^a-z0-9-]/gi, '');

const createCombo = (type) => {
  const input = type === 'from' ? elements.fromInput : elements.toInput;
  const list = type === 'from' ? elements.fromList : elements.toList;
  const combo = input.closest('.combo');
  const toggle = combo.querySelector('.combo-toggle');

  const renderList = (items) => {
    list.innerHTML = '';
    items.forEach((coin, index) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.textContent = `${coin.name} (${coin.symbol?.toUpperCase() || ''})`;
      li.dataset.value = coin.id;
      if (index === 0) li.classList.add('active');
      li.addEventListener('click', () => {
        selectCoin(type, coin.id);
        closeCombo(combo);
        triggerConvert();
      });
      list.appendChild(li);
    });
  };

  const openCombo = () => {
    combo.classList.add('open');
    input.setAttribute('aria-expanded', 'true');
  };

  const closeCombo = () => {
    combo.classList.remove('open');
    input.setAttribute('aria-expanded', 'false');
  };

  input.addEventListener('focus', () => {
    openCombo();
    renderList(filterCoins(input.value));
  });

  input.addEventListener('input', () => {
    openCombo();
    renderList(filterCoins(input.value));
  });

  input.addEventListener('keydown', (event) => {
    const options = Array.from(list.querySelectorAll('li'));
    const currentIndex = options.findIndex((el) => el.classList.contains('active'));

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = Math.min(currentIndex + 1, options.length - 1);
      options.forEach((el) => el.classList.remove('active'));
      if (options[nextIndex]) options[nextIndex].classList.add('active');
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = Math.max(currentIndex - 1, 0);
      options.forEach((el) => el.classList.remove('active'));
      if (options[nextIndex]) options[nextIndex].classList.add('active');
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const active = list.querySelector('li.active');
      if (active) {
        selectCoin(type, active.dataset.value);
        closeCombo(combo);
        triggerConvert();
      }
    }

    if (event.key === 'Escape') {
      closeCombo(combo);
    }
  });

  toggle.addEventListener('click', () => {
    if (combo.classList.contains('open')) {
      closeCombo(combo);
    } else {
      openCombo();
      renderList(filterCoins(input.value));
    }
  });

  document.addEventListener('click', (event) => {
    if (!combo.contains(event.target)) {
      closeCombo(combo);
    }
  });
};

const filterCoins = (query) => {
  const term = sanitizeInput(query.trim().toLowerCase());
  if (!term) return state.coins.slice(0, 30);
  return state.coins
    .filter((coin) => coin.name.toLowerCase().includes(term) || coin.id.includes(term) || coin.symbol?.toLowerCase().includes(term))
    .slice(0, 30);
};

const selectCoin = (type, coinId) => {
  const coin = state.coins.find((item) => item.id === coinId);
  if (!coin) return;

  const label = `${coin.name} (${coin.symbol?.toUpperCase() || ''})`;
  if (type === 'from') {
    state.from = coin.id;
    elements.fromInput.value = label;
  } else {
    state.to = coin.id;
    elements.toInput.value = label;
  }
};

const swapCoins = () => {
  const temp = state.from;
  state.from = state.to;
  state.to = temp;
  selectCoin('from', state.from);
  selectCoin('to', state.to);
  triggerConvert();
};

const setResult = (value) => {
  elements.result.textContent = `Converted Amount: ${formatResult(value)}`;
  elements.result.classList.remove('pulse');
  void elements.result.offsetWidth;
  elements.result.classList.add('pulse');
};

const setStatus = (message) => {
  elements.status.textContent = message;
};

const fetchCoins = async () => {
  setComboLoading(true);
  setStatus('Loading coins...');
  try {
    const response = await fetch('/api/coins');
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Unable to fetch coins');
    state.coins = data.data;

    if (!state.from) state.from = 'bitcoin';
    if (!state.to) state.to = 'ethereum';

    selectCoin('from', state.from);
    selectCoin('to', state.to);
    setStatus('');
    setComboLoading(false);
  } catch (err) {
    setStatus('Failed to load coins. Please refresh.');
    showToast('Failed to load coin list');
    setComboLoading(false);
  }
};

const updateChart = async (coinId) => {
  if (!coinId || !window.LightweightCharts) return;

  try {
    const response = await fetch(`/api/trend?coin=${coinId}`);
    const data = await response.json();
    if (!data.success) return;

    if (!state.chart) {
      state.chart = window.LightweightCharts.createChart(elements.chart, {
        layout: { background: { color: 'transparent' }, textColor: '#9aa6c8' },
        grid: { vertLines: { color: 'rgba(255,255,255,0.06)' }, horzLines: { color: 'rgba(255,255,255,0.06)' } },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
        timeScale: { borderColor: 'rgba(255,255,255,0.1)' },
      });
      state.series = state.chart.addAreaSeries({
        topColor: 'rgba(106, 166, 255, 0.4)',
        bottomColor: 'rgba(106, 166, 255, 0.05)',
        lineColor: '#6aa6ff',
      });
    }

    state.series.setData(data.data);
    elements.trendLabel.textContent = state.coins.find((coin) => coin.id === coinId)?.name || '--';
  } catch (err) {
    elements.trendLabel.textContent = '--';
  }
};

const convert = async () => {
  if (!state.from || !state.to || !state.amount) {
    setStatus('Please select currencies and enter an amount.');
    return;
  }

  if (!navigator.onLine) {
    setStatus('You are offline.');
    return;
  }

  setLoading(true);
  setStatus('Converting...');

  try {
    const response = await fetch(
      `/api/convert?from=${state.from}&to=${state.to}&amount=${encodeURIComponent(state.amount)}`
    );
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Conversion failed');

    setResult(data.result);
    state.lastUpdated = data.lastUpdated;
    elements.lastUpdated.textContent = `Last updated: ${new Date(data.lastUpdated).toLocaleTimeString()}`;
    setStatus('Conversion successful.');

    updateHistory({
      key: `${data.from}-${data.to}-${data.amount}`,
      fromId: data.from,
      toId: data.to,
      fromLabel: elements.fromInput.value,
      toLabel: elements.toInput.value,
      amount: data.amount,
      result: data.result,
    });

    localStorage.setItem(
      STORAGE_KEYS.last,
      JSON.stringify({ from: data.from, to: data.to, amount: data.amount })
    );

    updateChart(data.from);
  } catch (err) {
    setStatus(err.message || 'Conversion failed.');
    showToast('Conversion failed');
  } finally {
    setLoading(false);
  }
};

const triggerConvert = (() => {
  let timer;
  return () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      state.amount = Number.parseFloat(elements.amountInput.value) || 0;
      if (state.amount > 0) {
        convert();
      }
    }, 400);
  };
})();

const setupEvents = () => {
  elements.amountInput.addEventListener('input', () => {
    state.amount = Number.parseFloat(elements.amountInput.value) || 0;
    triggerConvert();
  });

  elements.convertBtn.addEventListener('click', convert);
  elements.swapBtn.addEventListener('click', swapCoins);

  elements.copyBtn.addEventListener('click', async () => {
    const text = elements.result.textContent.replace('Converted Amount: ', '');
    if (!text || text === '--') return;
    await navigator.clipboard.writeText(text);
    showToast('Result copied to clipboard');
  });

  elements.favoriteBtn.addEventListener('click', () => {
    if (!state.from || !state.to) return;
    const pairKey = `${state.from}-${state.to}`;
    if (state.favorites.some((pair) => pair.key === pairKey)) {
      showToast('Pair already saved');
      return;
    }

    state.favorites.unshift({
      key: pairKey,
      fromId: state.from,
      toId: state.to,
      fromLabel: elements.fromInput.value,
      toLabel: elements.toInput.value,
    });
    updateFavorites();
    showToast('Saved favorite pair');
  });

  elements.themeToggle.addEventListener('click', () => {
    const next = state.theme === 'light' ? 'dark' : 'light';
    setTheme(next);
  });

  window.addEventListener('online', () => {
    elements.offline.classList.remove('show');
    showToast('Back online');
  });

  window.addEventListener('offline', () => {
    elements.offline.classList.add('show');
  });
};

const init = async () => {
  setTheme(state.theme);
  loadState();
  elements.amountInput.value = state.amount || 1;

  createCombo('from');
  createCombo('to');
  renderHistory();
  renderFavorites();

  await fetchCoins();
  triggerConvert();
};

setupEvents();
init();