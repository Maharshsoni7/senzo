import { Tabs } from 'expo-router';

// G04 puts bookings and account as icons on the home screen, so there's no tab bar.
export default function TabsLayout() {
  return <Tabs tabBar={() => null} screenOptions={{ headerShown: false }} />;
}
