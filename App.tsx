import { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, useColorScheme, View, FlatList, Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fetchweather } from './src/api/api';
import { requestlocationPermission } from './src/permissions/permisstions';
import Geolocation from '@react-native-community/geolocation';
import { GeoCoordinates } from 'react-native-geolocation-service';

type LocationType = GeoCoordinates | null;
type WeatherItem = {
  time: string;
  pm10: number;
  pm2_5: number;
  isDaytime: boolean;
};

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [location, setLocation] = useState<LocationType>(null);
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const permisstion = await requestlocationPermission();
      if (!permisstion) return;

      Geolocation.getCurrentPosition(
        async (pos) => {
          setLocation(pos.coords);
          const res = await fetchweather(pos.coords.latitude, pos.coords.longitude);
          setWeather(res);
        },
        (error) => {
          console.log(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 10000,
        }
      );
    })();
  }, []);

  if (!location || !weather) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  const time = weather?.hourly?.time.slice(0, 12) ?? [];
  const pm10 = weather?.hourly.pm10.slice(0, 12) ?? [];
  const pm2_5 = weather?.hourly.pm2_5.slice(0, 12) ?? [];

  const data: WeatherItem[] = time.map((t: string, i: number) => ({
    time: t,
    pm10: pm10[i],
    pm2_5: pm2_5[i],
    isDaytime: new Date(t).getHours() >= 6 && new Date(t).getHours() < 18,
  }));

  const getAQIColor = (pm: number) => {
    if (pm < 50) return '#4CAF50'; // xanh: tốt
    if (pm < 100) return '#FFC107'; // vàng: trung bình
    return '#F44336'; // đỏ: xấu
  };

  const getIconUrl = (isDaytime: boolean, pm: number) => {
    if (pm > 100) return 'https://img.icons8.com/fluency/48/smog.png';
    return isDaytime
      ? 'https://img.icons8.com/fluency/48/sun.png'
      : 'https://img.icons8.com/fluency/48/moon.png';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.city}>Vị trí hiện tại</Text>
        <Text style={styles.subtitle}>AQI dựa trên PM2.5 & PM10</Text>
      </View>

      {/* Weather List */}
      <FlatList
        data={data}
        horizontal
        keyExtractor={(item) => item.time}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: item.isDaytime ? '#4DA1FF' : '#2E3B55' },
            ]}
          >
            <Text style={styles.time}>{new Date(item.time).getHours()}h</Text>

            {/* Icon từ URL */}
            <Image
              source={{ uri: getIconUrl(item.isDaytime, item.pm2_5) }}
              style={{ width: 40, height: 40, marginVertical: 4 }}
            />

            <Text style={[styles.aqi, { color: getAQIColor(item.pm2_5) }]}>
              PM2.5: {item.pm2_5}
            </Text>
            <Text style={[styles.aqi, { color: getAQIColor(item.pm10) }]}>
              PM10: {item.pm10}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101820' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#999' },
  header: { padding: 16, alignItems: 'center' },
  city: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#ccc' },
  card: {
    width: 120,
    marginRight: 12,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: { fontSize: 18, fontWeight: '600', color: '#fff' },
  aqi: { marginTop: 6, fontWeight: 'bold' },
});

export default App;
