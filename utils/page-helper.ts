/**
 * Simple Page Helper - Production-ready, focused
 */
import { Page } from '@playwright/test';
import { TestLogger } from './test-logger';

export class PageHelper {
  constructor(private page: Page, private logger: TestLogger) {}

  /**
   * Navigate to URL
   */
  async navigateToUrl(url: string): Promise<void> {
    this.logger.step(`Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(name: string): Promise<void> {
    const filename = `${name}-${Date.now()}.png`;
    await this.page.screenshot({ path: `test-results/${filename}`, fullPage: true });
    this.logger.info(`Screenshot saved: ${filename}`);
  }
}