import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';
import { Jimp as JimpClass } from 'jimp';

const Jimp = JimpClass as any;

export default defineConfig(async () => {
  // Synchronous/Asynchronous asset preparation for PWA static files using Jimp
  try {
    const publicDir = path.resolve(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const sourceIcon = path.resolve(__dirname, 'src/assets/images/smarttask_padded_logo_1781188940674.jpg');
    if (fs.existsSync(sourceIcon)) {
      console.log('[PWA Asset Initializer] Converting and padding source logo to 1:1 using Jimp...');
      const image = await Jimp.read(sourceIcon);
      const w = image.bitmap.width;
      const h = image.bitmap.height;
      
      const size = Math.max(w, h);
      const squareImage = new Jimp(size, size, 0x1A1A1AFF);
      const x = Math.floor((size - w) / 2);
      const y = Math.floor((size - h) / 2);
      squareImage.composite(image, x, y);

      // Create 192x192
      const icon192 = squareImage.clone().resize(192, 192);
      await icon192.writeAsync(path.join(publicDir, 'icon-192.png'));
      await icon192.quality(95).writeAsync(path.join(publicDir, 'icon-192.jpg'));

      // Create 512x512
      const icon512 = squareImage.clone().resize(512, 512);
      await icon512.writeAsync(path.join(publicDir, 'icon-512.png'));
      await icon512.quality(95).writeAsync(path.join(publicDir, 'icon-512.jpg'));

      // Create maskable
      const maskable = squareImage.clone().resize(512, 512);
      await maskable.writeAsync(path.join(publicDir, 'maskable-icon.png'));
      await maskable.quality(95).writeAsync(path.join(publicDir, 'maskable-icon.jpg'));

      // Create favicon
      const favicon = squareImage.clone().resize(64, 64);
      await favicon.writeAsync(path.join(publicDir, 'favicon.png'));
      await favicon.quality(95).writeAsync(path.join(publicDir, 'favicon.jpg'));

      console.log('[PWA Asset Initializer] Successfully generated and synced 1:1 PWA icon assets (both PNG and JPEG) to public/!');
    } else {
      console.warn('[PWA Asset Initializer] Source icon not found at', sourceIcon);
    }
  } catch (error) {
    console.error('[PWA Asset Initializer] Failed to sync and process PWA icon assets:', error);
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
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
