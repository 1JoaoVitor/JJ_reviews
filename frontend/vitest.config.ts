import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config'; // Puxa as suas configurações do React e caminhos (aliases)

export default mergeConfig(viteConfig, defineConfig({
   test: {
      globals: true,
      environment: 'jsdom',
      coverage: {
         provider: 'v8',
         include: ['src/**/logic/**/*.ts'],
         exclude: [
            'src/**/__tests__/**', 
            'src/**/*.d.ts'
         ],
         thresholds: {
            lines: 90,
            functions: 90,
            branches: 90,
            statements: 90
         }
      }
   }
}));