import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  clean: true,
  dts: true,
  sourcemap: true,
  platform: 'node',
  target: 'node20',
  external: [
    '@libsql/client',
    'better-auth',
    'drizzle-orm',
    'hono',
    '@hono/trpc-server',
    '@trpc/server',
    '@trpc/client',
    'zod',
    'dotenv'
  ],
  esbuildOptions: {
    keepNames: true,
  }
});