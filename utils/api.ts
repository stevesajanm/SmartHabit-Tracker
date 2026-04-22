import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your local machine's IP address if testing on a real device
const API_BASE_URL = 'http://192.168.150.221:5000/api';

export const api = {
  signup: async (userData: any) => {
    console.log(`Calling Signup: ${API_BASE_URL}/auth/signup`);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('Signup error response:', data);
        throw new Error(data.message || 'Signup failed');
      }
      return data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  },

  login: async (credentials: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('Login error response:', data);
        throw new Error(data.message || 'Login failed');
      }
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  setToken: async (token: string) => {
    await AsyncStorage.setItem('auth_token', token);
  },

  getToken: async () => {
    return await AsyncStorage.getItem('auth_token');
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
  },
};
