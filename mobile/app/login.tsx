import React, { useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Surface, useTheme, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../src/context/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const theme = useTheme();

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await login({ username, password });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.brandSection}>
          <Surface style={styles.logoWrapper} elevation={2}>
            <Image 
              source={require('../assets/images/icon.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </Surface>
          <Text variant="headlineLarge" style={styles.brandTitle}>Mario</Text>
          <Text variant="bodyMedium" style={styles.brandSubtitle}>Restaurant POS System</Text>
        </View>

        <Surface style={styles.loginCard} elevation={1}>
          <Text variant="titleLarge" style={styles.cardTitle}>Login</Text>
          
          <TextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
            autoCapitalize="none"
            disabled={loading}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            style={styles.input}
            secureTextEntry
            left={<TextInput.Icon icon="lock" />}
            disabled={loading}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button 
            mode="contained" 
            onPress={handleLogin} 
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </Button>
        </Surface>

        <View style={styles.footer}>
          <Text variant="bodySmall">Powered by Mario POS</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 80,
    height: 80,
  },
  brandTitle: {
    fontWeight: 'bold',
    color: '#E9762B',
  },
  brandSubtitle: {
    color: '#6c757d',
    marginTop: 4,
  },
  loginCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'white',
  },
  cardTitle: {
    marginBottom: 20,
    fontWeight: '600',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#E9762B',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  errorText: {
    color: '#dc3545',
    marginBottom: 16,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
});
