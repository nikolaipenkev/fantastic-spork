import { Page } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * LoginPage - Simple and focused on core functionality
 */
export class LoginPage extends BasePage {
  // Simple, clear selectors
  private readonly selectors = {
    username: '#username',
    password: '#password', 
    loginButton: 'input[type="submit"]',
    errorMessage: '.error'
  };

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  /**
   * Navigate to login page
   */
  async navigate(): Promise<void> {
    await super.navigate('/login.html');
  }

  /**
   * Perform login
   */
  async login(username: string, password: string): Promise<void> {
    await this.fill(this.selectors.username, username);
    await this.fill(this.selectors.password, password);
    await this.click(this.selectors.loginButton);
  }

  /**
   * Check if login was successful (redirected away from login page)
   */
  async isLoginSuccessful(): Promise<boolean> {
    // Wait for either redirect or error message
    await Promise.race([
      this.page.waitForURL(/account/, { timeout: 5000 }),
      this.page.waitForSelector(this.selectors.errorMessage, { timeout: 5000 })
    ]).catch(() => {});

    return !this.getCurrentUrl().includes('login');
  }

  /**
   * Get error message if present
   */
  async getErrorMessage(): Promise<string> {
    if (await this.isVisible(this.selectors.errorMessage)) {
      return await this.getText(this.selectors.errorMessage);
    }
    return '';
  }

  /**
   * Check if form elements are present
   */
  async hasFormElements(): Promise<boolean> {
    const hasUsername = await this.isVisible(this.selectors.username);
    const hasPassword = await this.isVisible(this.selectors.password);
    const hasButton = await this.isVisible(this.selectors.loginButton);
    
    return hasUsername && hasPassword && hasButton;
  }
}