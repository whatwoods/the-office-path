import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'engine',
          environment: 'node',
          globals: true,
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/components/**', 'tests/store/**', 'tests/lib/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          globals: true,
          include: [
            'tests/**/*.test.tsx',
            'tests/store/**/*.test.ts',
            'tests/lib/**/*.test.ts',
          ],
        },
      },
    ],
  },
})
