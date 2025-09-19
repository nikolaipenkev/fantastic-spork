import { test, expect } from '../utils/base-test';
import { Page } from '@playwright/test';

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
    pageHelper,
    networkHelper 
  }) => {
    const environment = configManager.getCurrentEnvironment();
    testLogger.info('Starting link validation test', {
      environment: environment.name,
      baseUrl: environment.baseUrl
    });

    testLogger.step('Navigating to homepage');
    await pageHelper.navigateToUrl(`${environment.baseUrl}/`);

    testLogger.step('Extracting all links from page');
    const links = await extractAllLinks(page);
    testLogger.info(`Found ${links.length} links to test`, { linkCount: links.length });

    const testResults: LinkTestResult[] = [];

    testLogger.step('Testing individual links');
    for (const link of links) {
      try {
        testLogger.info(`Testing link: ${link.url}`, { 
          text: link.text, 
          isInternal: link.isInternal 
        });
        
        const response = await page.request.get(link.url);
        const status = response.status();
        
        const isValid = isValidStatusCode(status);
        
        testResults.push({
          url: link.url,
          text: link.text,
          status,
          isValid
        });

        if (isValid) {
          testLogger.info(`Link validation passed`, { status, url: link.url });
        } else {
          testLogger.warn(`Link validation failed`, { status, url: link.url });
        }
        
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error';
        testResults.push({
          url: link.url,
          text: link.text,
          status: 0,
          isValid: false,
          error: errorMessage
        });
        
        testLogger.error(`Link test error`, { url: link.url, error: errorMessage });
      }
    }

    testLogger.step('Generating detailed link report');
    generateLinkReport(testResults, testLogger);

    // Assert that all links return valid status codes
    const invalidLinks = testResults.filter(result => !result.isValid);
    
    if (invalidLinks.length > 0) {
      testLogger.error('Invalid links found', { 
        count: invalidLinks.length, 
        invalidLinks: invalidLinks.map(l => ({ url: l.url, status: l.status, error: l.error }))
      });
      
      await pageHelper.takeScreenshot('invalid-links-detected');
    }

    expect(invalidLinks).toHaveLength(0);
    testLogger.info('Link validation test completed successfully');
  });

  test('should categorize status codes correctly', async ({ 
    page, 
    configManager, 
    testLogger, 
    pageHelper 
  }) => {
    const environment = configManager.getCurrentEnvironment();
    testLogger.step('Navigating to homepage for status code categorization');
    await pageHelper.navigateToUrl(`${environment.baseUrl}/`);

    testLogger.step('Extracting links for categorization analysis');
    const links = await extractAllLinks(page);
    const statusCodes = {
      success: [] as LinkTestResult[],    // 2xx
      redirect: [] as LinkTestResult[],   // 3xx
      clientError: [] as LinkTestResult[], // 4xx
      serverError: [] as LinkTestResult[], // 5xx
      unknown: [] as LinkTestResult[]     // Others
    };

    testLogger.step('Categorizing status codes for each link');
    for (const link of links) {
      try {
        const response = await page.request.get(link.url);
        const status = response.status();
        
        const result: LinkTestResult = {
          url: link.url,
          text: link.text,
          status,
          isValid: isValidStatusCode(status)
        };

        if (status >= 200 && status < 300) {
          statusCodes.success.push(result);
        } else if (status >= 300 && status < 400) {
          statusCodes.redirect.push(result);
        } else if (status >= 400 && status < 500) {
          statusCodes.clientError.push(result);
        } else if (status >= 500 && status < 600) {
          statusCodes.serverError.push(result);
        } else {
          statusCodes.unknown.push(result);
        }
        
      } catch (error: any) {
        statusCodes.unknown.push({
          url: link.url,
          text: link.text,
          status: 0,
          isValid: false,
          error: error?.message || 'Unknown error'
        });
      }
    }

    testLogger.step('Analyzing status code categorization results');
    const categorization = {
      success: statusCodes.success.length,
      redirect: statusCodes.redirect.length,
      clientError: statusCodes.clientError.length,
      serverError: statusCodes.serverError.length,
      unknown: statusCodes.unknown.length
    };

    testLogger.info('Status Code Categorization Results', categorization);

    // Assert no 4xx errors (as per requirements)
    if (statusCodes.clientError.length > 0) {
      testLogger.error('Client errors (4xx) detected', { 
        errors: statusCodes.clientError.map(e => ({ url: e.url, status: e.status }))
      });
      await pageHelper.takeScreenshot('client-errors-detected');
    }
    expect(statusCodes.clientError).toHaveLength(0);
    
    // Assert no 5xx errors (good practice)
    if (statusCodes.serverError.length > 0) {
      testLogger.error('Server errors (5xx) detected', { 
        errors: statusCodes.serverError.map(e => ({ url: e.url, status: e.status }))
      });
      await pageHelper.takeScreenshot('server-errors-detected');
    }
    expect(statusCodes.serverError).toHaveLength(0);

    testLogger.info('Status code categorization test completed successfully');
  });

  async function extractAllLinks(page: Page): Promise<LinkInfo[]> {
    return await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const baseUrl = window.location.origin;
      
      return links.map(link => {
        const href = (link as HTMLAnchorElement).href;
        const text = link.textContent?.trim() || '';
        const isInternal = href.startsWith(baseUrl) || href.startsWith('/') || !href.includes('://');
        
        return {
          url: href,
          text: text,
          isInternal: isInternal
        };
      }).filter(link => {
        // Filter out javascript:, mailto:, tel: links
        return !link.url.startsWith('javascript:') && 
               !link.url.startsWith('mailto:') && 
               !link.url.startsWith('tel:') &&
               link.url.length > 0;
      });
    });
  }

  function isValidStatusCode(status: number): boolean {
    // Valid status codes: 200-299 (success) and 300-399 (redirect)
    // Invalid status codes: 400-499 (client error)
    return (status >= 200 && status < 400);
  }

  function generateLinkReport(results: LinkTestResult[], testLogger: any): void {
    const validLinks = results.filter(r => r.isValid);
    const invalidLinks = results.filter(r => !r.isValid);
    
    const report = {
      totalLinks: results.length,
      validLinks: validLinks.length,
      invalidLinks: invalidLinks.length,
      validLinkDetails: validLinks.map(l => ({ status: l.status, url: l.url, text: l.text })),
      invalidLinkDetails: invalidLinks.map(l => ({ 
        status: l.status, 
        url: l.url, 
        text: l.text, 
        error: l.error 
      }))
    };

    testLogger.info('Comprehensive Link Validation Report', report);
    
    if (invalidLinks.length > 0) {
      testLogger.warn('Invalid links requiring attention', {
        count: invalidLinks.length,
        details: invalidLinks.map(link => `[${link.status}] ${link.url} ${link.error ? `(${link.error})` : ''}`)
      });
    }
  }
});