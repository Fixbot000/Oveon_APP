import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.dab091b26e6f471b9f52a4ae2fcfee39',
  appName: 'oveon',
  webDir: 'dist',
  server: {
    url: 'https://dab091b2-6e6f-471b-9f52-a4ae2fcfee39.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    },
    Filesystem: {
      permissions: ['read_external_storage', 'write_external_storage']
    }
  }
};

export default config;