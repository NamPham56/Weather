import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  TextInput,
  useColorScheme,
  RefreshControl,
} from "react-native";
import Geolocation from "@react-native-community/geolocation";
import { RefreshCw, MapPin, Wind, Droplets } from "lucide-react-native";
import LinearGradient from "react-native-linear-gradient";

type LocationType = { latitude: number; longitude: number } | null;
type HourlyItem = { time: string; temp: number; code: number; isDay: boolean };
type DailyItem = { date: string; maxTemp: number; minTemp: number; code: number };

const API_BASE = "https://api.open-meteo.com/v1/forecast";

const WMO_MAP: Record<number, { text: string; icon: string }> = {
  0: { text: "Trời Quang", icon: "☀️" },
  1: { text: "Chủ yếu Quang", icon: "🌤️" },
  2: { text: "Mây Rải Rác", icon: "🌤️" },
  3: { text: "Trời Mây", icon: "☁️" },
  45: { text: "Sương Mù", icon: "🌫️" },
  51: { text: "Mưa Phùn", icon: "🌧️" },
  61: { text: "Mưa Nhẹ", icon: "🌧️" },
  63: { text: "Mưa Vừa", icon: "🌧️" },
  65: { text: "Mưa Lớn", icon: "🌧️" },
  71: { text: "Tuyết Nhẹ", icon: "❄️" },
  75: { text: "Tuyết Dày", icon: "❄️" },
  95: { text: "Giông", icon: "⛈️" },
};

const WeatherApp = () => {
  const isDarkMode = useColorScheme() === "dark";
  const [location, setLocation] = useState<LocationType>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cityName, setCityName] = useState("Vị trí hiện tại");

  // Fetch data
  const fetchWeatherData = useCallback(async (lat: number, lon: number) => {
    try {
      setError(null);
      const url = `${API_BASE}?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weather_code,is_day,relativehumidity_2m,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=7&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Không lấy được dữ liệu");
      const data = await res.json();
      setWeatherData(data);

      const parts = data.timezone.split("/");
      setCityName(parts[parts.length - 1].replace("_", " "));
    } catch (err) {
      console.log(err);
      setError("Lỗi khi tải dữ liệu.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Get location
  const getLocation = useCallback(() => {
    setLoading(true);
    Geolocation.getCurrentPosition(
      pos => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation(coords);
        fetchWeatherData(coords.latitude, coords.longitude);
      },
      err => {
        console.log(err);
        setError("Không lấy được vị trí. Kiểm tra GPS!");
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
      wind: weatherData.current_weather.windspeed,
      code: weatherData.current_weather.weathercode,
      isDay: weatherData.current_weather.is_day === 1,
      text: WMO_MAP[weatherData.current_weather.weathercode]?.text ?? "Khác",
      icon: WMO_MAP[weatherData.current_weather.weathercode]?.icon ?? "🌈",
    };
    const hourly: HourlyItem[] = weatherData.hourly.time.slice(0, 12).map((t: string, i: number) => ({
      time: new Date(t).getHours() + "h",
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

  const onRefresh = () => {
    setRefreshing(true);
    if (location) fetchWeatherData(location.latitude, location.longitude);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4DA1FF" />
        <Text style={{ color: "#fff", marginTop: 8 }}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  if (error || !processed.current) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff", marginBottom: 12 }}>{error || "Không có dữ liệu"}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={getLocation}>
          <RefreshCw size={20} color="#fff" />
          <Text style={{ color: "#fff", marginLeft: 6 }}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={processed.current.isDay ? ["#4facfe", "#00f2fe"] : ["#141E30", "#243B55"]}
      style={{ flex: 1 }}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Current Weather */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <Text style={styles.city}>{cityName}</Text>
          <Text style={styles.temp}>{processed.current.temp}°C</Text>
          <Text style={styles.condition}>
            {processed.current.icon} {processed.current.text}
          </Text>
          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <View style={styles.infoItem}>
              <Wind size={18} color="#fff" />
              <Text style={styles.infoText}>{processed.current.wind} km/h</Text>
            </View>
            <View style={styles.infoItem}>
              <Droplets size={18} color="#fff" />
              <Text style={styles.infoText}>{weatherData.hourly.relativehumidity_2m[0]}%</Text>
            </View>
          </View>
        </View>

        {/* Hourly Forecast */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dự báo 12 giờ tới</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {processed.hourly.map((h, i) => (
              <View key={i} style={styles.hourItem}>
                <Text style={styles.hourText}>{h.time}</Text>
                <Text style={styles.hourIcon}>{WMO_MAP[h.code]?.icon || "🌈"}</Text>
                <Text style={styles.hourTemp}>{h.temp}°</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Daily Forecast */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dự báo 7 ngày</Text>
          {processed.daily.map((d, i) => (
            <View key={i} style={styles.dailyItem}>
              <Text style={{ flex: 1 }}>
                {new Date(d.date).toLocaleDateString("vi-VN", { weekday: "short" })}
              </Text>
              <Text style={{ flex: 1, textAlign: "center" }}>
                {WMO_MAP[d.code]?.icon || "🌈"}
              </Text>
              <Text style={{ flex: 1, textAlign: "right" }}>
                {d.minTemp}° / {d.maxTemp}°
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: "#101820", justifyContent: "center", alignItems: "center" },
  city: { fontSize: 28, fontWeight: "700", color: "#fff" },
  temp: { fontSize: 72, fontWeight: "bold", color: "#FFD700" },
  condition: { fontSize: 20, color: "#fff", marginTop: 4 },
  card: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8, color: "#fff" },
  hourItem: { alignItems: "center", marginRight: 16 },
  hourText: { color: "#fff", fontSize: 14, marginBottom: 4 },
  hourTemp: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  hourIcon: { fontSize: 20, marginVertical: 4 },
  dailyItem: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)",
  },
  retryButton: {
    flexDirection: "row",
    backgroundColor: "#4DA1FF",
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  infoItem: { flexDirection: "row", alignItems: "center", marginHorizontal: 8 },
  infoText: { color: "#fff", marginLeft: 4 },
});

export default WeatherApp;
