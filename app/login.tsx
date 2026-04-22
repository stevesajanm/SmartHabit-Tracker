import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { saveHabits } from '../utils/habitStorage';
import { Colors } from '../utils/theme';

const API_URL = 'http://192.168.150.221:5000';

export default function LoginScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (isLogin) {
      if (!email || !password) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await response.json();
        if (!response.ok) {
          Alert.alert('Login Failed', data.message || 'Invalid credentials');
          return;
        }
        await AsyncStorage.setItem('@jwt_token', data.token);
        await AsyncStorage.setItem('@user_name', data.user.name);
        await AsyncStorage.setItem('@user_email', data.user.email);
        await AsyncStorage.setItem('@user_id', data.user.id);
        router.push({ pathname: '/home', params: { name: data.user.name } });
      } catch (error) {
        Alert.alert('Error', 'Cannot connect to server.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!name || !email || !password) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
        });
        const data = await response.json();
        if (!response.ok) {
          Alert.alert('Signup Failed', data.message || 'Could not create account');
          return;
        }
        const firstName = data.user.name.split(' ')[0];
        await AsyncStorage.setItem('@jwt_token', data.token);
        await AsyncStorage.setItem('@user_name', firstName);
        await AsyncStorage.setItem('@user_email', data.user.email);
        await AsyncStorage.setItem('@user_id', data.user.id);
        await saveHabits([]);
        await AsyncStorage.removeItem('@user_avatar');
        await AsyncStorage.removeItem('@join_date');
        router.push({ pathname: '/home', params: { name: firstName } });
      } catch (error) {
        Alert.alert('Error', 'Cannot connect to server.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Text style={styles.emoji}>🎯</Text>
          <Text style={styles.appName}>SmartHabit</Text>
          <Text style={styles.welcomeText}>{isLogin ? 'Welcome Back!' : 'Create Account'}</Text>
        </View>

        <View style={styles.formContainer}>
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name</Text>
              <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} placeholder="your@email.com" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput style={styles.passwordInput} placeholder="Enter password" placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeEmoji}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[styles.submitButton, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.submitButtonText}>{loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}</Text>
          </TouchableOpacity>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>{isLogin ? "Don't have an account? " : 'Already have an account? '}</Text>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text style={styles.toggleLink}>{isLogin ? 'Sign Up' : 'Login'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, paddingHorizontal: 30, justifyContent: 'center' },
  headerContainer: { alignItems: 'center', marginBottom: 40 },
  emoji: { fontSize: 60, marginBottom: 12 },
  appName: { fontSize: 36, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 4 },
  welcomeText: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
  formContainer: { width: '100%' },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 13, color: Colors.textMuted, marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingRight: 15 },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  eyeEmoji: { fontSize: 20 },
  submitButton: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20, elevation: 4 },
  submitButtonText: { color: Colors.background, fontSize: 18, fontWeight: 'bold' },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  toggleText: { color: Colors.textMuted, fontSize: 14 },
  toggleLink: { color: Colors.primary, fontSize: 14, fontWeight: 'bold' },
});