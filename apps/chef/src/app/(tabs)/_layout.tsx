import { Tabs } from 'expo-router';

// Earnings, calendar and profile tabs (C09, C10, C12) come later; until then there's no tab bar.
export default function TabsLayout() {
  return (
    <Tabs tabBar={() => null} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
    </Tabs>
  );
}
