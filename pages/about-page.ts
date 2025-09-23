import { Page } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * AboutPage - Simple and focused on core functionality
 */
export class AboutPage extends BasePage {
  // Simple, clear selectors
  private readonly selectors = {
    pageHeading: 'h1',
    mainContent: 'main, .content, .main-content',
    navigation: 'nav',
    backLink: 'a[href*="index"], a:has-text("Home"), a:has-text("Back")'
  };

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  /**
   * Navigate to about page
   */
  async navigate(): Promise<void> {
    await super.navigate('/about.html');
  }

  /**
   * Get the page heading
   */
  async getPageHeading(): Promise<string> {
    return await this.getText(this.selectors.pageHeading);
  }

  /**
   * Get main content text
   */
  async getMainContent(): Promise<string> {
    return await this.getText(this.selectors.mainContent);
  }

  /**
   * Navigate back to home page
   */
  async goBackToHome(): Promise<void> {
    await this.click(this.selectors.backLink);
  }

  /**
   * Check if page has essential elements
   */
  async hasEssentialElements(): Promise<boolean> {
    const hasHeading = await this.isVisible(this.selectors.pageHeading);
    const hasMainContent = await this.isVisible(this.selectors.mainContent);
    
    return hasHeading && hasMainContent;
  }

  /**
   * Check if navigation is present
   */
  async hasNavigation(): Promise<boolean> {
    return await this.isVisible(this.selectors.navigation);
  }
}