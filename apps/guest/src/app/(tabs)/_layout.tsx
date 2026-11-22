import { Tabs } from 'expo-router';

// G04 puts bookings and account as icons on the home screen, so there's no tab bar.
// Expo Router 58 renders only declared screens.
export default function TabsLayout() {
  return (
    <Tabs tabBar={() => null} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
