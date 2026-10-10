import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  use: { baseURL: 'http://127.0.0.1:3101', viewport: { width: 1440, height: 1050 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:3101/api/health',
    reuseExistingServer: false,
    env: { PORT: '3101', AGENTBREAK_DATA_DIR: join(tmpdir(), 'omnirush', `agentbreak-e2e-${Date.now()}`) },
  },
});
