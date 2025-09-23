import { test as base, expect } from '@playwright/test';
import { ConfigManager, configManager } from './config-manager';
import { TestLogger } from './test-logger';
import { PageHelper } from './page-helper';

export interface TestFixtures {
  configManager: ConfigManager;
  testLogger: TestLogger;
  pageHelper: PageHelper;
}

export const test = base.extend<TestFixtures>({
  configManager: async ({}, use) => {
    await use(configManager);
  },

  testLogger: async ({}, use, testInfo) => {
    const logger = new TestLogger(testInfo.title);
    await use(logger);
  },

  pageHelper: async ({ page, testLogger }, use) => {
    const helper = new PageHelper(page, testLogger);
    await use(helper);
  }
});

export { expect };