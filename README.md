# Playwright Test Automation Suite

Production-ready cross-browser test automation suite using Playwright with TypeScript.

## Quick Start

```bash
# Clone and setup
git clone https://github.com/nikolaipenkev/fantastic-spork.git
cd fantastic-spork
npm install
npm run install:browsers

# Build and test
npm run build
npm test
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run build` | TypeScript compilation |
| `npm run install:browsers` | Install Playwright browsers |
| `npm run report` | Open HTML test report |

### Environment-Specific Testing
```bash
npm run test:local       # Local environment
npm run test:staging     # Staging environment  
npm run test:production  # Production environment (default)
```

### Browser-Specific Testing
```bash
npm run test:chrome      # Chromium only
npm run test:firefox     # Firefox only
npm run test:safari      # WebKit only
npm run test:mobile      # Mobile browsers
```

### Individual Test Cases
```bash
npm run test:case1       # Console error detection
npm run test:case2       # Link validation
npm run test:case3       # Login functionality
npm run test:case4       # GitHub PR analysis


## Configuration

### Environment Setup
Set environment via command line (highest priority):
```bash
# Windows PowerShell
$env:TEST_ENV="production"; npm test

# Linux/Mac/WSL
TEST_ENV=production npm test
```

Or edit `config/environments.json` (fallback):
```json
{
  "environments": {
    "production": {
      "baseUrl": "https://pocketaces2.github.io/fashionhub",
      "basePath": "/",
      "name": "Production Environment"
    },
    "local": {
      "baseUrl": "http://localhost:4000/fashionhub",
      "basePath": "/",
      "name": "Local Development"
    },
    "staging": {
      "baseUrl": "https://staging-env/fashionhub",
      "basePath": "/",
      "name": "Staging Environment"
    }
  }
}
```

## Test Cases

1. **Console Error Detection** (`test-case-1-console-errors.spec.ts`)
   - Monitors JavaScript console errors with intelligent filtering
   - Tests homepage, about page (with expected errors), and login page
   - Includes error injection testing to validate detection capability

2. **Link Validation** (`test-case-2-link-validation.spec.ts`)
   - Validates HTTP status codes for all internal and external links
   - Comprehensive link discovery and validation across pages
   - Handles different link types (anchor, navigation, etc.)

3. **Login Functionality** (`test-case-3-login.spec.ts`)
   - Tests complete authentication flow with form validation
   - Validates successful login, invalid credentials, and form elements
   - Cross-browser compatibility testing

4. **GitHub PR Analysis** (`test-case-4-github-pr.spec.ts`)
   - Extracts pull request data from GitHub repositories
   - Exports structured data to CSV format for analysis
   - Includes retry logic and error handling for API stability

## Requirements

- **Node.js 18+**
- **npm** or **yarn**
- Internet connection for browser downloads

## Project Structure

```
├── .github/
│   └── workflows/           # GitHub Actions CI/CD pipeline
├── config/
│   └── environments.json   # Environment configurations
├── pages/                   # Page Object Model (POM) classes
│   ├── base-page.ts        # Base page object with common functionality
│   ├── home-page.ts        # Homepage page object
│   ├── login-page.ts       # Login page object
│   ├── about-page.ts       # About page object
│   └── index.ts            # Page object exports
├── tests/
│   ├── test-case-1-console-errors.spec.ts     # Console error detection
│   ├── test-case-2-link-validation.spec.ts    # Link validation
│   ├── test-case-3-login.spec.ts              # Login functionality
│   └── test-case-4-github-pr.spec.ts          # GitHub PR analysis
├── utils/
│   ├── base-test.ts        # Base test framework with utilities
│   └── config-manager.ts   # Environment and configuration management
├── test-outputs/           # Generated CSV files and exports
├── test-results/           # Test execution results
├── playwright-report/      # HTML test reports
├── playwright.config.ts    # Playwright configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and npm scripts
```

## Results & Reports

- **HTML Report**: `npm run report` (interactive with screenshots/videos)
- **Test Results**: Located in `test-results/` directory
- **CSV Exports**: GitHub PR data saved to `test-outputs/` directory
- **CI/CD Pipeline**: Automated testing via GitHub Actions with Docker support
- **Screenshots & Videos**: Captured automatically on test failures

## Cross-Browser Support

Tests run across multiple browsers and devices:
- **Desktop**: Chromium, Firefox, WebKit (Safari)
- **Mobile**: Chrome (Android), Safari (iOS)
- **CI/CD**: All browsers tested in GitHub Actions pipeline
- **Responsive**: Tests validate functionality across different screen sizes

## Development

```bash
# Debug mode (step-through with browser dev tools)
npm run test:debug

# Headed mode (see browser while tests run)
npm run test:headed

# Build verification (TypeScript compilation check)
npm run build

# Run specific test file
npx playwright test test-case-1-console-errors.spec.ts

# Run with specific browser
npx playwright test --project=chromium

# Generate and view reports
npm run report
```