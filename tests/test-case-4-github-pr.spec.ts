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
    pageHelper,
    networkHelper
  }) => {
    const config = configManager.getConfig();
    const githubUrl = config.github.exampleRepo;

    testLogger.info('Starting GitHub PR extraction test', {
      repository: 'appwrite/appwrite',
      url: githubUrl,
      testObjective: 'Extract open PRs and export to CSV with PR name, created date, and author'
    });

    testLogger.step('Navigating to GitHub pull requests page');
    // Add retry logic for GitHub navigation with exponential backoff
    let navSuccess = false;
    let attempt = 0;
    const maxAttempts = 3;

    while (!navSuccess && attempt < maxAttempts) {
      try {
        await pageHelper.navigateToUrl(githubUrl);
        navSuccess = true;
      } catch (error) {
        attempt++;
        if (attempt < maxAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          testLogger.warn(`Navigation attempt ${attempt} failed, retrying in ${delay}ms`, { error });
          await page.waitForTimeout(delay);
        } else {
          throw error;
        }
      }
    }

    // Take screenshot of the page
    await pageHelper.takeScreenshot('github-prs-page');

    testLogger.step('Waiting for pull requests to load');
    // Use more robust waiting with multiple fallback selectors
    await Promise.race([
      page.waitForSelector('.js-issue-row', { timeout: 15000 }),
      page.waitForSelector('[data-testid="issue-row"]', { timeout: 15000 }),
      page.waitForSelector('.Box-row', { timeout: 15000 }),
      page.waitForLoadState('networkidle', { timeout: 15000 })
    ]).catch(() => {
      testLogger.warn('PR list selectors not found, attempting extraction anyway');
    });

    testLogger.step('Extracting pull request data');
    const pullRequests = await extractPullRequests(page, testLogger);

    testLogger.info(`Pull request extraction completed`, {
      foundPRs: pullRequests.length,
      repository: 'appwrite/appwrite'
    });

    // Verify we found some PRs
    expect(pullRequests.length).toBeGreaterThan(0);

    testLogger.step('Generating CSV report');
    const csvContent = generateCSV(pullRequests, testLogger);

    testLogger.step('Saving CSV file');
    const outputDir = 'test-outputs';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvFilePath = path.join(outputDir, `appwrite-pull-requests-${timestamp}.csv`);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(csvFilePath, csvContent);

    testLogger.info('CSV report generated successfully', {
      filePath: csvFilePath,
      totalPRs: pullRequests.length,
      fileSize: `${fs.statSync(csvFilePath).size} bytes`
    });

    // Display summary in console for product owner
    console.log('\n=== APPWRITE OPEN PULL REQUESTS SUMMARY ===');
    console.log(`Repository: appwrite/appwrite`);
    console.log(`Total Open PRs: ${pullRequests.length}`);
    console.log(`Generated: ${new Date().toLocaleDateString()}`);
    console.log(`CSV File: ${csvFilePath}`);
    console.log('\nFirst 10 Pull Requests:');
    pullRequests.slice(0, 10).forEach((pr, index) => {
      console.log(`${index + 1}. ${pr.name}`);
      console.log(`   Author: ${pr.author} | Created: ${pr.createdDate}`);
    });
    console.log('==========================================\n');

    // Validate CSV content structure
    expect(csvContent).toContain('PR Name,Created Date,Author');
    expect(csvContent.split('\n').length).toBeGreaterThan(1);

    testLogger.info('GitHub PR extraction test completed successfully');
  });

  test('should handle GitHub rate limiting gracefully', async ({
    page,
    configManager,
    testLogger,
    pageHelper,
    networkHelper
  }) => {
    const config = configManager.getConfig();
    const githubUrl = config.github.exampleRepo;

    testLogger.info('Starting GitHub rate limiting test', { repository: githubUrl });

    testLogger.step('Setting up network monitoring for rate limiting detection');
    let rateLimitDetected = false;

    page.on('response', response => {
      if (response.status() === 429) {
        rateLimitDetected = true;
        testLogger.warn('Rate limiting detected', {
          status: response.status(),
          url: response.url()
        });
      }
    });

    testLogger.step('Navigating to GitHub repository');
    // Use more robust navigation with multiple retry attempts
    let pageLoaded = false;
    let navAttempt = 0;
    const maxNavAttempts = 3;

    while (!pageLoaded && navAttempt < maxNavAttempts) {
      try {
        await pageHelper.navigateToUrl(githubUrl, { timeout: 20000 });
        pageLoaded = await page.waitForSelector('body', { timeout: 10000 })
          .then(() => true)
          .catch(() => false);

        if (pageLoaded) break;

      } catch (error) {
        navAttempt++;
        if (navAttempt < maxNavAttempts) {
          const delay = 2000 * navAttempt; // Progressive delay
          testLogger.warn(`Navigation attempt ${navAttempt} failed, retrying in ${delay}ms`);
          await page.waitForTimeout(delay);
        }
      }
    }

    testLogger.info('Rate limiting test results', {
      pageLoaded,
      rateLimitDetected,
      networkResponses: networkHelper.getResponses().length
    });

    if (!pageLoaded) {
      testLogger.warn('Page failed to load - possibly due to rate limiting or network issues');
      await pageHelper.takeScreenshot('github-rate-limiting');
    }

    expect(pageLoaded).toBeTruthy();
    testLogger.info('Rate limiting handling test completed successfully');
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

    testLogger.step('Extracting PR data for validation');
    const pullRequests = await extractPullRequests(page, testLogger);

    if (pullRequests.length > 0) {
      const firstPR = pullRequests[0];

      testLogger.step('Validating PR data structure requirements');

      // Validate required fields
      const validationResults = {
        hasName: !!firstPR.name && firstPR.name !== 'Unknown PR',
        hasAuthor: !!firstPR.author && firstPR.author !== 'Unknown Author',
        hasCreatedDate: !!firstPR.createdDate && firstPR.createdDate !== 'Unknown Date',
        nameNotEmpty: firstPR.name.length > 0,
        authorNotEmpty: firstPR.author.length > 0
      };

      testLogger.info('PR data structure validation results', {
        samplePR: {
          name: firstPR.name,
          author: firstPR.author,
          date: firstPR.createdDate
        },
        validationResults
      });

      expect(firstPR.name).toBeTruthy();
      expect(firstPR.author).toBeTruthy();
      expect(firstPR.createdDate).toBeTruthy();
      expect(firstPR.name).not.toBe('Unknown PR');
      expect(firstPR.author).not.toBe('Unknown Author');
      expect(firstPR.createdDate).not.toBe('Unknown Date');

      testLogger.info('PR data structure validation passed successfully');
    } else {
      testLogger.warn('No PRs found for validation - test may need investigation');
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

  function generateCSV(pullRequests: PullRequest[], testLogger: any): string {
    const headers = 'PR Name,Created Date,Author';
    const rows = pullRequests.map(pr =>
      `"${pr.name}","${pr.createdDate}","${pr.author}"`
    );

    const csvContent = [headers, ...rows].join('\n');

    testLogger.info('CSV generation completed', {
      totalRows: rows.length,
      totalSize: `${csvContent.length} characters`,
      includesHeaders: true
    });

    return csvContent;
  }
});