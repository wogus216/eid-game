/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        stage: resolve(__dirname, 'index.html'),
        join: resolve(__dirname, 'join.html'),
      },
    },
  },
  test: {
    environment: 'node',
  },
})
