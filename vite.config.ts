import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({plugins:[react()],base:'/travel-packing-checklist/',resolve:{alias:{'@':path.resolve(__dirname,'.')}},build:{outDir:'docs',emptyOutDir:true}});
