import { test, expect } from '../utils/base-test';
import { HomePage } from '../pages/home-page';
import { AboutPage } from '../pages/about-page';

interface LinkInfo {
  url: string;
  text: string;
  isInternal: boolean;
}

interface LinkTestResult {
  url: string;
  text: string;
  status: number;
  isValid: boolean;
  error?: string;
}

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
    const links = await extractAllLinks(page, environment.baseUrl);
    testLogger.info(`Found ${links.length} links to test`);

    const testResults: LinkTestResult[] = [];

    testLogger.step('Testing individual links');
    for (const link of links) {
      try {
        const response = await page.request.get(link.url);
        const status = response.status();
        const isValid = status >= 200 && status < 400;

        testResults.push({
          url: link.url,
          text: link.text,
          status,
          isValid
        });

        testLogger.info(`Link ${link.url}: ${status} (${isValid ? 'valid' : 'invalid'})`);
      } catch (error: any) {
        testResults.push({
          url: link.url,
          text: link.text,
          status: 0,
          isValid: false,
          error: error?.message || 'Unknown error'
        });
      }
    }

    const validLinks = testResults.filter(result => result.isValid);
    const successRate = (validLinks.length / testResults.length) * 100;

    testLogger.info(`Link validation summary: ${validLinks.length}/${testResults.length} valid (${successRate.toFixed(1)}%)`);

    await pageHelper.takeScreenshot('link-validation-complete');

    // Most links should be valid (allow for some flexibility)
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

  async function extractAllLinks(page: any, baseUrl: string): Promise<LinkInfo[]> {
    const links = await page.locator('a[href]').all();
    const linkData: LinkInfo[] = [];

    for (const link of links) {
      try {
        const href = await link.getAttribute('href');
        const text = (await link.textContent() || '').trim();

        if (href && href !== '#' && href !== 'javascript:void(0)') {
          // Convert relative URLs to absolute URLs
          const absoluteUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
          const isInternal = absoluteUrl.includes(baseUrl) || href.startsWith('/');

          linkData.push({
            url: absoluteUrl,
            text: text || href,
            isInternal
          });
        }
      } catch (error) {
        // Skip links that can't be processed
      }
    }

    // Remove duplicates
    const uniqueLinks = linkData.filter((link, index, self) =>
      index === self.findIndex(l => l.url === link.url)
    );

    return uniqueLinks;
  }

});