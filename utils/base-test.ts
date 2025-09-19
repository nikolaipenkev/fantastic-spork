import { test as base, expect, Page, BrowserContext } from '@playwright/test';
import { ConfigManager, configManager } from './config-manager';

/**
 * Base test class providing common functionality and utilities
 * Implements production-grade patterns for maintainability and scalability
 */
export interface TestFixtures {
  configManager: ConfigManager;
  testLogger: TestLogger;
  pageHelper: PageHelper;
  networkHelper: NetworkHelper;
}

/**
 * Enhanced logging utility for production-grade test debugging
 */
export class TestLogger {
  private testName: string;
  private startTime: number;

  constructor(testName: string) {
    this.testName = testName;
    this.startTime = Date.now();
  }

  info(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] [${this.testName}] ${message}`);
    if (data) {
      console.log('  Data:', JSON.stringify(data, null, 2));
    }
  }

  error(message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] [${this.testName}] ${message}`);
    if (error) {
      console.error('  Error:', error);
    }
  }

  warn(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] [${this.testName}] ${message}`);
    if (data) {
      console.warn('  Data:', JSON.stringify(data, null, 2));
    }
  }

  step(stepName: string): void {
    const elapsed = Date.now() - this.startTime;
    console.log(`[STEP] [${elapsed}ms] ${stepName}`);
  }

  performance(action: string, duration: number): void {
    console.log(`[PERF] ${action}: ${duration}ms`);
  }
}

/**
 * Page interaction utilities with enhanced error handling
 */
export class PageHelper {
  constructor(private page: Page, private logger: TestLogger) {}

  /**
   * Enhanced navigation with retry logic and validation
   */
  async navigateToUrl(url: string, options?: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<void> {
    const startTime = Date.now();
    const timeout = options?.timeout || configManager.getTimeout();
    const waitUntil = options?.waitUntil || 'networkidle';

    try {
      this.logger.step(`Navigating to: ${url}`);
      
      await this.page.goto(url, { 
        timeout,
        waitUntil
      });
      
      const duration = Date.now() - startTime;
      this.logger.performance('Navigation', duration);
      
      // Validate successful navigation
      const currentUrl = this.page.url();
      if (!currentUrl.includes(new URL(url).hostname)) {
        throw new Error(`Navigation failed: Expected hostname not found in ${currentUrl}`);
      }
      
    } catch (error) {
      this.logger.error(`Navigation failed to ${url}`, error);
      throw error;
    }
  }

  /**
   * Enhanced element interaction with multiple selection strategies
   */
  async clickElement(selectors: string | string[], options?: { timeout?: number; force?: boolean }): Promise<void> {
    const selectorsArray = Array.isArray(selectors) ? selectors : [selectors];
    const timeout = options?.timeout || 10000;

    for (const selector of selectorsArray) {
      try {
        this.logger.step(`Attempting to click: ${selector}`);
        await this.page.click(selector, { timeout, force: options?.force });
        this.logger.info(`Successfully clicked: ${selector}`);
        return;
      } catch (error) {
        this.logger.warn(`Failed to click ${selector}`, error);
        if (selector === selectorsArray[selectorsArray.length - 1]) {
          throw new Error(`All selectors failed. Last error: ${error}`);
        }
      }
    }
  }

  /**
   * Enhanced text input with validation
   */
  async fillInput(selectors: string | string[], value: string, options?: { timeout?: number; clear?: boolean }): Promise<void> {
    const selectorsArray = Array.isArray(selectors) ? selectors : [selectors];
    const timeout = options?.timeout || 10000;

    for (const selector of selectorsArray) {
      try {
        this.logger.step(`Filling input: ${selector} with value: ${value}`);
        
        if (options?.clear) {
          await this.page.fill(selector, '', { timeout });
        }
        
        await this.page.fill(selector, value, { timeout });
        
        // Validate input was filled correctly
        const actualValue = await this.page.inputValue(selector);
        if (actualValue !== value) {
          throw new Error(`Input validation failed: expected '${value}', got '${actualValue}'`);
        }
        
        this.logger.info(`Successfully filled input: ${selector}`);
        return;
      } catch (error) {
        this.logger.warn(`Failed to fill input ${selector}`, error);
        if (selector === selectorsArray[selectorsArray.length - 1]) {
          throw new Error(`All selectors failed. Last error: ${error}`);
        }
      }
    }
  }

  /**
   * Wait for element with multiple strategies
   */
  async waitForElement(selectors: string | string[], options?: { 
    state?: 'attached' | 'detached' | 'visible' | 'hidden';
    timeout?: number;
  }): Promise<void> {
    const selectorsArray = Array.isArray(selectors) ? selectors : [selectors];
    const timeout = options?.timeout || 10000;
    const state = options?.state || 'visible';

    for (const selector of selectorsArray) {
      try {
        this.logger.step(`Waiting for element: ${selector} (state: ${state})`);
        await this.page.waitForSelector(selector, { state, timeout });
        this.logger.info(`Element found: ${selector}`);
        return;
      } catch (error) {
        this.logger.warn(`Element not found: ${selector}`, error);
        if (selector === selectorsArray[selectorsArray.length - 1]) {
          throw new Error(`All selectors failed. Last error: ${error}`);
        }
      }
    }
  }

  /**
   * Enhanced screenshot with automatic naming and metadata
   */
  async takeScreenshot(name?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const testName = this.logger['testName'].replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${testName}_${name || 'screenshot'}_${timestamp}.png`;
    
    await this.page.screenshot({ path: `test-results/${filename}`, fullPage: true });
    this.logger.info(`Screenshot saved: ${filename}`);
    return filename;
  }
}

/**
 * Network monitoring and request handling utilities
 */
export class NetworkHelper {
  private responses: Array<{ url: string; status: number; timestamp: number }> = [];

  constructor(private page: Page, private logger: TestLogger) {
    this.setupNetworkMonitoring();
  }

  private setupNetworkMonitoring(): void {
    this.page.on('response', (response) => {
      this.responses.push({
        url: response.url(),
        status: response.status(),
        timestamp: Date.now()
      });
    });
  }

  /**
   * Get all network responses for analysis
   */
  getResponses(): Array<{ url: string; status: number; timestamp: number }> {
    return [...this.responses];
  }

  /**
   * Check for failed requests
   */
  getFailedRequests(): Array<{ url: string; status: number; timestamp: number }> {
    return this.responses.filter(response => response.status >= 400);
  }

  /**
   * Wait for specific network response
   */
  async waitForResponse(urlPattern: string | RegExp, timeout: number = 30000): Promise<void> {
    this.logger.step(`Waiting for response: ${urlPattern}`);
    
    await this.page.waitForResponse(
      response => {
        const url = response.url();
        return typeof urlPattern === 'string' 
          ? url.includes(urlPattern)
          : urlPattern.test(url);
      },
      { timeout }
    );
    
    this.logger.info(`Response received for pattern: ${urlPattern}`);
  }

  /**
   * Clear recorded responses
   */
  clearResponses(): void {
    this.responses = [];
  }
}

/**
 * Enhanced test fixture with production-grade utilities
 */
export const test = base.extend<TestFixtures>({
  configManager: async ({}, use) => {
    await use(configManager);
  },

  testLogger: async ({}, use, testInfo) => {
    const logger = new TestLogger(testInfo.title);
    logger.info('Test started', {
      project: testInfo.project.name,
      file: testInfo.file,
      timeout: testInfo.timeout
    });
    
    await use(logger);
    
    const duration = Date.now() - logger['startTime'];
    logger.info('Test completed', {
      status: testInfo.status,
      duration: `${duration}ms`,
      errors: testInfo.errors
    });
  },

  pageHelper: async ({ page, testLogger }, use) => {
    const helper = new PageHelper(page, testLogger);
    await use(helper);
  },

  networkHelper: async ({ page, testLogger }, use) => {
    const helper = new NetworkHelper(page, testLogger);
    await use(helper);
  }
});

export { expect };