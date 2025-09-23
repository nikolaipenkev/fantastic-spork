import { Page } from '@playwright/test';
import { BasePage } from './base-page';

export class LoginPage extends BasePage {
  private readonly selectors = {
    username: '#username, input[name="username"], input[name="email"], input[type="email"], input[placeholder*="username"], input[placeholder*="email"]',
    password: '#password, input[name="password"], input[type="password"], input[placeholder*="password"]', 
    loginButton: 'input[type="submit"], button[type="submit"], .login-button, #login-button',
    errorMessage: '.error, .alert, .message, [class*="error"], [class*="alert"]'
  };

  constructor(page: Page, baseUrl: string) {
    super(page, baseUrl);
  }

  async navigate(): Promise<void> {
    await super.navigate('/login.html');
  }

  async login(username: string, password: string): Promise<void> {
    // Fill username/email field
    const usernameField = this.page.locator(this.selectors.username).first();
    if (await usernameField.isVisible()) {
      await usernameField.fill(username);
    }
    
    // Fill password field
    const passwordField = this.page.locator(this.selectors.password).first();
    if (await passwordField.isVisible()) {
      await passwordField.fill(password);
    }
    
    // Click login button
    const loginButton = this.page.locator(this.selectors.loginButton).first();
    if (await loginButton.isVisible()) {
      await loginButton.click();
    }
  }

  async submitLogin(): Promise<void> {
    const loginButton = this.page.locator(this.selectors.loginButton).first();
    if (await loginButton.isVisible()) {
      await loginButton.click();
    }
  }

  async isLoginSuccessful(): Promise<boolean> {
    // Simple check: redirected away from login page
    await this.page.waitForTimeout(2000);
    return !this.getCurrentUrl().includes('login');
  }

  async getErrorMessage(): Promise<string> {
    if (await this.isVisible(this.selectors.errorMessage)) {
      return await this.getText(this.selectors.errorMessage);
    }
    return '';
  }

  async hasFormElements(): Promise<boolean> {
    // Check for username/email field
    const hasUsername = await this.page.locator(this.selectors.username).first().isVisible();
    
    // Check for password field  
    const hasPassword = await this.page.locator(this.selectors.password).first().isVisible();
    
    // Check for submit button
    const hasButton = await this.page.locator(this.selectors.loginButton).first().isVisible();
    
    // Alternative check - if we have any form with password, consider it a login form
    const hasAnyLoginForm = await this.page.locator('form').isVisible() && 
                           await this.page.locator('input[type="password"]').isVisible();
    
    return (hasUsername && hasPassword && hasButton) || hasAnyLoginForm;
  }
}