import { defineConfig } from 'vite';
export default defineConfig({
  base:'/nba-tendencias/',
  build:{rollupOptions:{output:{manualChunks(id){
    if(/node_modules\/(recharts|d3-|victory-vendor)/.test(id))return 'charts';
    if(/node_modules/.test(id))return 'vendor';
  }}}}
});
