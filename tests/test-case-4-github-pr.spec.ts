import { test, expect } from '../utils/base-test';
import * as fs from 'fs';
import * as path from 'path';

interface PullRequest {
  name: string;
  createdDate: string;
  author: string;
  url: string;
  number: string;
}

test.describe('Test Case 4: GitHub Pull Request Analysis', () => {
  
  test('should extract and export GitHub pull requests to CSV', async ({ 
    page, 
    configManager, 
    testLogger, 
    pageHelper,
    networkHelper 
  }) => {
    const config = configManager.getConfig();
    const githubUrl = config.github.exampleRepo;
    
    testLogger.info('Starting GitHub PR extraction test', { 
      repository: githubUrl,
      testObjective: 'Extract and export pull requests to CSV'
    });

    testLogger.step('Navigating to GitHub repository');
    await pageHelper.navigateToUrl(githubUrl);

    testLogger.step('Waiting for GitHub PR interface to load');
    const prListFound = await page.waitForSelector('[data-testid="pr-list"]', { timeout: 10000 })
      .then(() => true)
      .catch(() => {
        testLogger.warn('PR list not found with data-testid, will try alternative selectors');
        return false;
      });

    testLogger.step('Extracting pull request data');
    const pullRequests = await extractPullRequests(page, testLogger);
    
    testLogger.info(`Pull request extraction completed`, { 
      foundPRs: pullRequests.length,
      prListInterfaceFound: prListFound
    });

    // Verify we found some PRs
    expect(pullRequests.length).toBeGreaterThan(0);

    testLogger.step('Generating CSV report');
    const csvContent = generateCSV(pullRequests, testLogger);
    
    testLogger.step('Saving CSV file');
    const outputDir = 'test-results';
    const csvFilePath = path.join(outputDir, 'github-pull-requests.csv');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(csvFilePath, csvContent);
    
    testLogger.info('CSV report generated successfully', {
      filePath: csvFilePath,
      totalPRs: pullRequests.length,
      previewPRs: pullRequests.slice(0, 3).map(pr => ({
        name: pr.name,
        author: pr.author,
        date: pr.createdDate
      }))
    });

    // Validate CSV content
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
    await pageHelper.navigateToUrl(githubUrl, { timeout: 15000 });
    
    // Should either load successfully or handle rate limiting
    const pageLoaded = await page.waitForSelector('body', { timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    
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
        hasName: !!firstPR.name,
        hasAuthor: !!firstPR.author,
        hasCreatedDate: !!firstPR.createdDate,
        hasUrl: !!firstPR.url,
        hasNumber: !!firstPR.number,
        urlFormatValid: /^https:\/\/github\.com\/.+\/pull\/\d+$/.test(firstPR.url),
        numberFormatValid: /^\d+$/.test(firstPR.number)
      };

      testLogger.info('PR data structure validation results', {
        samplePR: {
          name: firstPR.name,
          author: firstPR.author,
          date: firstPR.createdDate,
          url: firstPR.url,
          number: firstPR.number
        },
        validationResults
      });

      expect(firstPR.name).toBeTruthy();
      expect(firstPR.author).toBeTruthy();
      expect(firstPR.createdDate).toBeTruthy();
      expect(firstPR.url).toBeTruthy();
      expect(firstPR.number).toBeTruthy();

      // Validate data formats
      expect(firstPR.url).toMatch(/^https:\/\/github\.com\/.+\/pull\/\d+$/);
      expect(firstPR.number).toMatch(/^\d+$/);
      
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
        '[data-testid="pr-list"] .js-issue-row',
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
          const url = titleElement ? (titleElement as HTMLAnchorElement).href : '';
          
          // Extract PR number from URL
          const numberMatch = url.match(/\/pull\/(\d+)/);
          const number = numberMatch ? numberMatch[1] : '';

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
              createdDate = new Date(datetime).toISOString().split('T')[0]; // YYYY-MM-DD format
            } else {
              createdDate = dateElement.textContent?.trim() || 'Unknown Date';
            }
          }

          if (name && author && url) {
            pullRequests.push({
              name: name.replace(/,/g, ';'), // Replace commas for CSV safety
              createdDate,
              author: author.replace(/,/g, ';'),
              url,
              number
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
    const headers = 'PR Name,Created Date,Author,URL,PR Number';
    const rows = pullRequests.map(pr => 
      `"${pr.name}","${pr.createdDate}","${pr.author}","${pr.url}","${pr.number}"`
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