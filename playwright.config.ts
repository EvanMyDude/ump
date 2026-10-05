import { defineConfig, devices } from '@playwright/test';

// Runs against the production build served by `vite preview`.
// SwiftShader flags give headless Chromium a working WebGL2 context without a GPU.
export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/',
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
