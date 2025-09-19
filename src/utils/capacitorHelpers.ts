import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';

// Check if running on native platform
export const isNativePlatform = () => Capacitor.isNativePlatform();

// Enhanced camera functionality with permissions
export const takePicture = async (): Promise<string> => {
  try {
    // Request camera permissions if on native platform
    if (isNativePlatform()) {
      const permissions = await Camera.requestPermissions();
      if (permissions.camera !== 'granted') {
        throw new Error('Camera permission denied');
      }
    }

    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt, // Let user choose camera or gallery
    });

    if (!image.dataUrl) {
      throw new Error('Failed to capture image');
    }

    return image.dataUrl;
  } catch (error) {
    console.error('Camera error:', error);
    throw error;
  }
};

// Secure storage for auth tokens
export const setSecureItem = async (key: string, value: string): Promise<void> => {
  try {
    await Preferences.set({
      key,
      value,
    });
  } catch (error) {
    console.error('Secure storage set error:', error);
    // Fallback to localStorage if Capacitor fails
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }
};

export const getSecureItem = async (key: string): Promise<string | null> => {
  try {
    const { value } = await Preferences.get({ key });
    return value;
  } catch (error) {
    console.error('Secure storage get error:', error);
    // Fallback to localStorage if Capacitor fails
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  }
};

export const removeSecureItem = async (key: string): Promise<void> => {
  try {
    await Preferences.remove({ key });
  } catch (error) {
    console.error('Secure storage remove error:', error);
    // Fallback to localStorage if Capacitor fails
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
};

// Network status checking
export const checkNetworkStatus = async (): Promise<boolean> => {
  try {
    const status = await Network.getStatus();
    return status.connected;
  } catch (error) {
    console.error('Network status check error:', error);
    // Fallback to navigator.onLine
    return navigator.onLine;
  }
};

// Device information
export const getDeviceInfo = async () => {
  try {
    const info = await Device.getInfo();
    return info;
  } catch (error) {
    console.error('Device info error:', error);
    return {
      platform: 'web',
      operatingSystem: 'unknown',
      osVersion: 'unknown',
      manufacturer: 'unknown',
      model: 'unknown'
    };
  }
};

// Retry mechanism for network requests
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const isConnected = await checkNetworkStatus();
      if (!isConnected) {
        throw new Error('No internet connection');
      }
      
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Request attempt ${i + 1} failed:`, error);
      
      // Don't retry on auth errors or client errors (4xx)
      if (error instanceof Error && (
        error.message.includes('401') ||
        error.message.includes('403') ||
        error.message.includes('400')
      )) {
        throw error;
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError!;
};