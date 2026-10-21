import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { LoadingScreen } from '@/components';
import { AuthProvider, ProfileErrorScreen, useAuth } from '@/features/auth';
import { QueryProvider } from '@/features/dokumen';
import { ScanSessionProvider } from '@/features/scan';
import { stackScreenOptions } from '@/theme';

// Tahan splash screen sampai font dan status masuk selesai ditentukan, supaya layar masuk
// tidak sempat berkedip sebelum pengguna dipindahkan ke Dashboard.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <QueryProvider>
        <ScanSessionProvider>
          <RootNavigator />
        </ScanSessionProvider>
      </QueryProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { status, isAdmin } = useAuth();

  useEffect(() => {
    if (status !== 'loading') {
      SplashScreen.hideAsync();
    }
  }, [status]);

  if (status === 'loading') {
    return <LoadingScreen />;
  }
  if (status === 'error') {
    return <ProfileErrorScreen />;
  }

  const isSignedIn = status === 'signedIn';

  // Stack.Protected: layar di dalamnya hanya bisa dibuka bila `guard` bernilai true. Bila nilainya
  // berubah (masuk atau keluar), expo-router memindahkan pengguna otomatis ke layar yang diizinkan.
  // Ini pembatas tampilan saja; keamanan data sebenarnya ada di RLS dan Edge Function.
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="dokumen/[id]" options={{ title: 'Detail dokumen' }} />
        <Stack.Screen name="editor/[halamanId]" options={{ title: 'Editor' }} />
        <Stack.Protected guard={isAdmin}>
          <Stack.Screen name="admin" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}