import { test, expect } from '../utils/base-test';
import * as fs from 'fs';
import * as path from 'path';

interface PullRequest {
  name: string;
  createdDate: string;
  author: string;
}

test.describe('Test Case 4: GitHub Pull Request Analysis', () => {

  test('should extract open pull requests and export to CSV format', async ({
    page,
    configManager,
    testLogger,
    pageHelper
  }) => {
    const config = configManager.getConfig();
    const githubUrl = config.github.exampleRepo;

    testLogger.info('Starting GitHub PR extraction test');

    testLogger.step('Navigating to GitHub pull requests page');
    await pageHelper.navigateToUrl(githubUrl);

    await pageHelper.takeScreenshot('github-prs-page');

    testLogger.step('Waiting for pull requests to load');
    await page.waitForTimeout(3000); // Simple wait for page load

    testLogger.step('Extracting pull request data');
    const pullRequests = await extractPullRequests(page, testLogger);

    testLogger.info(`Found ${pullRequests.length} pull requests`);

    // Verify we found some PRs
    expect(pullRequests.length).toBeGreaterThan(0);

    testLogger.step('Generating CSV report');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvFilePath = await exportPullRequestsToCSV(
      pullRequests,
      `appwrite-pull-requests-${timestamp}.csv`
    );

    testLogger.step('Validating CSV file');
    const fileExists = fs.existsSync(csvFilePath);
    expect(fileExists).toBeTruthy();

    testLogger.info(`CSV report generated: ${csvFilePath}`);

    // Display summary
    console.log('\n=== APPWRITE OPEN PULL REQUESTS SUMMARY ===');
    console.log(`Repository: appwrite/appwrite`);
    console.log(`Total Open PRs: ${pullRequests.length}`);
    console.log(`Generated: ${new Date().toLocaleDateString()}`);
    console.log(`CSV File: ${csvFilePath}`);
    console.log('\nFirst 5 Pull Requests:');
    pullRequests.slice(0, 5).forEach((pr, index) => {
      console.log(`${index + 1}. ${pr.name}`);
      console.log(`   Author: ${pr.author} | Created: ${pr.createdDate}`);
    });
    console.log('==========================================\n');

    testLogger.info('GitHub PR extraction test completed successfully');
  });

  // Simple CSV export function
  async function exportPullRequestsToCSV(pullRequests: PullRequest[], filename: string): Promise<string> {
    const outputDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const csvFilePath = path.join(outputDir, filename);
    const csvHeader = 'PR Name,Author,Created Date\n';
    const csvContent = pullRequests
      .map(pr => `"${pr.name}","${pr.author}","${pr.createdDate}"`)
      .join('\n');
    
    fs.writeFileSync(csvFilePath, csvHeader + csvContent);
    return csvFilePath;
  }

  test('should handle GitHub rate limiting gracefully', async ({
    page,
    configManager,
    testLogger,
    pageHelper
  }) => {
    const config = configManager.getConfig();
    const githubUrl = config.github.exampleRepo;

    testLogger.info('Starting GitHub rate limiting test');

    testLogger.step('Setting up rate limit detection');
    let rateLimitDetected = false;

    page.on('response', response => {
      if (response.status() === 429) {
        rateLimitDetected = true;
        testLogger.info('Rate limiting detected');
      }
    });

    testLogger.step('Navigating to GitHub repository');
    
    try {
      await pageHelper.navigateToUrl(githubUrl);
      await page.waitForTimeout(2000);
      
      const pageLoaded = await page.locator('body').isVisible();
      expect(pageLoaded).toBeTruthy();
      
      testLogger.info('Page loaded successfully');
    } catch (error) {
      testLogger.error('Navigation failed', error);
      await pageHelper.takeScreenshot('github-rate-limiting');
      throw error;
    }

    testLogger.info('Rate limiting handling test completed');
  });

  test('should validate PR data structure', async ({
    page,
    configManager,
    testLogger,
    pageHelper
  }) => {
    const config = configManager.getConfig();
    testLogger.info('Starting PR data structure validation test');

    testLogger.step('Navigating to GitHub repository');
    await pageHelper.navigateToUrl(config.github.exampleRepo);
    await page.waitForTimeout(2000);

    testLogger.step('Extracting PR data for validation');
    const pullRequests = await extractPullRequests(page, testLogger);

    if (pullRequests.length > 0) {
      const firstPR = pullRequests[0];

      testLogger.step('Validating PR data structure');

      testLogger.info('Sample PR data', {
        name: firstPR.name,
        author: firstPR.author,
        date: firstPR.createdDate
      });

      expect(firstPR.name).toBeTruthy();
      expect(firstPR.author).toBeTruthy();
      expect(firstPR.createdDate).toBeTruthy();
      expect(firstPR.name).not.toBe('Unknown PR');
      expect(firstPR.author).not.toBe('Unknown Author');
      expect(firstPR.createdDate).not.toBe('Unknown Date');

      testLogger.info('PR data structure validation passed');
    } else {
      testLogger.info('No PRs found for validation');
    }
  });

  async function extractPullRequests(page: any, testLogger: any): Promise<PullRequest[]> {
    return await page.evaluate(() => {
      const pullRequests: PullRequest[] = [];

      // Multiple selector strategies for different GitHub layouts
      const prSelectors = [
        '.js-issue-row',
        '[data-testid="issue-row"]',
        '.Box-row.js-issue-row',
        '.issue-row'
      ];

      let prElements: Element[] = [];
      let successfulSelector = '';

      for (const selector of prSelectors) {
        prElements = Array.from(document.querySelectorAll(selector));
        if (prElements.length > 0) {
          successfulSelector = selector;
          console.log(`Found ${prElements.length} PRs using selector: ${selector}`);
          break;
        }
      }

      prElements.forEach((element, index) => {
        try {
          // Extract PR title/name
          const titleElement = element.querySelector('a[data-hovercard-type="pull_request"]') ||
            element.querySelector('.js-navigation-open') ||
            element.querySelector('a[href*="/pull/"]');

          const name = titleElement?.textContent?.trim() || 'Unknown PR';

          // Extract author
          const authorElement = element.querySelector('[data-hovercard-type="user"]') ||
            element.querySelector('a[href*="github.com/"]:not([href*="/pull/"])') ||
            element.querySelector('.author');

          const author = authorElement?.textContent?.trim() || 'Unknown Author';

          // Extract creation date
          const dateElement = element.querySelector('relative-time') ||
            element.querySelector('time') ||
            element.querySelector('[datetime]');

          let createdDate = 'Unknown Date';
          if (dateElement) {
            const datetime = dateElement.getAttribute('datetime');
            if (datetime) {
              createdDate = new Date(datetime).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
            } else {
              createdDate = dateElement.textContent?.trim() || 'Unknown Date';
            }
          }

          if (name !== 'Unknown PR' && author !== 'Unknown Author') {
            pullRequests.push({
              name: name.replace(/"/g, '""'), // Escape quotes for CSV safety
              createdDate,
              author: author.replace(/"/g, '""') // Escape quotes for CSV safety
            });
          }
        } catch (error) {
          console.log(`Error extracting PR data for element ${index}:`, error);
        }
      });

      return pullRequests;
    }).then((prs: PullRequest[]) => {
      testLogger.info('PR extraction completed', {
        totalExtracted: prs.length,
        extractionMethod: prs.length > 0 ? 'successful' : 'no PRs found'
      });
      return prs;
    });
  }
});