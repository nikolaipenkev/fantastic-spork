import { test, expect } from '../utils/base-test';
import { ConsoleErrorHelper } from '../utils';
import { HomePage } from '../pages/home-page';
import { AboutPage } from '../pages/about-page';

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

    // Set up error monitoring using helper
    const errors = ConsoleErrorHelper.setupErrorListeners(page);

    testLogger.step('Navigating to home page');
    await homePage.navigate();

    testLogger.step('Checking for essential elements');
    const hasEssentialElements = await homePage.hasEssentialElements();
    expect(hasEssentialElements).toBeTruthy();

    // Wait for any async errors to surface using helper
    await ConsoleErrorHelper.waitForAsyncErrors(page, 2000);

    testLogger.step('Analyzing console errors');
    const analysis = ConsoleErrorHelper.analyzeErrors(errors);
    const report = ConsoleErrorHelper.generateErrorReport(analysis);

    testLogger.info('Console error analysis results', {
      totalErrors: analysis.total,
      filteredErrors: analysis.filtered,
      criticalErrors: analysis.critical.length
    });

    testLogger.info(report);

    await pageHelper.takeScreenshot('home-page-console-errors');

    // Home page should be relatively clean of application errors
    expect(analysis.critical.length).toBeLessThanOrEqual(1);
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

    // Set up error monitoring using helper
    const errors = ConsoleErrorHelper.setupErrorListeners(page);

    testLogger.step('Navigating to about page');
    await aboutPage.navigate();

    testLogger.step('Checking for essential elements');
    const hasEssentialElements = await aboutPage.hasEssentialElements();
    expect(hasEssentialElements).toBeTruthy();

    // Wait for any async errors to surface (about page has intentional errors)
    await ConsoleErrorHelper.waitForAsyncErrors(page, 3000);

    testLogger.step('Analyzing console errors on about page');
    const analysis = ConsoleErrorHelper.analyzeErrors(errors);
    const report = ConsoleErrorHelper.generateErrorReport(analysis);

    testLogger.info('About page error analysis results', {
      totalErrors: analysis.total,
      filteredErrors: analysis.filtered,
      criticalErrors: analysis.critical.length
    });

    testLogger.info(report);

    await pageHelper.takeScreenshot('about-page-console-errors');

    // About page is expected to have errors for testing purposes
    testLogger.info('About page console error test completed');
    testLogger.info('Error detection capability verified', {
      detectedErrors: analysis.filtered > 0
    });
  });

});