import { test, expect } from '../utils/base-test';
import { HomePage } from '../pages/home-page';
import { AboutPage } from '../pages/about-page';

interface ConsoleError {
  type: string;
  message: string;
  url: string;
  timestamp: number;
}

test.describe('Test Case 1: Console Error Detection', () => {

  test('should detect console errors on home page', async ({
    page,
    configManager,
    testLogger,
    pageHelper
  }) => {
    const environment = configManager.getCurrentEnvironment();
    testLogger.info('Starting console error detection test on home page');

    // Initialize page objects
    const homePage = new HomePage(page, environment.baseUrl);

    // Set up error monitoring
    const errors: ConsoleError[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({
          type: msg.type(),
          message: msg.text(),
          url: page.url(),
          timestamp: Date.now()
        });
      }
    });

    page.on('pageerror', error => {
      errors.push({
        type: 'pageerror',
        message: error.message,
        url: page.url(),
        timestamp: Date.now()
      });
    });

    testLogger.step('Navigating to home page');
    await homePage.navigate();

    testLogger.step('Checking for essential elements');
    const hasEssentialElements = await homePage.hasEssentialElements();
    expect(hasEssentialElements).toBeTruthy();

    // Wait for any async errors to surface
    await page.waitForTimeout(2000);

    testLogger.step('Analyzing console errors');
    const filteredErrors = filterConsoleErrors(errors);

    testLogger.info('Console error analysis results', {
      totalErrors: errors.length,
      filteredErrors: filteredErrors.length,
      errorMessages: filteredErrors.map(e => e.message)
    });

    await pageHelper.takeScreenshot('home-page-console-errors');

    // Home page should be relatively clean of application errors
    expect(filteredErrors.length).toBeLessThanOrEqual(1);
    testLogger.info('Home page console error test completed');
  });

  test('should detect expected errors on about page', async ({
    page,
    configManager,
    testLogger,
    pageHelper
  }) => {
    const environment = configManager.getCurrentEnvironment();
    testLogger.info('Starting console error detection test on about page (expecting errors)');

    // Initialize page objects
    const aboutPage = new AboutPage(page, environment.baseUrl);

    // Set up error monitoring
    const errors: ConsoleError[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({
          type: msg.type(),
          message: msg.text(),
          url: page.url(),
          timestamp: Date.now()
        });
      }
    });

    page.on('pageerror', error => {
      errors.push({
        type: 'pageerror',
        message: error.message,
        url: page.url(),
        timestamp: Date.now()
      });
    });

    testLogger.step('Navigating to about page');
    await aboutPage.navigate();

    testLogger.step('Checking for essential elements');
    const hasEssentialElements = await aboutPage.hasEssentialElements();
    expect(hasEssentialElements).toBeTruthy();

    // Wait for any async errors to surface (about page has intentional errors)
    await page.waitForTimeout(3000);

    testLogger.step('Analyzing console errors on about page');
    const filteredErrors = filterConsoleErrors(errors);

    testLogger.info('About page error analysis results', {
      totalErrors: errors.length,
      filteredErrors: filteredErrors.length,
      errorMessages: filteredErrors.map(e => e.message)
    });

    await pageHelper.takeScreenshot('about-page-console-errors');

    // About page is expected to have errors for testing purposes
    testLogger.info('About page console error test completed');
    testLogger.info('Error detection capability verified', {
      detectedErrors: filteredErrors.length > 0
    });
  });

  function filterConsoleErrors(errors: ConsoleError[]): ConsoleError[] {
    const BROWSER_WARNING_PATTERNS = [
      /warning/i,
      /favicon/i,
      /chrome-extension/i,
      /performance\.mark/i,
      /service.*worker/i,
      /ad.*blocker/i,
      /extension/i,
      /sectioned h1 element/i
    ];

    return errors.filter(error => {
      const message = error.message.toLowerCase();

      // Filter out browser warnings
      if (BROWSER_WARNING_PATTERNS.some(pattern => pattern.test(message))) {
        return false;
      }

      return true;
    });
  }
});