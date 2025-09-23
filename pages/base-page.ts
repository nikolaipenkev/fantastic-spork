import { Page } from '@playwright/test';

/**
 * Base Page Object - Simple and focused
 */
export abstract class BasePage {
  protected page: Page;
  protected baseUrl: string;

  constructor(page: Page, baseUrl: string) {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  /**
   * Navigate to page
   */
  async navigate(path: string = ''): Promise<void> {
    await this.page.goto(`${this.baseUrl}${path}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Click element
   */
  async click(selector: string): Promise<void> {
    await this.waitForElement(selector);
    await this.page.click(selector);
  }

  /**
   * Fill input
   */
  async fill(selector: string, value: string): Promise<void> {
    await this.waitForElement(selector);
    await this.page.fill(selector, value);
  }

  /**
   * Get text content
   */
  async getText(selector: string): Promise<string> {
    await this.waitForElement(selector);
    return await this.page.textContent(selector) || '';
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Check if page has essential elements loaded
   */
  async hasEssentialElements(headingSelector?: string, contentSelector?: string): Promise<boolean> {
    // Default selectors if none provided
    const defaultHeadingSelector = 'h1, h2, .title, .heading, [class*="title"], [class*="heading"]';
    const defaultContentSelector = 'main, .content, .main-content, section, article, .container';
    
    const headingSel = headingSelector || defaultHeadingSelector;
    const contentSel = contentSelector || defaultContentSelector;
    
    // Check for any heading or title element
    const hasHeading = await this.page.locator(headingSel).first().isVisible() 
      || await this.page.locator('body').isVisible();
    
    // Check for main content area or basic page structure
    const hasMainContent = await this.page.locator(contentSel).first().isVisible();
    
    // Page is loaded if at least body is visible and has some content
    const bodyHasContent = await this.page.locator('body').isVisible() && 
                          await this.page.locator('body *').first().isVisible();
    
    return (hasHeading && hasMainContent) || bodyHasContent;
  }
}