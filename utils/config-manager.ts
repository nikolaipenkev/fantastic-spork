import { PlaywrightTestConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Interfaces for type safety and documentation
export interface Environment {
  baseUrl: string;
  basePath: string;
  name: string;
  timeout?: number;
  retries?: number;
}

export interface TestConfig {
  environments: Record<string, Environment>;
  github: {
    exampleRepo: string;
  };
  credentials: {
    demo: {
      username: string;
      password: string;
    };
  };
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Production-grade configuration manager following SOLID principles
 * Implements singleton pattern with comprehensive validation and error handling
 */
export class ConfigManager {
  private config!: TestConfig;
  private currentEnvironment: string;
  private static instance: ConfigManager;

  constructor() {
    this.validateConstructorContext();
    this.loadAndValidateConfig();
    this.currentEnvironment = this.determineEnvironmentWithFallback();
    this.validateSelectedEnvironment();
  }

  /**
   * Singleton pattern implementation for consistent configuration access
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Validates constructor execution context
   */
  private validateConstructorContext(): void {
    if (typeof process === 'undefined') {
      throw new Error('ConfigManager can only be used in Node.js environment');
    }
  }

  /**
   * Loads and validates configuration with comprehensive error handling
   */
  private loadAndValidateConfig(): void {
    const configPath = this.resolveConfigPath();
    this.ensureConfigFileExists(configPath);
    
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      this.config = this.parseAndValidateConfig(configContent);
    } catch (error) {
      throw new Error(`Failed to load configuration: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Resolves configuration file path with environment-specific overrides
   */
  private resolveConfigPath(): string {
    const configDir = path.join(__dirname, '../config');
    const environmentSpecificConfig = path.join(configDir, `environments.${process.env.NODE_ENV || 'default'}.json`);
    const defaultConfig = path.join(configDir, 'environments.json');

    // Use environment-specific config if exists, otherwise fallback to default
    return fs.existsSync(environmentSpecificConfig) ? environmentSpecificConfig : defaultConfig;
  }

  /**
   * Ensures configuration file exists with helpful error messages
   */
  private ensureConfigFileExists(configPath: string): void {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found at ${configPath}. Please ensure the config directory contains environments.json`);
    }
  }

  /**
   * Parses and validates configuration structure
   */
  private parseAndValidateConfig(configContent: string): TestConfig {
    let parsedConfig: TestConfig;
    
    try {
      parsedConfig = JSON.parse(configContent);
    } catch (error) {
      throw new Error(`Invalid JSON in configuration file: ${this.getErrorMessage(error)}`);
    }

    const validation = this.validateConfigStructure(parsedConfig);
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn('Configuration warnings:', validation.warnings.join(', '));
    }

    return parsedConfig;
  }

  /**
   * Validates configuration structure and content
   */
  private validateConfigStructure(config: any): ConfigValidationResult {
    const result: ConfigValidationResult = { isValid: true, errors: [], warnings: [] };

    // Required structure validation
    if (!config.environments || typeof config.environments !== 'object') {
      result.errors.push('Missing or invalid environments configuration');
      result.isValid = false;
    }

    if (config.environments) {
      // Validate each environment
      Object.entries(config.environments).forEach(([name, env]: [string, any]) => {
        if (!env.baseUrl || typeof env.baseUrl !== 'string') {
          result.errors.push(`Environment '${name}' missing or invalid baseUrl`);
          result.isValid = false;
        }
        
        if (!env.basePath || typeof env.basePath !== 'string') {
          result.errors.push(`Environment '${name}' missing or invalid basePath`);
          result.isValid = false;
        }

        if (!env.name || typeof env.name !== 'string') {
          result.warnings.push(`Environment '${name}' missing display name`);
        }

        // Validate URL format
        if (env.baseUrl && !this.isValidUrl(env.baseUrl)) {
          result.errors.push(`Environment '${name}' has invalid baseUrl format`);
          result.isValid = false;
        }
      });
    }

    // Warn about missing optional configurations
    if (!config.credentials) {
      result.warnings.push('No credentials configuration found');
    }

    return result;
  }

  /**
   * Validates URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Determines environment with comprehensive fallback strategy
   */
  private determineEnvironmentWithFallback(): string {
    const strategies = [
      { name: 'Command Line (TEST_ENV)', value: process.env.TEST_ENV },
      { name: 'Command Line Argument', value: this.parseCommandLineArgument() },
      { name: 'Environment Variable (PLAYWRIGHT_ENV)', value: process.env.PLAYWRIGHT_ENV },
      { name: 'Node Environment (NODE_ENV)', value: process.env.NODE_ENV },
      { name: 'Default', value: 'production' }
    ];

    for (const strategy of strategies) {
      if (strategy.value && this.config.environments[strategy.value]) {
        console.log(`✓ Using environment from ${strategy.name}: ${strategy.value}`);
        return strategy.value;
      }
    }

    // Final fallback - use first available environment
    const availableEnvironments = Object.keys(this.config.environments);
    if (availableEnvironments.length > 0) {
      const fallbackEnv = availableEnvironments[0];
      console.warn(`⚠ Using fallback environment: ${fallbackEnv}`);
      return fallbackEnv;
    }

    throw new Error('No valid environments found in configuration');
  }

  /**
   * Parses command line arguments for environment specification
   */
  private parseCommandLineArgument(): string | undefined {
    const envArg = process.argv.find(arg => arg.startsWith('--env='));
    return envArg?.split('=')[1];
  }

  /**
   * Validates that selected environment is properly configured
   */
  private validateSelectedEnvironment(): void {
    const env = this.getCurrentEnvironment();
    
    if (!env.baseUrl || !env.basePath) {
      throw new Error(`Selected environment '${this.currentEnvironment}' is missing required configuration`);
    }

    console.log(`✓ Configuration loaded successfully for environment: ${env.name}`);
  }

  /**
   * Extracts meaningful error messages from various error types
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  // Public API methods with comprehensive validation

  public getCurrentEnvironment(): Environment {
    const env = this.config.environments[this.currentEnvironment];
    if (!env) {
      throw new Error(`Environment '${this.currentEnvironment}' not found in configuration`);
    }
    return env;
  }

  public getFullBaseUrl(): string {
    const env = this.getCurrentEnvironment();
    try {
      // Normalize the URL - remove trailing slash from baseUrl and ensure basePath starts with /
      const baseUrl = env.baseUrl.replace(/\/$/, '');
      const basePath = env.basePath.startsWith('/') ? env.basePath : `/${env.basePath}`;
      const fullUrl = `${baseUrl}${basePath}`;
      
      // Validate final URL
      new URL(fullUrl);
      return fullUrl;
    } catch (error) {
      throw new Error(`Failed to construct valid URL for environment '${this.currentEnvironment}': ${this.getErrorMessage(error)}`);
    }
  }

  public getCurrentEnvironmentName(): string {
    return this.currentEnvironment;
  }

  public getConfig(): TestConfig {
    return { ...this.config }; // Return copy to prevent external modification
  }

  public getAllEnvironments(): Record<string, Environment> {
    return { ...this.config.environments }; // Return copy to prevent external modification
  }

  /**
   * Safely gets credentials with validation
   */
  public getCredentials(type: string = 'demo'): { username: string; password: string } {
    if (!this.config.credentials || !this.config.credentials[type as keyof typeof this.config.credentials]) {
      throw new Error(`Credentials for '${type}' not found in configuration`);
    }
    return { ...this.config.credentials[type as keyof typeof this.config.credentials] };
  }

  /**
   * Gets environment-specific timeout values
   */
  public getTimeout(): number {
    const env = this.getCurrentEnvironment();
    return env.timeout || 30000; // Default 30 seconds
  }

  /**
   * Gets environment-specific retry values
   */
  public getRetries(): number {
    const env = this.getCurrentEnvironment();
    return env.retries ?? (process.env.CI ? 2 : 0);
  }
}

// Global instance using singleton pattern
export const configManager = ConfigManager.getInstance();