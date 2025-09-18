
import { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, useColorScheme, View, FlatList } from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { fetchweather } from './src/api/api';
import { requestlocationPermission } from './src/permissions/permisstions';
import Geolocation from '@react-native-community/geolocation';
import { GeoCoordinates } from 'react-native-geolocation-service';

type LocationType = GeoCoordinates | null;
type WeatherItem = {
  time: string;
  pm10: number;
  pm2_5: number
}
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

  const [location, setLocation] = useState<LocationType>(null)
  const [weather, setWeather] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const permisstion = await requestlocationPermission()
      if (!permisstion) return;

      Geolocation.getCurrentPosition(
        async (pos) => {
          setLocation(pos.coords);
          const res = await fetchweather(pos.coords.latitude, pos.coords.longitude);
          console.log(res)
          setWeather(res);
        },
        (error) => {
          console.log(error)
        },
        {
          enableHighAccuracy: true, timeout: 30000, maximumAge: 10000
        }
      )
    })();
  }, [])

  if (!location) {
    return (<View>
      <Text>Loading...</Text>
    </View>)
  }

  const time = weather?.hourly?.time.slice(0, 10) ?? []
  const pm10 = weather?.hourly.pm10.slice(0, 10) ?? []
  const pm2_5 = weather?.hourly.pm2_5.slice(0, 10) ?? []

  const data: WeatherItem[] = time.map((t: string, i: number) => ({
    time: t,
    pm10: pm10[i],
    pm2_5: pm2_5[i]
  }))

  return (
    <View style={styles.container}>
      <Text>App weather</Text>
      <FlatList
        data={data}
        keyExtractor={(item) => item.time}
        renderItem={({ item, index }) => (
          <View style={styles.item}>
            <Text style={styles.titleTime}>{item.time}</Text>
            <Text>PM10 : {item.pm10}</Text>
            <Text>PM2_5: {item.pm2_5}</Text>
          </View>
        )} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2
  },
  titleTime: {
    fontWeight: 'bold', fontSize: 16
  }
});

export default App;
