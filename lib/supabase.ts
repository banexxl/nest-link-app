import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
     console.warn('Supabase credentials missing in EXPO_PUBLIC env vars');
}

// LargeSecureStore to handle tokens > 2048 bytes by chunking
class LargeSecureStore {
     private async _getChunks(key: string): Promise<string[]> {
          const chunks: string[] = [];
          let index = 0;
          while (true) {
               const chunk = await SecureStore.getItemAsync(`${key}_${index}`);
               if (!chunk) break;
               chunks.push(chunk);
               index++;
          }
          return chunks;
     }

     private async _setChunks(key: string, value: string): Promise<void> {
          const chunkSize = 2000;
          const chunks = value.match(new RegExp(`.{1,${chunkSize}}`, 'g')) || [];

          // Store chunks
          for (let i = 0; i < chunks.length; i++) {
               await SecureStore.setItemAsync(`${key}_${i}`, chunks[i]);
          }

          // Clean up old chunks if value got smaller
          let i = chunks.length;
          while (true) {
               const oldChunk = await SecureStore.getItemAsync(`${key}_${i}`);
               if (!oldChunk) break;
               await SecureStore.deleteItemAsync(`${key}_${i}`);
               i++;
          }
     }

     async getItem(key: string): Promise<string | null> {
          const chunks = await this._getChunks(key);
          return chunks.length > 0 ? chunks.join('') : null;
     }

     async setItem(key: string, value: string): Promise<void> {
          await this._setChunks(key, value);
     }

     async removeItem(key: string): Promise<void> {
          let index = 0;
          while (true) {
               const chunk = await SecureStore.getItemAsync(`${key}_${index}`);
               if (!chunk) break;
               await SecureStore.deleteItemAsync(`${key}_${index}`);
               index++;
          }
     }
}

const largeSecureStore = new LargeSecureStore();

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
     auth: {
          storage: largeSecureStore,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
     },
});
