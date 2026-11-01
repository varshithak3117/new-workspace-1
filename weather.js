/**
 * SmartSlope Weather Integration Engine
 * Interfaces with Open-Meteo API for real-time agricultural forecasts in the Karnataka Arecanut Belt
 */

class SmartSlopeWeather {
  constructor() {
    this.cache = {};
    this.cacheTtlMs = 15 * 60 * 1000; // 15 mins cache
  }

  /**
   * Fetch weather forecast for a land based on coordinates
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {string} landName - Land identifier
   */
  async getForecast(lat = 13.4216, lon = 75.2562, landName = "Arecanut Estate") {
    const cacheKey = `${lat.toFixed(3)}_${lon.toFixed(3)}`;
    const now = Date.now();

    if (this.cache[cacheKey] && (now - this.cache[cacheKey].timestamp < this.cacheTtlMs)) {
      return this.cache[cacheKey].data;
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto&forecast_days=3`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Open-Meteo HTTP error: ${response.status}`);
      }

      const raw = await response.json();
      const processed = this.formatWeatherData(raw, lat, lon, landName);

      this.cache[cacheKey] = {
        timestamp: now,
        data: processed
      };

      return processed;
    } catch (err) {
      console.warn("Open-Meteo network request failed, switching to safe local agro-climatic fallback:", err.message);
      return this.getFallbackWeather(lat, lon, landName, err.message);
    }
  }

  /**
   * Format Open-Meteo JSON into farmer-friendly metrics & recommendations
   */
  formatWeatherData(raw, lat, lon, landName) {
    const current = raw.current || {};
    const daily = raw.daily || {};
    
    const temp = Math.round(current.temperature_2m ?? 27);
    const humidity = Math.round(current.relative_humidity_2m ?? 78);
    const windSpeed = Math.round(current.wind_speed_10m ?? 8);
    const precipNow = current.precipitation ?? 0;
    const weatherCode = current.weather_code ?? 0;

    // Daily metrics
    const todayRainProb = daily.precipitation_probability_max?.[0] ?? 25;
    const todayRainSum = daily.precipitation_sum?.[0] ?? 0;
    const tomorrowRainProb = daily.precipitation_probability_max?.[1] ?? 35;
    const tomorrowRainSum = daily.precipitation_sum?.[1] ?? 4.2;

    const weatherCondition = this.getWmoDescription(weatherCode);

    // Weather-based smart irrigation advisory
    const advisory = this.generateIrrigationAdvisory(todayRainProb, todayRainSum, tomorrowRainProb, tomorrowRainSum);

    // 3-day simple outlook
    const dailyOutlook = [];
    if (daily.time) {
      for (let i = 0; i < Math.min(3, daily.time.length); i++) {
        const date = new Date(daily.time[i]);
        const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : date.toLocaleDateString('en-US', { weekday: 'short' });
        dailyOutlook.push({
          day: dayName,
          date: daily.time[i],
          maxTemp: Math.round(daily.temperature_2m_max[i]),
          minTemp: Math.round(daily.temperature_2m_min[i]),
          rainProb: daily.precipitation_probability_max[i],
          rainSum: daily.precipitation_sum[i],
          icon: this.getWeatherIcon(daily.weather_code[i])
        });
      }
    }

    return {
      status: "live",
      source: "Open-Meteo Live API",
      temperature: temp,
      humidity: humidity,
      windSpeed: windSpeed,
      precipNow: precipNow,
      rainProbability: todayRainProb,
      expectedRainfallMm: todayRainSum,
      tomorrowRainProb: tomorrowRainProb,
      tomorrowRainMm: tomorrowRainSum,
      condition: weatherCondition.text,
      conditionKn: weatherCondition.textKn,
      icon: weatherCondition.icon,
      advisory: advisory,
      dailyOutlook: dailyOutlook,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  /**
   * Safe agro-climatic fallback when offline or API unreachable
   */
  getFallbackWeather(lat, lon, landName, errorMsg) {
    const isMonsoon = [5, 6, 7, 8].includes(new Date().getMonth());
    const estRainProb = isMonsoon ? 65 : 20;
    const estRainMm = isMonsoon ? 12.0 : 0.5;

    return {
      status: "fallback",
      source: "Local Agro-Climatic Model (Safe Fallback)",
      errorNote: "Live weather service temporarily unavailable. Safe local moisture thresholds in effect.",
      temperature: 28,
      humidity: 76,
      windSpeed: 7,
      precipNow: 0,
      rainProbability: estRainProb,
      expectedRainfallMm: estRainMm,
      tomorrowRainProb: estRainProb,
      tomorrowRainMm: estRainMm,
      condition: "Partly Cloudy",
      conditionKn: "ಭಾಗಶಃ ಮೋಡ ಕವಿದ ವಾತಾವರಣ",
      icon: "⛅",
      advisory: {
        recommendation: "Maintain local sensor-guided threshold irrigation.",
        recommendationKn: "ಮಣ್ಣಿನ ತೇವಾಂಶ ಸಂವೇದಕಗಳ ಆಧಾರದ ಮೇಲೆ ನೀರಾವರಿ ಮುಂದುವರಿಸಿ.",
        delayHours: 0,
        action: "NORMAL_CONTROL",
        reason: "Offline fallback active: local soil probes are controlling valves independently."
      },
      dailyOutlook: [
        { day: "Today", maxTemp: 29, minTemp: 22, rainProb: estRainProb, rainSum: estRainMm, icon: "⛅" },
        { day: "Tomorrow", maxTemp: 28, minTemp: 21, rainProb: estRainProb + 5, rainSum: estRainMm, icon: "🌦️" },
        { day: "Day 3", maxTemp: 30, minTemp: 22, rainProb: estRainProb - 5, rainSum: 0, icon: "☀️" }
      ],
      lastUpdated: "Safe Fallback"
    };
  }

  /**
   * Generates intelligent slope irrigation delay suggestions based on rainfall volume & probability
   */
  generateIrrigationAdvisory(todayProb, todayMm, tomorrowProb, tomorrowMm) {
    if (todayMm > 15 || todayProb > 75) {
      return {
        recommendation: "High rainfall expected today (>15mm). Delay irrigation by 24h to prevent topsoil slope erosion.",
        recommendationKn: "ಇಂದು ಭಾರಿ ಮಳೆಯಾಗುವ ಸಾಧ್ಯತೆ (>15ಮಿ.ಮೀ). ಇಳಿಜಾರಿನ ಮಣ್ಣು ಕೊಚ್ಚಿಹೋಗುವುದನ್ನು ತಡೆಯಲು ನೀರಾವರಿಯನ್ನು 24 ಗಂಟೆ ಮುಂದೂಡಿ.",
        delayHours: 24,
        action: "DELAY_IRRIGATION",
        badge: "Rain Delay Recommended",
        severity: "warning",
        reason: "Heavy rainfall on sloping terrain causes severe surface runoff and nutrient leaching if soil is already saturated by irrigation."
      };
    } else if (tomorrowMm > 10 || tomorrowProb > 70) {
      return {
        recommendation: "Rain forecast tomorrow. Recommended: Delay Upper/Middle slope watering to conserve reservoir water.",
        recommendationKn: "ನಾಳೆ ಮಳೆಯ ಮುನ್ಸೂಚನೆ ಇದೆ. ನೀರು ಉಳಿಸಲು ಮೇಲಿನ ಮತ್ತು ಮಧ್ಯದ ವಲಯಗಳ ನೀರಾವರಿಯನ್ನು ಮುಂದೂಡುವುದು ಸೂಕ್ತ.",
        delayHours: 18,
        action: "DELAY_IRRIGATION",
        badge: "Rain Expected Tomorrow",
        severity: "info",
        reason: "Upcoming precipitation will recharge the root zone naturally; saving ~1,200 Liters."
      };
    } else if (todayProb < 20 && todayMm === 0) {
      return {
        recommendation: "Clear sunny weather with low rain probability. Standard slope threshold irrigation active.",
        recommendationKn: "ಬಿಸಿಲಿನ ವಾತಾವರಣವಿದೆ. ಇಳಿಜಾರಿನ ಪ್ರಮಾಣಿತ ನೀರಾವರಿ ನಿಯಂತ್ರಣ ಜಾರಿಯಲ್ಲಿದೆ.",
        delayHours: 0,
        action: "PROCEED_AS_NEEDED",
        badge: "Dry Weather Cycle",
        severity: "normal",
        reason: "Evapotranspiration is normal. Maintain Zone 1 upper-slope moisture to prevent tree wilt."
      };
    } else {
      return {
        recommendation: "Light showers possible. Monitor Zone 3 lower slope for runoff accumulation before watering.",
        recommendationKn: "ಸಾಧಾರಣ ಮಳೆಯಾಗಬಹುದು. ನೀರುಣಿಸುವ ಮುನ್ನ ತಗ್ಗು ವಲಯ 3 ರಲ್ಲಿ ನೀರು ನಿಲ್ಲುವುದನ್ನು ಗಮನಿಸಿ.",
        delayHours: 0,
        action: "MONITOR",
        badge: "Light Rain Warning",
        severity: "info",
        reason: "Light precipitation may partially wet upper slope while runoff pools in Zone 3."
      };
    }
  }

  getWmoDescription(code) {
    const map = {
      0: { text: "Clear Sky", textKn: "ಸ್ವಚ್ಛ ಆಕಾಶ", icon: "☀️" },
      1: { text: "Mainly Clear", textKn: "ಹೆಚ್ಚಾಗಿ ಸ್ವಚ್ಛ", icon: "🌤️" },
      2: { text: "Partly Cloudy", textKn: "ಭಾಗಶಃ ಮೋಡ", icon: "⛅" },
      3: { text: "Overcast", textKn: "ಮೋಡ ಕವಿದ", icon: "☁️" },
      45: { text: "Fog", textKn: "ದಟ್ಟ ಮಂಜು", icon: "🌫️" },
      51: { text: "Light Drizzle", textKn: "ಹಗುರ ತುಂತುರು", icon: "🌦️" },
      61: { text: "Slight Rain", textKn: "ಸಾಧಾರಣ ಮಳೆ", icon: "🌧️" },
      63: { text: "Moderate Rain", textKn: "ಮಧ್ಯಮ ಮಳೆ", icon: "🌧️" },
      65: { text: "Heavy Rain", textKn: "ಭಾರಿ ಮಳೆ", icon: "⛈️" },
      80: { text: "Rain Showers", textKn: "ಮಳೆ ಸುರಿಮಳೆ", icon: "🌦️" },
      95: { text: "Thunderstorm", textKn: "ಗುಡುಗು ಸಹಿತ ಮಳೆ", icon: "⚡" }
    };
    return map[code] || { text: "Partly Cloudy", textKn: "ಭಾಗಶಃ ಮೋಡ", icon: "⛅" };
  }

  getWeatherIcon(code) {
    return this.getWmoDescription(code).icon;
  }
}

// Global instance
window.smartSlopeWeather = new SmartSlopeWeather();
