import { Page } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * HomePage - Simple and focused on core functionality
 */
export class HomePage extends BasePage {
  // Simple, clear selectors
  private readonly selectors = {
    mainHeading: 'h1',
    navigation: 'nav',
    loginLink: 'a[href*="account"], a[href*="login"]', // Account link serves as login entry point
    aboutLink: 'a[href*="about"]',
    logo: '.logo, #logo, img[alt*="logo"]',
    mainContent: 'main, .content, .main-content'
  };

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  /**
   * Navigate to home page
   */
  async navigate(): Promise<void> {
    await super.navigate('');
  }

  /**
   * Get the main heading text
   */
  async getMainHeading(): Promise<string> {
    return await this.getText(this.selectors.mainHeading);
  }

  /**
   * Navigate to login page via link
   */
  async goToLogin(): Promise<void> {
    await this.click(this.selectors.loginLink);
  }

  /**
   * Navigate to about page via link
   */
  async goToAbout(): Promise<void> {
    await this.click(this.selectors.aboutLink);
  }

  /**
   * Check if navigation is present
   */
  async hasNavigation(): Promise<boolean> {
    return await this.isVisible(this.selectors.navigation);
  }

  /**
   * Check if page has essential elements
   */
  async hasEssentialElements(): Promise<boolean> {
    const hasHeading = await this.isVisible(this.selectors.mainHeading);
    const hasNavigation = await this.isVisible(this.selectors.navigation);
    const hasMainContent = await this.isVisible(this.selectors.mainContent);
    
    return hasHeading && hasNavigation && hasMainContent;
  }

  /**
   * Get all available navigation links
   */
  async getNavigationLinks(): Promise<string[]> {
    const links = await this.page.locator(`${this.selectors.navigation} a`).all();
    const linkTexts: string[] = [];
    
    for (const link of links) {
      const text = await link.textContent();
      if (text?.trim()) {
        linkTexts.push(text.trim());
      }
    }
    
    return linkTexts;
  }
}