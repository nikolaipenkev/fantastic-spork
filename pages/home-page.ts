import { Page } from '@playwright/test';
import { BasePage } from './base-page';

export class HomePage extends BasePage {
  private readonly selectors = {
    mainHeading: 'h1, h2, .title, .heading, [class*="title"], [class*="heading"]',
    navigation: 'nav, .nav, .navbar, .menu, header a, .navigation',
    accountLink: 'a[href*="account"], a[href*="login"], .account-link, .login-link',
    aboutLink: 'a[href*="about"], .about-link',
    mainContent: 'main, .main, .content, .container, section, article'
  };

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async navigate(): Promise<void> {
    await super.navigate('');
  }

  async goToAccount(): Promise<void> {
    await this.click(this.selectors.accountLink);
  }

  async goToAbout(): Promise<void> {
    await this.click(this.selectors.aboutLink);
  }

  async hasEssentialElements(): Promise<boolean> {
    // Use base class method with navigation check
    const hasBasicElements = await super.hasEssentialElements(
      this.selectors.mainHeading,
      this.selectors.mainContent
    );
    
    // Also check for navigation
    const hasNavigation = await this.page.locator(this.selectors.navigation).first().isVisible();
    
    return hasBasicElements && hasNavigation;
  }
}