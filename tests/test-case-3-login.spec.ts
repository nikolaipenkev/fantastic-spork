import { test, expect } from '../utils/base-test';
import { LoginPage } from '../pages/login-page';
import { HomePage } from '../pages/home-page';

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

    // Initialize page objects
    const loginPage = new LoginPage(page, environment.baseUrl);

    testLogger.step('Navigating to login page and taking screenshot');
    await loginPage.navigate();
    await pageHelper.takeScreenshot('before-login');

    testLogger.step('Verifying login form elements are present');
    const hasFormElements = await loginPage.hasFormElements();
    expect(hasFormElements).toBeTruthy();

    testLogger.step('Performing login with valid credentials');
    await loginPage.login(credentials.username, credentials.password);
    await pageHelper.takeScreenshot('after-login');

    testLogger.step('Verifying successful login');
    const isLoginSuccessful = await loginPage.isLoginSuccessful();
    expect(isLoginSuccessful).toBeTruthy();

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

    // Initialize page objects
    const loginPage = new LoginPage(page, environment.baseUrl);

    testLogger.step('Navigating to login page');
    await loginPage.navigate();

    testLogger.step('Attempting login with invalid credentials');
    await loginPage.login('invaliduser', 'wrongpassword');
    await pageHelper.takeScreenshot('invalid-login-attempt');

    testLogger.step('Verifying login failure handling');
    const isLoginSuccessful = await loginPage.isLoginSuccessful();
    expect(isLoginSuccessful).toBeFalsy();

    // Check for error message if present
    const errorMessage = await loginPage.getErrorMessage();
    if (errorMessage) {
      testLogger.info('Error message detected', { message: errorMessage });
    }

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

    // Initialize page objects
    const loginPage = new LoginPage(page, environment.baseUrl);

    testLogger.step('Navigating to login page');
    await loginPage.navigate();

    testLogger.step('Validating essential form elements exist');
    const hasFormElements = await loginPage.hasFormElements();
    expect(hasFormElements).toBeTruthy();

    await pageHelper.takeScreenshot('login-form-validation');
    testLogger.info('All login form elements are present and accessible');
    testLogger.info('Login form validation test completed successfully');
  });

  test('should navigate to login page from home page', async ({
    page,
    configManager,
    testLogger,
    pageHelper
  }) => {
    const environment = configManager.getCurrentEnvironment();
    testLogger.info('Starting navigation test from home to login');

    // Initialize page objects
    const homePage = new HomePage(page, environment.baseUrl);
    const loginPage = new LoginPage(page, environment.baseUrl);

    testLogger.step('Starting from home page');
    await homePage.navigate();

    testLogger.step('Navigating to account/login page via home page link');
    await homePage.goToAccount(); // Use simplified method name

    testLogger.step('Verifying we reached a login-capable page');
    // Check if we're on login page or account page that has login functionality
    const currentUrl = page.url();
    const isOnLoginOrAccountPage = currentUrl.includes('login') || currentUrl.includes('account');
    expect(isOnLoginOrAccountPage).toBeTruthy();

    // If we're on account page, try to find login elements there
    if (currentUrl.includes('account')) {
      // Account page might have login form or redirect to login
      const hasFormElements = await loginPage.hasFormElements();
      if (hasFormElements) {
        testLogger.info('Found login form on account page');
      } else {
        testLogger.info('Account page loaded, login form may be on dedicated login page');
      }
    } else {
      // We're on login page, verify form elements
      const hasFormElements = await loginPage.hasFormElements();
      expect(hasFormElements).toBeTruthy();
    }

    await pageHelper.takeScreenshot('navigation-from-home');
    testLogger.info('Navigation test completed successfully');
  });
});