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
```

## Configuration

### Environment Setup
Set environment via command line (highest priority):
```bash
# Windows
$env:TEST_ENV="production"; npm test

# Linux/Mac
TEST_ENV=production npm test
```

Or edit `config/environments.json` (fallback):
```json
{
  "environments": {
    "production": {
      "baseUrl": "https://pocketaces2.github.io",
      "name": "Production Environment"
    },
    "local": {
      "baseUrl": "http://localhost:4000",
      "name": "Local Development"
    }
  }
}
```

## Test Cases

1. **Console Error Detection** - Monitors JavaScript errors with intelligent filtering
2. **Link Validation** - Validates HTTP status codes for all page links
3. **Login Functionality** - Tests authentication flow with form validation
4. **GitHub PR Analysis** - Extracts pull request data and exports to CSV

## Requirements

- **Node.js 18+**
- **npm** or **yarn**
- Internet connection for browser downloads

## Project Structure

```
├── tests/                    # Test specifications
├── utils/                    # Configuration and utilities
├── config/                   # Environment settings
├── playwright.config.ts      # Playwright configuration
└── package.json             # Dependencies and scripts
```

## Results & Reports

- **HTML Report**: `npm run report` (interactive with screenshots/videos)
- **Test Results**: Located in `test-results/` directory
- **Exported Data**: CSV files for GitHub PR analysis

## Cross-Browser Support

Tests run on:
- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Chrome (Android), Safari (iOS)

## Development

```bash
# Debug mode (step-through)
npm run test:debug

# Headed mode (see browser)
npm run test:headed

# Build verification
npm run build
```

---

**Repository**: https://github.com/nikolaipenkev/fantastic-spork  