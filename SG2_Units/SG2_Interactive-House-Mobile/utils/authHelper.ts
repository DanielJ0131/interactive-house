import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const getStoredToken = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('userToken');
  }
  return await SecureStore.getItemAsync('userToken');
};