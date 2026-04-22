import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="home" />
        <Stack.Screen name="add-habit" />
        <Stack.Screen name="calender" />
        <Stack.Screen name="insights" />
        <Stack.Screen name="alerts" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="timer" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}