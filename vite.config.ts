import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // Synchronous asset preparation for PWA static files
  try {
    const publicDir = path.resolve(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const sourceIcon = path.resolve(__dirname, 'src/assets/images/smarttask_new_logo_1781097236356.png');
    if (fs.existsSync(sourceIcon)) {
      fs.copyFileSync(sourceIcon, path.join(publicDir, 'icon-192.png'));
      fs.copyFileSync(sourceIcon, path.join(publicDir, 'icon-512.png'));
      fs.copyFileSync(sourceIcon, path.join(publicDir, 'maskable-icon.png'));
      fs.copyFileSync(sourceIcon, path.join(publicDir, 'favicon.png'));
      console.log('[PWA Asset Initializer] Successfully synced PWA icon assets to public/!');
    } else {
      console.warn('[PWA Asset Initializer] Source icon not found at', sourceIcon);
    }
  } catch (error) {
    console.error('[PWA Asset Initializer] Failed to sync PWA icon assets:', error);
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
