
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ImageBackground,
  Platform,
} from "react-native";
import Geolocation from "@react-native-community/geolocation";
import Geocoder from "react-native-geocoding";
import Modal from "react-native-modal";
import LinearGradient from "react-native-linear-gradient";
import { MotiView, MotiText } from "moti";
import LottieView from "lottie-react-native";
import { Card, List, Button, Provider as PaperProvider, DefaultTheme } from "react-native-paper";
import { RefreshCw, Wind, Droplets, X } from "lucide-react-native";

// Initialize Geocoder (replace with your Google API key if you use it)
// Geocoder.init("YOUR_GOOGLE_API_KEY");

type LocationType = { latitude: number; longitude: number } | null;
type HourlyItem = { time: string; temp: number; code: number; isDay: boolean; date: string };
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

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#4DA1FF",
    accent: "#00f2fe",
    background: "#0f1724",
    surface: "#1e293b",
    text: "#ffffff",
  },
};

const WeatherAppEnhanced: React.FC = () => {
  const [location, setLocation] = useState<LocationType>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cityName, setCityName] = useState("Vị trí hiện tại");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const fetchWeatherData = useCallback(async (lat: number, lon: number) => {
    try {
      setError(null);
      const url = `${API_BASE}?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weather_code,is_day,relativehumidity_2m,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=7&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Không lấy được dữ liệu");
      const data = await res.json();
      setWeatherData(data);

      // Optional: reverse geocoding (uncomment if Geocoder is initialized and key provided)
      // try {
      //   const geo = await Geocoder.from(lat, lon);
      //   const comp = geo.results?.[0]?.address_components || [];
      //   const city = comp.find((c:any) => c.types.includes("locality"))?.long_name;
      //   if (city) setCityName(city);
      // } catch (e) {
      //   // fallback to timezone name
      // }

      const parts = data.timezone?.split("/") || [];
      setCityName(parts[parts.length - 1]?.replace("_", " ") || "Vị trí hiện tại");
    } catch (err) {
      console.log(err);
      setError("Lỗi khi tải dữ liệu.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
    const hourly: HourlyItem[] = weatherData.hourly.time.map((t: string, i: number) => {
      const date = new Date(t);
      return {
        date: date.toISOString().split("T")[0],
        time: date.getHours() + "h",
        temp: Math.round(weatherData.hourly.temperature_2m[i]),
        code: weatherData.hourly.weather_code[i],
        isDay: weatherData.hourly.is_day[i] === 1,
      };
    });
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
    else getLocation();
  };

  // selected hours for modal
  const selectedHours = processed.hourly.filter(h => h.date === selectedDay);

  if (loading) {
    return (
      <PaperProvider theme={theme}>
        <LinearGradient colors={["#0f1724", "#243B55"]} style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" />
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ color: "#fff", marginTop: 8 }}>Đang tải dữ liệu...</Text>
            {/* subtle Lottie */}
            <View style={{ width: 140, height: 140, marginTop: 16 }}>
              <LottieView
                source={require("./assets/loader.json")} // add a loader.json in assets (optional)
                autoPlay
                loop
              />
            </View>
          </View>
        </LinearGradient>
      </PaperProvider>
    );
  }

  if (error || !processed.current) {
    return (
      <PaperProvider theme={theme}>
        <LinearGradient colors={["#141E30", "#243B55"]} style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" />
          <View style={styles.center}>
            <Text style={{ color: "#fff", marginBottom: 12 }}>{error || "Không có dữ liệu"}</Text>
            <Button mode="contained" onPress={getLocation} icon={() => <RefreshCw size={18} color="#fff" />}>
              Thử lại
            </Button>
          </View>
        </LinearGradient>
      </PaperProvider>
    );
  }

  // dynamic background image based on day/night (add assets day.jpg/night.jpg)
  const bgImage = processed.current.isDay ? require("./assets/day.jpg") : require("./assets/night.jpg");

  return (
    <PaperProvider theme={theme}>
      <ImageBackground source={bgImage} style={{ flex: 1 }} resizeMode="cover">
        <LinearGradient
          colors={processed.current.isDay ? ["rgba(79,172,254,0.85)", "rgba(0,242,254,0.6)"] : ["rgba(20,30,48,0.9)", "rgba(36,59,85,0.9)"]}
          style={{ flex: 1 }}
        >
          <StatusBar barStyle="light-content" />

          <ScrollView
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          >
            {/* Header: City + Current */}
            <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 100 }}>
              <View style={{ alignItems: "center", marginBottom: 20 }}>
                <Text style={styles.city}>{cityName}</Text>
                <MotiText from={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ delay: 200 }} style={styles.temp}>
                  {processed.current.temp}°C
                </MotiText>
                <Text style={styles.condition}>{processed.current.icon} {processed.current.text}</Text>

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
            </MotiView>

            {/* Cards: Daily forecast */}
            <Card style={styles.card}>
              <Card.Title title="Dự báo 7 ngày" titleStyle={{ color: "#fff" }} />
              {processed.daily.map((d, i) => (
                <TouchableOpacity key={i} onPress={() => setSelectedDay(d.date)}>
                  <List.Item
                    title={`${new Date(d.date).toLocaleDateString("vi-VN", { weekday: "short" })}`}
                    description={`${d.minTemp}° / ${d.maxTemp}°`}
                    left={() => <Text style={{ fontSize: 20 }}>{WMO_MAP[d.code]?.icon || "🌈"}</Text>}
                    right={() => <Text style={{ color: "#fff", alignSelf: "center" }}>{d.maxTemp}°</Text>}
                    titleStyle={{ color: "#fff" }}
                    descriptionStyle={{ color: "#ddd" }}
                  />
                </TouchableOpacity>
              ))}
            </Card>

            {/* Hourly strip: show 12 next hours */}
            <View style={[styles.card, { marginTop: 12 }]}>
              <Text style={styles.cardTitle}>Giờ tiếp theo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 8 }}>
                {processed.hourly.slice(0, 24).map((h, i) => (
                  <MotiView key={i} from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={styles.hourItem} transition={{ delay: i * 20 }}>
                    <Text style={styles.hourText}>{h.time}</Text>
                    <Text style={styles.hourIcon}>{WMO_MAP[h.code]?.icon || "🌈"}</Text>
                    <Text style={styles.hourTemp}>{h.temp}°</Text>
                  </MotiView>
                ))}
              </ScrollView>
            </View>

          </ScrollView>

          {/* Modal: detailed day */}
          <Modal isVisible={!!selectedDay} onBackdropPress={() => setSelectedDay(null)} style={{ margin: 0, justifyContent: 'flex-end' }}>
            <View style={styles.modalContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Dự báo chi tiết {selectedDay}</Text>
                <TouchableOpacity onPress={() => setSelectedDay(null)}>
                  <X size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {selectedHours.length === 0 ? (
                  <Text style={{ color: '#fff' }}>Không có dữ liệu giờ</Text>
                ) : (
                  selectedHours.map((h, i) => (
                    <View key={i} style={styles.hourItemLarge}>
                      <Text style={styles.hourText}>{h.time}</Text>
                      <Text style={styles.hourIcon}>{WMO_MAP[h.code]?.icon || '🌈'}</Text>
                      <Text style={styles.hourTemp}>{h.temp}°</Text>
                    </View>
                  ))
                )}
              </ScrollView>

            </View>
          </Modal>

        </LinearGradient>
      </ImageBackground>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: "#101820", justifyContent: "center", alignItems: "center" },
  city: { fontSize: 24, fontWeight: "700", color: "#fff" },
  temp: { fontSize: 56, fontWeight: "700", color: "#FFD700", textAlign: 'center' },
  condition: { fontSize: 16, color: "#fff", marginTop: 4 },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
    overflow: 'hidden'
  },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8, color: "#fff" },
  hourItem: { alignItems: "center", marginRight: 16, width: 64 },
  hourItemLarge: { alignItems: "center", marginRight: 16, width: 88 },
  hourText: { color: "#fff", fontSize: 14, marginBottom: 4 },
  hourTemp: { color: "#fff", fontSize: 16, fontWeight: "700" },
  hourIcon: { fontSize: 22, marginVertical: 4 },
  dailyItem: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
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
  infoText: { color: "#fff", marginLeft: 8 },

  modalContent: {
    backgroundColor: "#0b1220",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    minHeight: 240,
  },
});

export default WeatherAppEnhanced;
