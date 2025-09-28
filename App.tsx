import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  useColorScheme,
  TouchableOpacity,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import LinearGradient from 'react-native-linear-gradient';
import { MapPin, RefreshCw } from 'lucide-react-native'; // react-native version


type LocationType = { latitude: number; longitude: number } | null;

type WeatherItem = {
  time: string;
  temp: number;
  pm10: number;
  pm2_5: number;
  isDaytime: boolean;
};

type WeatherData = {
  hourly: {
    time: string[];
    temperature_2m: number[];
    is_day: number[];
    pm10: number[];
    pm2_5: number[];
  };
  timezone: string;
};


const ICON_MAP = {
  SUN: 'https://img.icons8.com/fluency/64/sun.png',
  MOON: 'https://img.icons8.com/fluency/64/moon.png',
  SUMMER: 'https://img.icons8.com/fluency/64/summer.png',
  WINTER: 'https://img.icons8.com/fluency/64/winter.png',
};

const getAQIColor = (pm: number) => {
  if (pm < 50) return '#4CAF50';
  if (pm < 100) return '#FFC107';
  return '#F44336';
};

const getIconUrl = (temp: number, isDaytime: boolean) => {
  if (temp >= 35) return ICON_MAP.SUMMER;
  if (temp <= 10) return ICON_MAP.WINTER;
  return isDaytime ? ICON_MAP.SUN : ICON_MAP.MOON;
};


const API_BASE_WEATHER = 'https://api.open-meteo.com/v1/forecast';
const API_BASE_AIR_QUALITY = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const fetchWithRetry = async (url: string, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise<void>(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
  const weatherUrl = `${API_BASE_WEATHER}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,is_day&forecast_hours=12&temperature_unit=celsius&timezone=auto`;
  const aqiUrl = `${API_BASE_AIR_QUALITY}?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5&forecast_hours=12&timezone=auto`;
  const [weatherRes, aqiRes] = await Promise.all([fetchWithRetry(weatherUrl), fetchWithRetry(aqiUrl)]);
  return {
    hourly: { ...weatherRes.hourly, ...aqiRes.hourly },
    timezone: weatherRes.timezone,
  };
};

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const [location, setLocation] = useState<LocationType>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getLocation = () => {
    setLoading(true);
    setError(null);
    Geolocation.getCurrentPosition(
      pos => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation(coords);
        fetchWeatherData(coords.latitude, coords.longitude)
          .then(data => setWeatherData(data))
          .catch(() => setError('Lấy dữ liệu thất bại'))
          .finally(() => setLoading(false));
      },
      err => {
        console.log(err);
        setError('Chưa cấp quyền vị trí hoặc lỗi GPS');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 30000 }
    );
  };

  useEffect(() => {
    getLocation();
  }, []);

  const processedData: WeatherItem[] = useMemo(() => {
    if (!weatherData?.hourly) return [];
    const hourly = weatherData.hourly;
    const time = hourly.time.slice(0, 12);
    const temp = hourly.temperature_2m.slice(0, 12).map(Number);
    const pm10 = hourly.pm10.slice(0, 12).map(Number);
    const pm2_5 = hourly.pm2_5.slice(0, 12).map(Number);
    const isDay = hourly.is_day.slice(0, 12).map(Boolean);

    return time.map((t, i) => ({
      time: t,
      temp: temp[i] ?? 0,
      pm10: pm10[i] ?? 0,
      pm2_5: pm2_5[i] ?? 0,
      isDaytime: isDay[i] ?? false,
    }));
  }, [weatherData]);

  const currentForecast = processedData[0];

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#101820' }]}>
        <ActivityIndicator size="large" color="#4DA1FF" />
        <Text style={{ color: '#fff', marginTop: 12 }}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: '#101820' }]}>
        <Text style={{ color: '#fff', fontSize: 16, marginBottom: 12 }}>{error}</Text>
        <TouchableOpacity onPress={getLocation} style={styles.retryButton}>
          <RefreshCw size={20} color="#fff" />
          <Text style={{ color: '#fff', marginLeft: 8 }}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#4DA1FF', '#101820']} style={{ flex: 1 }}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <MapPin size={20} color="#FFD700" />
          <Text style={styles.headerTitle}>Vị trí hiện tại</Text>
        </View>
        <Text style={styles.temperature}>{currentForecast?.temp ?? 'N/A'}°C</Text>
        <Text style={styles.subtitle}>AQI dựa trên PM2.5 & PM10</Text>
      </View>

      <FlatList
        data={processedData}
        horizontal
        keyExtractor={item => item.time}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: item.isDaytime ? '#4DA1FF' : '#2E3B55' }]}>
            <Text style={styles.cardTime}>{new Date(item.time).getHours()}h</Text>
            <Image source={{ uri: getIconUrl(item.temp, item.isDaytime) }} style={styles.cardIcon} />
            <Text style={styles.cardTemp}>{item.temp}°C</Text>
            <Text style={[styles.cardAQI, { color: getAQIColor(item.pm2_5) }]}>PM2.5: {item.pm2_5}</Text>
            <Text style={[styles.cardAQI, { color: getAQIColor(item.pm10) }]}>PM10: {item.pm10}</Text>
          </View>
        )}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#4DA1FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  header: { alignItems: 'center', padding: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFD700', marginLeft: 8 },
  temperature: { fontSize: 48, fontWeight: 'bold', color: '#FFD700', marginVertical: 4 },
  subtitle: { fontSize: 14, color: '#fff' },
  card: {
    width: 160,
    height: 220,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  cardTime: { fontSize: 18, fontWeight: '600', color: '#fff' },
  cardTemp: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginVertical: 4 },
  cardAQI: { fontWeight: 'bold', marginTop: 4 },
  cardIcon: { width: 50, height: 50, marginVertical: 6 },
});

export default App;
