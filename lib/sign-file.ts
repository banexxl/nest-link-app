// lib/sign-file.ts
const API_BASE_URL = process.env.EXPO_PUBLIC_WEB_APP_URL;

if (!API_BASE_URL) {
     console.warn(
          'EXPO_PUBLIC_WEB_APP_URL is not set – signing files will fail.'
     );
}

type SignFilePayload = {
     bucket: string;
     path: string;
     ttlSeconds?: number;
};

export async function signFileUrl(
     { bucket, path, ttlSeconds = 60 * 30 }: SignFilePayload,
     silent = false
): Promise<string | null> {
     try {
          if (!API_BASE_URL) {
               throw new Error('EXPO_PUBLIC_WEB_APP_URL is missing');
          }

          const res = await fetch(`${API_BASE_URL}/api/storage/sign-file`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                    bucket,
                    path,
                    ttlSeconds,
               }),
          });

          if (!res.ok) {
               const text = await res.text();
               console.error(
                    'signFileUrl failed; HTTP',
                    res.status,
                    'body:',
                    text.slice(0, 200)
               );
               throw new Error(`Failed to sign file (${res.status})`);
          }

          const data = await res.json();
          return data?.signedUrl ?? null;
     } catch (err) {
          console.error('signFileUrl failed', err);
          if (!silent) {
               // here you could hook in a toast for the app if you want
          }
          return null;
     }
}
