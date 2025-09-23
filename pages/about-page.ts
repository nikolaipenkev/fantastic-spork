import { Page } from '@playwright/test';
import { BasePage } from './base-page';

export class AboutPage extends BasePage {
  private readonly selectors = {
    pageHeading: 'h1, h2, .title, .heading, [class*="title"], [class*="heading"]',
    mainContent: 'main, .content, .main-content, section, article, .container',
    navigation: 'nav, .nav, .navbar, .menu, header a, .navigation',
    backLink: 'a[href*="index"], a:has-text("Home"), a:has-text("Back"), a[href="/"], a[href="../"]'
  };

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async navigate(): Promise<void> {
    await super.navigate('/about.html');
  }

  async getPageHeading(): Promise<string> {
    return await this.getText(this.selectors.pageHeading);
  }

  async getMainContent(): Promise<string> {
    return await this.getText(this.selectors.mainContent);
  }

  async goBackToHome(): Promise<void> {
    await this.click(this.selectors.backLink);
  }

  async hasEssentialElements(): Promise<boolean> {
    // Use base class method with page-specific selectors
    return await super.hasEssentialElements(
      this.selectors.pageHeading,
      this.selectors.mainContent
    );
  }

  async hasNavigation(): Promise<boolean> {
    return await this.isVisible(this.selectors.navigation);
  }
}