import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSignedUrl } from '@/lib/storage';

interface CachedImage {
  url: string;
  timestamp: number;
  expiresAt: number;
}

interface ImageCacheState {
  cache: Record<string, CachedImage>;
  loading: Record<string, boolean>;
}

interface ImageCacheActions {
  getCachedUrl: (bucket: string, path: string) => Promise<string | null>;
  clearExpiredCache: () => void;
  clearAllCache: () => void;
}

const CACHE_DURATION = 50 * 60 * 1000; // 50 minutes (signed URLs last 1 hour)

export const useImageCache = create<ImageCacheState & ImageCacheActions>()(
  persist(
    (set, get) => ({
      cache: {},
      loading: {},

      getCachedUrl: async (bucket: string, path: string) => {
        const cacheKey = `${bucket}/${path}`;
        const state = get();
        const now = Date.now();

        // Check if we have a valid cached URL
        const cached = state.cache[cacheKey];
        if (cached && cached.expiresAt > now) {
          return cached.url;
        }

        // Prevent duplicate requests
        if (state.loading[cacheKey]) {
          return null;
        }

        // Set loading state
        set(state => ({
          loading: { ...state.loading, [cacheKey]: true }
        }));

        try {
          const signedUrl = await getSignedUrl(bucket, path, 3600); // 1 hour
          
          if (signedUrl) {
            // Cache the URL
            set(state => ({
              cache: {
                ...state.cache,
                [cacheKey]: {
                  url: signedUrl,
                  timestamp: now,
                  expiresAt: now + CACHE_DURATION
                }
              },
              loading: { ...state.loading, [cacheKey]: false }
            }));
            
            return signedUrl;
          }
        } catch (error) {
          console.error('Failed to get signed URL:', error);
        }

        // Clear loading state
        set(state => ({
          loading: { ...state.loading, [cacheKey]: false }
        }));

        return null;
      },

      clearExpiredCache: () => {
        const now = Date.now();
        set(state => ({
          cache: Object.fromEntries(
            Object.entries(state.cache).filter(([, cached]) => cached.expiresAt > now)
          )
        }));
      },

      clearAllCache: () => {
        set({ cache: {}, loading: {} });
      }
    }),
    {
      name: 'image-cache',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ cache: state.cache })
    }
  )
);

// Auto-cleanup expired cache every 10 minutes
setInterval(() => {
  useImageCache.getState().clearExpiredCache();
}, 10 * 60 * 1000);