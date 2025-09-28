import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ImageBackground,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  useColorScheme,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { RefreshCw, Clock, CalendarDays } from 'lucide-react-native';

type LocationType = { latitude: number; longitude: number } | null;
type HourlyItem = { time: string; temp: number; code: number; isDay: boolean };
type DailyItem = { date: string; maxTemp: number; minTemp: number; code: number };

const API_BASE = 'https://api.open-meteo.com/v1/forecast';

// Mapping WMO weather codes
const WMO_MAP: Record<number, { text: string; icon: string }> = {
  0: { text: 'Trời Quang', icon: '☀️' },
  1: { text: 'Chủ yếu Quang', icon: '🌤️' },
  2: { text: 'Mây Rải Rác', icon: '🌤️' },
  3: { text: 'Trời Mây', icon: '☁️' },
  45: { text: 'Sương Mù', icon: '🌫️' },
  48: { text: 'Sương Muối', icon: '🌫️' },
  51: { text: 'Mưa Phùn Nhẹ', icon: '🌧️' },
  53: { text: 'Mưa Phùn Vừa', icon: '🌧️' },
  55: { text: 'Mưa Phùn Dày', icon: '🌧️' },
  61: { text: 'Mưa Nhẹ', icon: '🌧️' },
  63: { text: 'Mưa Vừa', icon: '🌧️' },
  65: { text: 'Mưa Lớn', icon: '🌧️' },
  71: { text: 'Tuyết Nhẹ', icon: '❄️' },
  73: { text: 'Tuyết Vừa', icon: '❄️' },
  75: { text: 'Tuyết Dày', icon: '❄️' },
  80: { text: 'Mưa Rào Nhẹ', icon: '💦' },
  81: { text: 'Mưa Rào Vừa', icon: '💦' },
  82: { text: 'Mưa Rào Lớn', icon: '💧' },
  95: { text: 'Giông Nhẹ', icon: '⛈️' },
  96: { text: 'Giông Vừa', icon: '⛈️' },
  99: { text: 'Giông Mạnh', icon: '⛈️' },
};

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const [location, setLocation] = useState<LocationType>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityName, setCityName] = useState('Vị trí hiện tại');

  // Fetch weather data
  const fetchWeatherData = useCallback(async (lat: number, lon: number) => {
    try {
      setLoading(true);
      setError(null);
      const url = `${API_BASE}?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=10&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Không lấy được dữ liệu');
      const data = await res.json();
      setWeatherData(data);

      // Extract city from timezone
      const parts = data.timezone.split('/');
      setCityName(parts.length > 1 ? parts[parts.length - 1].replace('_', ' ') : data.timezone);
    } catch (err) {
      console.log(err);
      setError('Lấy dữ liệu thất bại.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get location
  const getLocation = useCallback(() => {
    setLoading(true);
    setError(null);

    Geolocation.getCurrentPosition(
      pos => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation(coords);
        fetchWeatherData(coords.latitude, coords.longitude);
      },
      err => {
        console.log(err);
        setError('Chưa cấp quyền vị trí hoặc lỗi GPS');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 30000 }
    );
  }, [fetchWeatherData]);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const processed = useMemo(() => {
    if (!weatherData) return { current: null, hourly: [], daily: [] };
    const current = {
      temp: Math.round(weatherData.current_weather.temperature),
      code: weatherData.current_weather.weathercode,
      isDay: weatherData.current_weather.is_day === 1,
      text: WMO_MAP[weatherData.current_weather.weathercode]?.text ?? 'Khác',
      icon: WMO_MAP[weatherData.current_weather.weathercode]?.icon ?? '🌈',
    };
    const hourly: HourlyItem[] = weatherData.hourly.time.slice(0, 12).map((t: string, i: number) => ({
      time: new Date(t).getHours() + 'h',
      temp: Math.round(weatherData.hourly.temperature_2m[i]),
      code: weatherData.hourly.weather_code[i],
      isDay: weatherData.hourly.is_day[i] === 1,
    }));
    const daily: DailyItem[] = weatherData.daily.time.map((t: string, i: number) => ({
      date: t,
      maxTemp: Math.round(weatherData.daily.temperature_2m_max[i]),
      minTemp: Math.round(weatherData.daily.temperature_2m_min[i]),
      code: weatherData.daily.weather_code[i],
    }));
    return { current, hourly, daily };
  }, [weatherData]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#101820' }]}>
        <ActivityIndicator size="large" color="#4DA1FF" />
        <Text style={{ color: '#fff', marginTop: 12 }}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  if (error || !processed.current) {
    return (
      <View style={[styles.center, { backgroundColor: '#101820' }]}>
        <Text style={{ color: '#fff', fontSize: 16, marginBottom: 12 }}>{error || 'Không tìm thấy dữ liệu.'}</Text>
        <TouchableOpacity onPress={getLocation} style={styles.retryButton}>
          <RefreshCw size={20} color="#fff" />
          <Text style={{ color: '#fff', marginLeft: 8 }}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const backgroundUrl = processed.current.isDay
    ? 'https://images.unsplash.com/photo-1530182200548-5c4e91024e0b?q=80&w=2670&auto=format&fit=crop'
    : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2670&auto=format&fit=crop';

  return (
    <ImageBackground source={{ uri: backgroundUrl }} style={{ flex: 1 }}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Text style={styles.city}>{cityName}</Text>
          <Text style={styles.temp}>{processed.current.temp}°C</Text>
          <Text style={styles.condition}>{processed.current.icon} {processed.current.text}</Text>
        </View>

        {/* Hourly forecast */}
        <View style={[styles.card, { marginBottom: 16 }]}>
          <Text style={styles.cardTitle}>Dự báo 12 giờ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {processed.hourly.map((item, i) => (
              <View key={i} style={styles.hourItem}>
                <Text style={styles.hourText}>{item.time}</Text>
                <Text style={styles.hourTemp}>{item.temp}°</Text>
                <Text style={styles.hourIcon}>{WMO_MAP[item.code]?.icon || '🌈'}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Daily forecast */}
        <View style={[styles.card, { marginBottom: 16 }]}>
          <Text style={styles.cardTitle}>Dự báo 10 ngày</Text>
          {processed.daily.map((item, i) => (
            <View key={i} style={styles.dailyItem}>
              <Text style={{ flex: 1 }}>{new Date(item.date).toLocaleDateString('vi-VN', { weekday: 'short' })}</Text>
              <Text style={{ flex: 1, textAlign: 'center' }}>{WMO_MAP[item.code]?.icon || '🌈'}</Text>
              <Text style={{ flex: 1, textAlign: 'right' }}>{item.minTemp}° / {item.maxTemp}°</Text>
            </View>
          ))}
        </View>

        {/* Refresh button */}
        <TouchableOpacity onPress={getLocation} style={styles.retryButton}>
          <RefreshCw size={20} color="#fff" />
          <Text style={{ color: '#fff', marginLeft: 8 }}>Cập nhật</Text>
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  city: { fontSize: 28, fontWeight: '600', color: '#FFD700' },
  temp: { fontSize: 64, fontWeight: 'bold', color: '#FFD700' },
  condition: { fontSize: 20, color: '#fff', marginTop: 4 },
  card: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#fff' },
  hourItem: { alignItems: 'center', marginRight: 16 },
  hourText: { color: '#fff', fontSize: 14, marginBottom: 4 },
  hourTemp: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  hourIcon: { fontSize: 20 },
  dailyItem: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)' },
  retryButton: { flexDirection: 'row', backgroundColor: '#4DA1FF', padding: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
});

export default App;
