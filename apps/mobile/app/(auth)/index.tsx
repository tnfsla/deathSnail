import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { api } from '@/lib/api';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { setToken, setUser, setSnail } = useGameStore();

  const handleRegister = async () => {
    if (!username.trim()) {
      Alert.alert('오류', '사용자 이름을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const { token, user, snail } = await api.register(username.trim());
      setToken(token);
      setUser(user);
      setSnail(snail);
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐌</Text>
      <Text style={styles.title}>살인달팽이</Text>
      <Text style={styles.subtitle}>
        지금 이 순간, 달팽이 한 마리가 당신을 향해 출발했습니다.
      </Text>
      <Text style={styles.description}>
        달팽이는 절대 멈추지 않습니다.{'\n'}
        절대 포기하지 않습니다.{'\n'}
        그리고 언제나 당신이 있는 곳을 압니다.
      </Text>

      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder="사용자 이름"
        placeholderTextColor="#555"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>시작하기</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.warning}>
        ⚠️ 시작하면 달팽이가 생성됩니다. 취소할 수 없습니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  input: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    width: '100%',
    backgroundColor: '#8B0000',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warning: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    lineHeight: 18,
  },
});
