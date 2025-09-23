export class TestLogger {
  private testName: string;

  constructor(testName: string) {
    this.testName = testName;
  }

  info(message: string, data?: any): void {
    console.log(`[INFO] [${this.testName}] ${message}`);
    if (data) {
      console.log('  Data:', JSON.stringify(data, null, 2));
    }
  }

  error(message: string, error?: any): void {
    console.error(`[ERROR] [${this.testName}] ${message}`);
    if (error) {
      console.error('  Error:', error);
    }
  }

  step(stepName: string): void {
    console.log(`[STEP] ${stepName}`);
  }
}