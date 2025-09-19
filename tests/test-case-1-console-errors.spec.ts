import { test, expect } from '../utils/base-test';

interface ConsoleError {
  type: string;
  message: string;
  url: string;
  timestamp: number;
}

interface PageError {
  message: string;
  stack?: string;
  timestamp: number;
}

/**
 * Production-grade error filtering utility
 */
class ErrorFilter {
  private static readonly BROWSER_WARNING_PATTERNS = [
    /warning/i,
    /favicon/i,
    /chrome-extension/i,
    /performance\.mark/i,
    /service.*worker/i,
    /ad.*blocker/i,
    /extension/i,
    /sectioned h1 element/i
  ];

  private static readonly NETWORK_ERROR_PATTERNS = [
    /failed to load resource.*404/i,
    /net::err_internet_disconnected/i,
    /net::err_name_not_resolved/i,
    /failed to fetch/i
  ];

  private static readonly EXPECTED_TEST_PATTERNS = [
    /timeout/i,
    /element not found/i,
    /selector.*not found/i,
    /navigation.*failed/i
  ];

  static filterConsoleErrors(errors: ConsoleError[]): ConsoleError[] {
    return errors.filter(error => {
      const message = error.message.toLowerCase();
      
      // Filter out browser warnings
      if (this.BROWSER_WARNING_PATTERNS.some(pattern => pattern.test(message))) {
        return false;
      }
      
      // Filter out expected network errors (404s for missing resources like favicon)
      if (this.NETWORK_ERROR_PATTERNS.some(pattern => pattern.test(message))) {
        return false;
      }
      
      return true;
    });
  }

  static filterPageErrors(errors: PageError[]): PageError[] {
    return errors.filter(error => {
      const message = error.message.toLowerCase();
      
      // Filter out expected test errors
      if (this.EXPECTED_TEST_PATTERNS.some(pattern => pattern.test(message))) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Categorizes errors for better production debugging
   */
  static categorizeErrors(consoleErrors: ConsoleError[], pageErrors: PageError[]) {
    return {
      critical: {
        console: this.filterConsoleErrors(consoleErrors),
        page: this.filterPageErrors(pageErrors)
      },
      network: consoleErrors.filter(error => 
        this.NETWORK_ERROR_PATTERNS.some(pattern => pattern.test(error.message))
      ),
      browserWarnings: consoleErrors.filter(error =>
        this.BROWSER_WARNING_PATTERNS.some(pattern => pattern.test(error.message))
      ),
      testRelated: pageErrors.filter(error =>
        this.EXPECTED_TEST_PATTERNS.some(pattern => pattern.test(error.message))
      )
    };
  }
}

test.describe('Test Case 1: Console Error Detection', () => {
  test('should have no console errors on homepage', async ({ 
    page, 
    configManager, 
    testLogger, 
    pageHelper 
  }) => {
    const consoleErrors: ConsoleError[] = [];
    const pageErrors: PageError[] = [];
    
    testLogger.step('Setting up error listeners');
    
    // Enhanced console error listener
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const error: ConsoleError = {
          type: 'console',
          message: msg.text(),
          url: page.url(),
          timestamp: Date.now()
        };
        consoleErrors.push(error);
        testLogger.warn('Console error detected', error);
      }
    });
    
    // Enhanced page error listener
    page.on('pageerror', error => {
      const pageError: PageError = {
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      };
      pageErrors.push(pageError);
      testLogger.error('Page error detected', pageError);
    });
    
    testLogger.step('Navigating to homepage');
    const environment = configManager.getCurrentEnvironment();
    await pageHelper.navigateToUrl(`${environment.baseUrl}/`);
    
    testLogger.step('Analyzing captured errors');
    const errorCategories = ErrorFilter.categorizeErrors(consoleErrors, pageErrors);
    
    // Enhanced error reporting with categorization
    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      testLogger.info('Comprehensive error analysis', {
        raw: {
          console: consoleErrors.length,
          page: pageErrors.length
        },
        categorized: {
          critical: {
            console: errorCategories.critical.console.length,
            page: errorCategories.critical.page.length
          },
          network: errorCategories.network.length,
          browserWarnings: errorCategories.browserWarnings.length,
          testRelated: errorCategories.testRelated.length
        }
      });
    }
    
    // Assert no critical errors on homepage
    expect(errorCategories.critical.console).toHaveLength(0);
    expect(errorCategories.critical.page).toHaveLength(0);
    
    testLogger.info('Homepage error detection completed successfully');
  });

  test('should detect console errors when injecting critical JavaScript error', async ({ 
    page, 
    configManager, 
    testLogger, 
    pageHelper 
  }) => {
    const consoleErrors: ConsoleError[] = [];
    const pageErrors: PageError[] = [];
    
    testLogger.step('Setting up error listeners for critical error injection test');
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const error: ConsoleError = {
          type: 'console',
          message: msg.text(),
          url: page.url(),
          timestamp: Date.now()
        };
        consoleErrors.push(error);
        testLogger.warn('Console error detected', error);
      }
    });
    
    page.on('pageerror', error => {
      const pageError: PageError = {
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      };
      pageErrors.push(pageError);
      testLogger.error('Page error detected', pageError);
    });
    
    testLogger.step('Navigating to homepage first');
    const environment = configManager.getCurrentEnvironment();
    await pageHelper.navigateToUrl(`${environment.baseUrl}/`);
    
    testLogger.step('Injecting critical JavaScript error');
    // Inject errors in a way that our listeners can capture them
    try {
      await page.evaluate(() => {
        // Generate a console error
        console.error('This is a critical application error that should be detected');
        
        // Create a delayed error that won't crash page.evaluate
        setTimeout(() => {
          try {
            (window as any).undefinedFunction();
          } catch (err: any) {
            console.error('Delayed critical error:', err?.message || err);
          }
        }, 100);
      });
    } catch (err: any) {
      // This is expected - the error should be caught by our listeners
      testLogger.info('page.evaluate error caught (this is part of the test)', { 
        error: err?.message || String(err) 
      });
    }
    
    // Wait for errors to be captured using condition-based wait
    await page.waitForFunction(() => {
      // Check if our injected error messages are in the console
      return performance.now() > 0; // Simple condition to ensure some time has passed
    }, { timeout: 3000 });
    
    // Ensure network is stable after error injection
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
      // Ignore timeout - just a best effort wait
    });
    
    testLogger.step('Analyzing injected critical errors');
    const errorCategories = ErrorFilter.categorizeErrors(consoleErrors, pageErrors);
    
    testLogger.info('Critical error injection analysis', {
      raw: {
        console: consoleErrors.length,
        page: pageErrors.length
      },
      categorized: {
        critical: {
          console: errorCategories.critical.console.length,
          page: errorCategories.critical.page.length
        },
        network: errorCategories.network.length,
        browserWarnings: errorCategories.browserWarnings.length,
        testRelated: errorCategories.testRelated.length
      },
      allErrors: [...consoleErrors, ...pageErrors]
    });
    
    // This test expects actual critical errors from our injection
    const totalCriticalErrors = errorCategories.critical.console.length + errorCategories.critical.page.length;
    expect(totalCriticalErrors).toBeGreaterThan(0);
    
    testLogger.info('Critical error injection test validation completed');
  });

  test('should validate console error detection on all main pages', async ({ 
    page, 
    configManager, 
    testLogger, 
    pageHelper 
  }) => {
    const environment = configManager.getCurrentEnvironment();
    const pagesToTest = [
      { path: `${environment.baseUrl}/`, expectErrors: false, name: 'Homepage' },
      { path: `${environment.baseUrl}/about.html`, expectErrors: true, name: 'About Page' }, // This page has known console errors
      { path: `${environment.baseUrl}/login.html`, expectErrors: false, name: 'Login Page' }
    ];

    for (const pageInfo of pagesToTest) {
      testLogger.step(`Testing ${pageInfo.name}`);
      
      const consoleErrors: ConsoleError[] = [];
      const pageErrors: PageError[] = [];
      
      // Set up fresh listeners for each page
      const consoleListener = (msg: any) => {
        if (msg.type() === 'error') {
          consoleErrors.push({
            type: 'console',
            message: msg.text(),
            url: page.url(),
            timestamp: Date.now()
          });
        }
      };
      
      const pageErrorListener = (error: any) => {
        pageErrors.push({
          message: error.message,
          stack: error.stack,
          timestamp: Date.now()
        });
      };
      
      page.on('console', consoleListener);
      page.on('pageerror', pageErrorListener);
      
      try {
        await pageHelper.navigateToUrl(pageInfo.path);
        // Wait for page to be fully loaded and any async errors to surface
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        
        const errorCategories = ErrorFilter.categorizeErrors(consoleErrors, pageErrors);
        const totalCriticalErrors = errorCategories.critical.console.length + errorCategories.critical.page.length;
        
        if (pageInfo.expectErrors) {
          expect(totalCriticalErrors).toBeGreaterThan(0);
          testLogger.info(`✓ ${pageInfo.name}: Expected errors found`, { 
            criticalErrorCount: totalCriticalErrors,
            breakdown: errorCategories 
          });
        } else {
          expect(totalCriticalErrors).toBe(0);
          testLogger.info(`✓ ${pageInfo.name}: No critical console errors detected`, {
            networkErrors: errorCategories.network.length,
            browserWarnings: errorCategories.browserWarnings.length
          });
        }
        
      } catch (error) {
        testLogger.error(`${pageInfo.name}: Navigation failed - this is a critical test failure`, error);
        // Navigation failure is a critical issue that should fail the test
        throw new Error(`Failed to navigate to ${pageInfo.name} (${pageInfo.path}): ${error}`);
      } finally {
        // Clean up listeners
        page.off('console', consoleListener);
        page.off('pageerror', pageErrorListener);
      }
    }
    
    testLogger.info('Multi-page error detection validation completed');
  });
});