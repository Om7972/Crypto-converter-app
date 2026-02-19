import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CryptoConverter = () => {
  const [cryptos, setCryptos] = useState([]);
  const [fromCurrency, setFromCurrency] = useState('bitcoin');
  const [toCurrency, setToCurrency] = useState('ethereum');
  const [amount, setAmount] = useState(1);
  const [convertedAmount, setConvertedAmount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCryptos = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/list');
        setCryptos(response.data);
      } catch (err) {
        setError('Failed to load coins. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCryptos();
  }, []);

  const convertCurrency = async () => {
    try {
      setLoading(true);
      setError('');
      const fromPrice = await getPrice(fromCurrency);
      const toPrice = await getPrice(toCurrency);

      if (fromPrice && toPrice) {
        setConvertedAmount((amount * fromPrice) / toPrice);
      }
    } catch (err) {
      setError('Failed to convert. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPrice = async (currency) => {
    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${currency}&vs_currencies=usd`);
    return response.data[currency].usd;
  };

  return (
    <div>
      <h1>Crypto Converter</h1>
      {error && <p>{error}</p>}
      {loading && <p>Loading...</p>}
      <div>
        <label>
          From:
          <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)}>
            {cryptos.map((crypto) => (
              <option key={crypto.id} value={crypto.id}>
                {crypto.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label>
          To:
          <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)}>
            {cryptos.map((crypto) => (
              <option key={crypto.id} value={crypto.id}>
                {crypto.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label>
          Amount:
          <input
            type="number"
            value={amount}
            min="0"
            step="0.00000001"
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          />
        </label>
      </div>
      <button onClick={convertCurrency}>Convert</button>
      {convertedAmount && (
        <div>
          <h2>Converted Amount: {convertedAmount.toFixed(8)}</h2>
        </div>
      )}
    </div>
  );
};

export default CryptoConverter;
