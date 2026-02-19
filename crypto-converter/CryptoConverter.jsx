import React, { useEffect, useState } from 'react';
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
        const response = await axios.get('/api/coins');
        if (response.data.success) {
          setCryptos(response.data.data);
        } else {
          setError('Failed to load coins.');
        }
      } catch (err) {
        setError('Failed to load coins. Please try again.');
        console.error(err);
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

      const response = await axios.get('/api/convert', {
        params: {
          from: fromCurrency,
          to: toCurrency,
          amount: amount
        }
      });

      if (response.data.success) {
        setConvertedAmount(response.data.result);
      } else {
        setError(response.data.error || 'Conversion failed');
      }
    } catch (err) {
      setError('Failed to convert. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Crypto Converter</h1>
      <p>Pick two coins and convert at the latest USD prices.</p>
      {error && <div className="error">{error}</div>}
      {loading && <div className="status">Loading...</div>}

      <label>
        From
        <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)}>
          {cryptos.map((crypto) => (
            <option key={crypto.id} value={crypto.id}>
              {crypto.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        To
        <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)}>
          {cryptos.map((crypto) => (
            <option key={crypto.id} value={crypto.id}>
              {crypto.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Amount
        <input
          type="number"
          value={amount}
          min="0"
          step="0.00000001"
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
        />
      </label>

      <button onClick={convertCurrency} disabled={loading || !fromCurrency || !toCurrency}>
        Convert
      </button>

      {convertedAmount !== null && (
        <div className="result">
          <strong>Converted Amount:</strong> {convertedAmount.toFixed(8)}
        </div>
      )}
    </div>
  );
};

export default CryptoConverter;