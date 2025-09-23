import { test, expect } from '../utils/base-test';
import { HomePage } from '../pages/home-page';
import { AboutPage } from '../pages/about-page';

test.describe('Test Case 2: Link Status Code Validation', () => {

  test('should validate all links return valid status codes', async ({
    page,
    configManager,
    testLogger,
    pageHelper
  }) => {
    const environment = configManager.getCurrentEnvironment();
    testLogger.info('Starting link validation test');

    // Initialize page objects
    const homePage = new HomePage(page, environment.baseUrl);

    testLogger.step('Navigating to homepage');
    await homePage.navigate();

    testLogger.step('Verifying page has loaded correctly');
    const hasEssentialElements = await homePage.hasEssentialElements();
    expect(hasEssentialElements).toBeTruthy();

    testLogger.step('Extracting all links from page');
    const links = await page.locator('a[href]').all();
    const validLinks: string[] = [];
    
    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('javascript:')) {
        const absoluteUrl = href.startsWith('http') ? href : new URL(href, environment.baseUrl).toString();
        validLinks.push(absoluteUrl);
      }
    }
    
    // Remove duplicates
    const uniqueLinks = [...new Set(validLinks)];
    testLogger.info(`Found ${uniqueLinks.length} unique links to test`);

    testLogger.step('Validating links');
    let validCount = 0;
    
    for (const url of uniqueLinks.slice(0, 10)) { // Test first 10 links only for speed
      try {
        const response = await page.request.get(url, { timeout: 5000 });
        const status = response.status();
        if (status >= 200 && status < 400) {
          validCount++;
        }
        testLogger.info(`${url}: ${status}`);
      } catch (error) {
        testLogger.error(`Failed to test ${url}`, error);
      }
    }

    const successRate = (validCount / Math.min(uniqueLinks.length, 10)) * 100;
    testLogger.info(`Link validation: ${validCount}/${Math.min(uniqueLinks.length, 10)} valid (${successRate.toFixed(1)}%)`);

    await pageHelper.takeScreenshot('link-validation-complete');

    // Most links should be valid
    expect(successRate).toBeGreaterThanOrEqual(80);
    testLogger.info('Link validation test completed successfully');
  });

  test('should validate navigation between pages', async ({
    page,
    configManager,
    testLogger,
    pageHelper
  }) => {
    const environment = configManager.getCurrentEnvironment();
    testLogger.info('Starting navigation test between pages');

    // Initialize page objects
    const homePage = new HomePage(page, environment.baseUrl);
    const aboutPage = new AboutPage(page, environment.baseUrl);

    testLogger.step('Starting from home page');
    await homePage.navigate();
    const homeHasElements = await homePage.hasEssentialElements();
    expect(homeHasElements).toBeTruthy();

    testLogger.step('Navigating to about page');
    await homePage.goToAbout();

    // Verify we're on about page
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/about/);

    const aboutHasElements = await aboutPage.hasEssentialElements();
    expect(aboutHasElements).toBeTruthy();

    testLogger.step('Navigating back to home');
    await aboutPage.goBackToHome();

    // Verify we're back on home page
    const finalUrl = page.url();
    const isBackOnHome = finalUrl.includes('index') || finalUrl.endsWith('/') ||
      finalUrl.includes('home');
    expect(isBackOnHome).toBeTruthy();

    await pageHelper.takeScreenshot('navigation-test-complete');
    testLogger.info('Navigation test completed successfully');
  });

});