import * as fs from 'fs';
import * as path from 'path';

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

export class ConfigManager {
  private config: TestConfig;
  private currentEnvironment: string;

  constructor() {
    this.config = this.loadConfig();
    this.currentEnvironment = this.getEnvironmentName();
  }

  private loadConfig(): TestConfig {
    const configPath = path.join(__dirname, '../config/environments.json');
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  private getEnvironmentName(): string {
    return process.env.TEST_ENV || process.env.NODE_ENV || 'production';
  }

  getCurrentEnvironment(): Environment {
    return this.config.environments[this.currentEnvironment];
  }

  getFullBaseUrl(): string {
    const env = this.getCurrentEnvironment();
    const baseUrl = env.baseUrl.replace(/\/$/, '');
    const basePath = env.basePath.startsWith('/') ? env.basePath : `/${env.basePath}`;
    return `${baseUrl}${basePath}`;
  }

  getCredentials(): { username: string; password: string } {
    return this.config.credentials.demo;
  }

  getConfig(): TestConfig {
    return this.config;
  }
}

export const configManager = new ConfigManager();