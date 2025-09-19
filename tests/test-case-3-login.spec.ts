import { test, expect } from '../utils/base-test';

test.describe('Test Case 3: Login Functionality Testing', () => {
  
  test('should successfully login with valid credentials', async ({ 
    page, 
    configManager, 
    testLogger, 
    pageHelper 
  }) => {
    const config = configManager.getConfig();
    const environment = configManager.getCurrentEnvironment();
    const credentials = config.credentials.demo;
    
    testLogger.info('Starting valid login test', {
      environment: environment.name,
      loginUrl: `${environment.baseUrl}/login.html`,
      username: credentials.username
    });

    testLogger.step('Navigating to login page');
    await pageHelper.navigateToUrl(`${environment.baseUrl}/login.html`);

    testLogger.step('Taking screenshot before login attempt');
    await pageHelper.takeScreenshot('before-login');

    testLogger.step('Locating and filling login form elements');
    const usernameField = await findLoginField(page, 'username', testLogger);
    const passwordField = await findLoginField(page, 'password', testLogger);
    const loginButton = await findLoginButton(page, testLogger);

    testLogger.step('Filling in credentials');
    await pageHelper.fillInput(usernameField, credentials.username);
    await pageHelper.fillInput(passwordField, credentials.password);

    testLogger.step('Taking screenshot with filled form');
    await pageHelper.takeScreenshot('login-form-filled');

    testLogger.step('Submitting login form');
    await pageHelper.clickElement(loginButton);

    // Wait for navigation or response
    await page.waitForTimeout(2000); // Allow time for any redirects or dynamic content

    testLogger.step('Taking screenshot after login attempt');
    await pageHelper.takeScreenshot('after-login');

    testLogger.step('Verifying successful login');
    await verifySuccessfulLogin(page, testLogger);
    
    testLogger.info('Valid login test completed successfully');
  });

  test('should handle invalid credentials appropriately', async ({ 
    page, 
    configManager, 
    testLogger, 
    pageHelper 
  }) => {
    const environment = configManager.getCurrentEnvironment();
    testLogger.info('Starting invalid login credentials test');

    testLogger.step('Navigating to login page');
    await pageHelper.navigateToUrl(`${environment.baseUrl}/login.html`);

    testLogger.step('Locating login form elements');
    const usernameField = await findLoginField(page, 'username', testLogger);
    const passwordField = await findLoginField(page, 'password', testLogger);
    const loginButton = await findLoginButton(page, testLogger);

    testLogger.step('Attempting login with invalid credentials');
    await pageHelper.fillInput(usernameField, 'invaliduser');
    await pageHelper.fillInput(passwordField, 'wrongpassword');

    await pageHelper.clickElement(loginButton);
    await page.waitForTimeout(1000);

    testLogger.step('Verifying login failure handling');
    const currentUrl = page.url();
    const isStillOnLoginPage = currentUrl.includes('login') || 
                              await page.locator('input[type="password"]').isVisible();
    
    testLogger.info('Invalid login verification results', {
      currentUrl,
      stillOnLoginPage: isStillOnLoginPage
    });

    // Should either stay on login page or show error message
    const hasErrorMessage = await page.locator('text=/error|invalid|incorrect|failed/i').isVisible().catch(() => false);
    
    if (hasErrorMessage) {
      testLogger.info('Error message detected for invalid login');
      await pageHelper.takeScreenshot('invalid-login-error-message');
    }
    
    expect(isStillOnLoginPage || hasErrorMessage).toBeTruthy();
    testLogger.info('Invalid credentials test completed successfully');
  });

  test('should validate login form elements exist', async ({ 
    page, 
    configManager, 
    testLogger, 
    pageHelper 
  }) => {
    const environment = configManager.getCurrentEnvironment();
    testLogger.info('Starting login form validation test');

    testLogger.step('Navigating to login page');
    await pageHelper.navigateToUrl(`${environment.baseUrl}/login.html`);

    testLogger.step('Validating essential form elements exist');
    const usernameField = await findLoginField(page, 'username', testLogger);
    const passwordField = await findLoginField(page, 'password', testLogger);
    const loginButton = await findLoginButton(page, testLogger);

    expect(usernameField).toBeTruthy();
    expect(passwordField).toBeTruthy();
    expect(loginButton).toBeTruthy();

    testLogger.step('Verifying form elements are interactive');
    await expect(usernameField).toBeVisible();
    await expect(usernameField).toBeEditable();
    await expect(passwordField).toBeVisible();
    await expect(passwordField).toBeEditable();
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toBeEnabled();

    testLogger.info('All login form elements are present and interactive');
    await pageHelper.takeScreenshot('login-form-validation');
    testLogger.info('Login form validation test completed successfully');
  });

  async function findLoginField(page: any, fieldType: 'username' | 'password', testLogger: any) {
    const selectors = fieldType === 'username' 
      ? [
          '#username',
          'input[name="username"]',
          'input[id="username"]',
          'input[placeholder*="username" i]',
          'input[placeholder*="user" i]',
          'input[type="text"]'
        ]
      : [
          '#password',
          'input[name="password"]',
          'input[id="password"]',
          'input[type="password"]',
          'input[placeholder*="password" i]'
        ];

    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          testLogger.info(`Found ${fieldType} field`, { selector });
          return element;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    testLogger.error(`Could not find ${fieldType} field`, { attemptedSelectors: selectors });
    throw new Error(`Could not find ${fieldType} field`);
  }

  async function findLoginButton(page: any, testLogger: any) {
    const selectors = [
      'input[type="submit"]',
      'input[value="Login"]',
      'button[type="submit"]',
      'button:has-text("login")',
      'button:has-text("Login")',
      '.login-btn',
      '#login-btn',
      'button'
    ];

    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          testLogger.info('Found login button', { selector });
          return element;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    testLogger.error('Could not find login button', { attemptedSelectors: selectors });
    throw new Error('Could not find login button');
  }

  async function verifySuccessfulLogin(page: any, testLogger: any) {
    const currentUrl = page.url();
    testLogger.info('Starting login verification', { postLoginUrl: currentUrl });

    // Multiple ways to verify successful login
    const loginIndicators = [
      // URL-based checks
      () => !currentUrl.includes('login.html'),
      () => currentUrl.includes('dashboard') || currentUrl.includes('home') || currentUrl.includes('profile'),
      
      // Content-based checks
      async () => {
        const welcomeElements = await page.locator('text=/welcome|hello|dashboard|logout|profile|account/i').count();
        return welcomeElements > 0;
      },
      
      // Form absence check
      async () => {
        const loginFormExists = await page.locator('input[type="password"]').isVisible().catch(() => false);
        return !loginFormExists;
      },
      
      // Navigation/menu check
      async () => {
        const navElements = await page.locator('nav, .navbar, .menu, .navigation').count();
        return navElements > 0;
      }
    ];

    let successIndicators = 0;
    const results = [];

    for (let i = 0; i < loginIndicators.length; i++) {
      try {
        const result = await loginIndicators[i]();
        results.push({ indicator: i + 1, result, passed: result });
        if (result) successIndicators++;
      } catch (error: any) {
        results.push({ indicator: i + 1, result: false, error: error?.message, passed: false });
      }
    }

    testLogger.info('Login verification analysis', {
      successIndicators: `${successIndicators}/${loginIndicators.length}`,
      detailedResults: results,
      verificationPassed: successIndicators >= 2
    });

    // Consider login successful if at least 2 indicators pass
    expect(successIndicators).toBeGreaterThanOrEqual(2);
  }
});