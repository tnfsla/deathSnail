import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useGameStore } from '@/stores/gameStore';
import { api } from '@/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null; // 시뮬레이터에서는 불가

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token;
}

export default function RootLayout() {
  const { token, isBootstrapping, isDead, bootstrap } = useGameStore();

  // 앱 시작 시 저장된 토큰 복구
  useEffect(() => {
    bootstrap();
  }, []);

  // 로그인 후 푸시 토큰 등록
  useEffect(() => {
    if (!token) return;

    registerForPushNotifications()
      .then((pushToken) => {
        if (pushToken) {
          api.savePushToken(pushToken).catch(() => {});
        }
      })
      .catch(() => {});
  }, [token]);

  // 알림 탭 시 라우팅
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'snail_moved') {
        router.push('/(tabs)/snail');
      }
    });
    return () => sub.remove();
  }, []);

  // 게임오버 → 죽음 화면으로 이동
  useEffect(() => {
    if (isDead) {
      router.replace('/dead');
    }
  }, [isDead]);

  // 부트스트랩 중 로딩 스피너
  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#8B0000" size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        {token ? (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="dead" options={{ gestureEnabled: false }} />
          </>
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
    </>
  );
}
