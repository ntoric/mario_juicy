import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * A safe wrapper around Expo SecureStore with memory fallback.
 * Resolves the "getValueWithKeyAsync is not a function" error.
 */

const memoryStorage: Record<string, string> = {};

export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS !== 'web') {
        return await SecureStore.getItemAsync(key);
      }
    } catch (e) {
      console.warn(`[Storage] Failed to get ${key} from SecureStore, trying memory`);
    }
    return memoryStorage[key] || null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (e) {
      console.warn(`[Storage] Failed to set ${key} in SecureStore, using memory fallback`);
    }
    memoryStorage[key] = value;
  },

  deleteItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (e) {}
    delete memoryStorage[key];
  }
};
