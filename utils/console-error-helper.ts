export interface ConsoleError {
  type: string;
  message: string;
  url: string;
  timestamp: number;
}

export class ConsoleErrorHelper {
  
  // Browser warnings that should be filtered out
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

  /**
   * Set up error listeners for a page
   */
  static setupErrorListeners(page: any): ConsoleError[] {
    const errors: ConsoleError[] = [];

    // Console error listener
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        errors.push({
          type: msg.type(),
          message: msg.text(),
          url: page.url(),
          timestamp: Date.now()
        });
      }
    });

    // Page error listener
    page.on('pageerror', (error: any) => {
      errors.push({
        type: 'pageerror',
        message: error.message,
        url: page.url(),
        timestamp: Date.now()
      });
    });

    return errors;
  }

  /**
   * Filter out browser warnings and non-critical errors
   */
  static filterConsoleErrors(errors: ConsoleError[]): ConsoleError[] {
    return errors.filter(error => {
      const message = error.message.toLowerCase();

      // Filter out browser warnings
      if (this.BROWSER_WARNING_PATTERNS.some(pattern => pattern.test(message))) {
        return false;
      }

      return true;
    });
  }

  /**
   * Analyze error patterns for Test Case 1 requirements
   */
  static analyzeErrors(errors: ConsoleError[]): {
    total: number;
    filtered: number;
    critical: ConsoleError[];
    warnings: ConsoleError[];
    byPage: Map<string, number>;
  } {
    const filtered = this.filterConsoleErrors(errors);
    const critical = filtered.filter(e => e.type === 'pageerror' || e.message.includes('error'));
    const warnings = filtered.filter(e => !critical.includes(e));
    
    // Group by page URL
    const byPage = new Map<string, number>();
    filtered.forEach(error => {
      const url = error.url;
      byPage.set(url, (byPage.get(url) || 0) + 1);
    });

    return {
      total: errors.length,
      filtered: filtered.length,
      critical,
      warnings,
      byPage
    };
  }

  /**
   * Generate error report for logging
   */
  static generateErrorReport(analysis: ReturnType<typeof ConsoleErrorHelper.analyzeErrors>): string {
    const report = [
      `Console Error Analysis:`,
      `- Total errors detected: ${analysis.total}`,
      `- After filtering: ${analysis.filtered}`,
      `- Critical errors: ${analysis.critical.length}`,
      `- Warnings: ${analysis.warnings.length}`,
      ``
    ];

    if (analysis.critical.length > 0) {
      report.push(`Critical Errors:`);
      analysis.critical.forEach((error, index) => {
        report.push(`  ${index + 1}. ${error.message}`);
      });
      report.push(``);
    }

    if (analysis.byPage.size > 0) {
      report.push(`Errors by Page:`);
      analysis.byPage.forEach((count, url) => {
        report.push(`  ${url}: ${count} errors`);
      });
    }

    return report.join('\n');
  }

  /**
   * Wait for async errors to surface (Test Case 1 pattern)
   */
  static async waitForAsyncErrors(page: any, timeout: number = 2000): Promise<void> {
    await page.waitForTimeout(timeout);
    
    // Also wait for any pending network requests to complete
    try {
      await page.waitForLoadState('networkidle', { timeout: 3000 });
    } catch {
      // Ignore timeout - this is just best effort
    }
  }
}