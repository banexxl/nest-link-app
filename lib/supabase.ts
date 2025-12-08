// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
     console.warn('Supabase credentials missing in EXPO_PUBLIC env vars');
}

// Detect real React Native runtime (device / emulator / Expo Go)
const isReactNative =
     typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

// LargeAsyncStorage to handle tokens > 2048 bytes by chunking (RN only)
class LargeAsyncStorage {
     private async _getChunks(key: string): Promise<string[]> {
          const chunks: string[] = [];
          let index = 0;

          while (true) {
               const chunkKey = `${key}_${index}`;
               const chunk = await AsyncStorage.getItem(chunkKey);
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
               const chunkKey = `${key}_${i}`;
               await AsyncStorage.setItem(chunkKey, chunks[i]);
          }

          // Clean up old chunks if value got smaller
          let i = chunks.length;
          while (true) {
               const oldChunkKey = `${key}_${i}`;
               const oldChunk = await AsyncStorage.getItem(oldChunkKey);
               if (!oldChunk) break;
               await AsyncStorage.removeItem(oldChunkKey);
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
               const chunkKey = `${key}_${index}`;
               const chunk = await AsyncStorage.getItem(chunkKey);
               if (!chunk) break;
               await AsyncStorage.removeItem(chunkKey);
               index++;
          }
     }
}

// NO-OP storage for non-RN environments (Node during bundling, etc.)
const noopStorage = {
     async getItem(_key: string): Promise<string | null> {
          return null;
     },
     async setItem(_key: string, _value: string): Promise<void> {
          // no-op
     },
     async removeItem(_key: string): Promise<void> {
          // no-op
     },
};

// Use real storage only on React Native runtime; otherwise use no-op
const storage = isReactNative ? new LargeAsyncStorage() : noopStorage;

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
     auth: {
          storage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
     },
});
