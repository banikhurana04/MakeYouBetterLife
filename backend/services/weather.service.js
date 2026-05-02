const axios = require('axios');

const OPENWEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';

/**
 * Map OpenWeather readings to a simple condition for the app API.
 * @param {number} tempC
 * @param {string} [weatherMain] e.g. "Rain", "Clear"
 * @param {number} [weatherId] OpenWeather condition id
 * @returns {"Hot"|"Cold"|"Rainy"}
 */
function mapToCondition(tempC, weatherMain, weatherId) {
  const main = String(weatherMain || '').toLowerCase();
  const rainyKeywords = ['rain', 'drizzle', 'thunderstorm'];
  const id = typeof weatherId === 'number' ? weatherId : NaN;
  const looksRainy =
    rainyKeywords.some((k) => main.includes(k)) || (id >= 200 && id < 600);

  if (looksRainy) return 'Rainy';
  if (typeof tempC !== 'number' || Number.isNaN(tempC)) return 'Cold';
  if (tempC >= 22) return 'Hot';
  if (tempC < 15) return 'Cold';
  return tempC >= 18 ? 'Hot' : 'Cold';
}

/**
 * Align API condition labels with fashionEngine weather slugs.
 * @param {"Hot"|"Cold"|"Rainy"} condition
 * @returns {"hot"|"cold"|"rainy"|"moderate"}
 */
function mapConditionToFashionWeather(condition) {
  const c = String(condition || '');
  if (c === 'Rainy') return 'rainy';
  if (c === 'Hot') return 'hot';
  if (c === 'Cold') return 'cold';
  return 'moderate';
}

/**
 * @param {object} data OpenWeather JSON body
 * @returns {{ temperature: number, condition: "Hot"|"Cold"|"Rainy", location: string|null }}
 */
function summaryFromOpenWeatherData(data) {
  const temp = data?.main?.temp;
  const w0 = Array.isArray(data?.weather) ? data.weather[0] : null;
  const condition = mapToCondition(temp, w0?.main, w0?.id);
  const name = data?.name;
  return {
    temperature: Math.round(Number(temp) * 10) / 10,
    condition,
    location: typeof name === 'string' && name.trim() ? name.trim() : null,
  };
}

async function openWeatherRequest(params) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    const err = new Error('OPENWEATHER_API_KEY is not configured');
    err.statusCode = 503;
    throw err;
  }

  try {
    const { data } = await axios.get(OPENWEATHER_URL, {
      params: { ...params, appid: apiKey, units: 'metric' },
      timeout: 12000,
    });
    return summaryFromOpenWeatherData(data);
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const status = e.response?.status;
      if (status === 404) {
        const err = new Error('Weather data not found for this location');
        err.statusCode = 404;
        throw err;
      }
      if (status === 401) {
        const err = new Error('Invalid OpenWeather API key');
        err.statusCode = 502;
        throw err;
      }
      if (e.code === 'ECONNABORTED') {
        const err = new Error('Weather request timed out');
        err.statusCode = 504;
        throw err;
      }
    }
    throw e;
  }
}

/**
 * Current weather for a city name (OpenWeatherMap).
 * @param {string} city
 * @returns {Promise<{ temperature: number, condition: "Hot"|"Cold"|"Rainy", location: string|null }>}
 */
async function getWeatherByCity(city) {
  const q = String(city || '').trim();
  if (!q) {
    const err = new Error('City is required');
    err.statusCode = 400;
    throw err;
  }
  return openWeatherRequest({ q });
}

/**
 * Current weather for coordinates (OpenWeatherMap).
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ temperature: number, condition: "Hot"|"Cold"|"Rainy", location: string|null }>}
 */
async function getWeatherByCoords(lat, lon) {
  return openWeatherRequest({ lat, lon });
}

module.exports = {
  getWeatherByCity,
  getWeatherByCoords,
  mapToCondition,
  mapConditionToFashionWeather,
};
