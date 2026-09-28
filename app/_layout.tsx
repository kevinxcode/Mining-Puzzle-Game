/**
 * Mining Puzzle Game — root layout.
 */

import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/theme/tokens';

/** Routes drawn over dark artwork need light status bar icons. */
const LIGHT_STATUS_BAR_ROUTES = new Set(['/']);

export default function RootLayout() {
  const pathname = usePathname();
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar style={LIGHT_STATUS_BAR_ROUTES.has(pathname) ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="campaign" />
          <Stack.Screen name="level/[id]" />
          <Stack.Screen name="game/[id]" />
          <Stack.Screen name="equipment" />
          <Stack.Screen name="statistics" />
          <Stack.Screen name="achievements" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="modes" />
          <Stack.Screen name="induction/index" />
          <Stack.Screen name="induction/[id]" />
          <Stack.Screen name="induction/glossary" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});