const { getWeatherByCity, getWeatherByCoords } = require('../services/weather.service');

function parseCoord(value) {
  if (value === undefined || value === null) return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

async function getWeather(req, res, next) {
  try {
    const city = req.query.city;
    const lat = parseCoord(req.query.lat);
    const lon = parseCoord(req.query.lon);

    const hasLat = req.query.lat !== undefined && String(req.query.lat).trim() !== '';
    const hasLon = req.query.lon !== undefined && String(req.query.lon).trim() !== '';

    let summary;
    if (hasLat || hasLon) {
      if (lat === null || lon === null) {
        return res.status(400).json({ message: 'Invalid latitude or longitude' });
      }
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return res.status(400).json({ message: 'Latitude or longitude out of range' });
      }
      summary = await getWeatherByCoords(lat, lon);
    } else {
      summary = await getWeatherByCity(city);
    }

    res.json(summary);
  } catch (err) {
    const code = err.statusCode;
    if (code === 400 || code === 404 || code === 503 || code === 502 || code === 504) {
      return res.status(code).json({ message: err.message });
    }
    next(err);
  }
}

module.exports = { getWeather };
