import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config'; // Puxa as suas configurações do React e caminhos (aliases)

export default mergeConfig(viteConfig, defineConfig({
   test: {
      globals: true,
      environment: 'jsdom',
      coverage: {
         provider: 'v8',
         include: [
            'src/**/logic/**/*.ts',
            'src/**/services/**/*.ts',
            'src/features/auth/hooks/useAuthState.ts'
         ],
         exclude: [
            'src/**/__tests__/**', 
            'src/**/*.d.ts',
            'src/features/movies/services/tmdbService.ts'
         ],
         thresholds: {
            lines: 75,
            functions: 75,
            branches: 65,
            statements: 68
         }
      }
   }
}));