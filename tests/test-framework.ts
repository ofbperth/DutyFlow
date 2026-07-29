export interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
  beforeEachFns: (() => void)[];
  afterEachFns: (() => void)[];
}

export interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: Error;
  durationMs: number;
}

class TestRunner {
  private suites: TestSuite[] = [];
  private currentSuite: TestSuite | null = null;
  private results: TestResult[] = [];

  public describe(name: string, fn: () => void): void {
    const parentSuite = this.currentSuite;
    const suite: TestSuite = {
      name: parentSuite ? `${parentSuite.name} > ${name}` : name,
      tests: [],
      beforeEachFns: parentSuite ? [...parentSuite.beforeEachFns] : [],
      afterEachFns: parentSuite ? [...parentSuite.afterEachFns] : [],
    };
    this.suites.push(suite);
    this.currentSuite = suite;
    fn();
    this.currentSuite = parentSuite;
  }

  public it(name: string, fn: () => void | Promise<void>): void {
    if (!this.currentSuite) {
      throw new Error(`Test "${name}" must be within a describe block.`);
    }
    this.currentSuite.tests.push({ name, fn });
  }

  public beforeEach(fn: () => void): void {
    if (this.currentSuite) {
      this.currentSuite.beforeEachFns.push(fn);
    }
  }

  public afterEach(fn: () => void): void {
    if (this.currentSuite) {
      this.currentSuite.afterEachFns.push(fn);
    }
  }

  public async run(): Promise<{ total: number; passed: number; failed: number; results: TestResult[] }> {
    this.results = [];
    let passed = 0;
    let failed = 0;

    console.log('\n======================================================');
    console.log('         DutyFlow E2E & Component Test Runner        ');
    console.log('======================================================\n');

    for (const suite of this.suites) {
      console.log(`\nSUITE: ${suite.name}`);
      for (const test of suite.tests) {
        for (const fn of suite.beforeEachFns) {
          fn();
        }

        const start = Date.now();
        let testPassed = false;
        let testError: Error | undefined = undefined;

        try {
          await test.fn();
          testPassed = true;
          passed++;
          console.log(`  ✓ ${test.name} (${Date.now() - start}ms)`);
        } catch (err) {
          testPassed = false;
          testError = err as Error;
          failed++;
          console.log(`  ✗ ${test.name} (${Date.now() - start}ms)`);
          console.log(`    Error: ${(err as Error).message}`);
          if ((err as Error).stack) {
            const stackLines = ((err as Error).stack || '').split('\n').slice(0, 3).join('\n    ');
            console.log(`    ${stackLines}`);
          }
        }

        for (const fn of suite.afterEachFns) {
          fn();
        }

        this.results.push({
          suiteName: suite.name,
          testName: test.name,
          passed: testPassed,
          error: testError,
          durationMs: Date.now() - start,
        });
      }
    }

    const total = passed + failed;
    console.log('\n======================================================');
    console.log(`SUMMARY: Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
    console.log('======================================================\n');

    return { total, passed, failed, results: this.results };
  }
}

export const runner = new TestRunner();
export const describe = runner.describe.bind(runner);
export const it = runner.it.bind(runner);
export const beforeEach = runner.beforeEach.bind(runner);
export const afterEach = runner.afterEach.bind(runner);

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

export function expect<T>(actual: T) {
  const matchers = {
    toBe(expected: T): void {
      if (actual !== expected) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected: T): void {
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);
      if (actualStr !== expectedStr) {
        throw new AssertionError(`Expected ${actualStr} to equal ${expectedStr}`);
      }
    },
    toBeTruthy(): void {
      if (!actual) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} to be truthy`);
      }
    },
    toBeFalsy(): void {
      if (actual) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} to be falsy`);
      }
    },
    toBeNull(): void {
      if (actual !== null) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} to be null`);
      }
    },
    toBeUndefined(): void {
      if (actual !== undefined) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} to be undefined`);
      }
    },
    toContain(item: any): void {
      if (Array.isArray(actual)) {
        if (!actual.includes(item)) {
          throw new AssertionError(`Expected array ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`);
        }
      } else if (typeof actual === 'string') {
        if (!actual.includes(item as string)) {
          throw new AssertionError(`Expected string "${actual}" to contain "${item}"`);
        }
      } else {
        throw new AssertionError(`toContain requires array or string target`);
      }
    },
    toThrow(expectedMessageSubstr?: string): void {
      if (typeof actual !== 'function') {
        throw new AssertionError(`toThrow requires target to be a function`);
      }
      let didThrow = false;
      let thrownError: any = null;
      try {
        (actual as any)();
      } catch (e) {
        didThrow = true;
        thrownError = e;
      }
      if (!didThrow) {
        throw new AssertionError(`Expected function to throw an error, but it did not throw`);
      }
      if (expectedMessageSubstr && thrownError) {
        const msg = String(thrownError.message || thrownError).toLowerCase();
        const substr = expectedMessageSubstr.toLowerCase();
        if (!msg.includes(substr) && !msg.replace(/-/g, ' ').includes(substr.replace(/-/g, ' '))) {
          throw new AssertionError(`Expected thrown error message "${msg}" to contain "${expectedMessageSubstr}"`);
        }
      }
    },
    toBeGreaterThan(expected: number): void {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new AssertionError(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeLessThan(expected: number): void {
      if (typeof actual !== 'number' || actual >= expected) {
        throw new AssertionError(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toHaveLength(expected: number): void {
      if (!actual || typeof (actual as any).length !== 'number') {
        throw new AssertionError(`Expected object to have length property`);
      }
      const len = (actual as any).length;
      if (len !== expected) {
        throw new AssertionError(`Expected length ${len} to equal ${expected}`);
      }
    },
  };

  const notMatchers = {
    toBe(expected: T): void {
      if (actual === expected) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} NOT to be ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected: T): void {
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);
      if (actualStr === expectedStr) {
        throw new AssertionError(`Expected ${actualStr} NOT to equal ${expectedStr}`);
      }
    },
    toBeTruthy(): void {
      if (actual) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} to be falsy`);
      }
    },
    toBeFalsy(): void {
      if (!actual) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} to be truthy`);
      }
    },
    toContain(item: any): void {
      if (Array.isArray(actual)) {
        if (actual.includes(item)) {
          throw new AssertionError(`Expected array ${JSON.stringify(actual)} NOT to contain ${JSON.stringify(item)}`);
        }
      } else if (typeof actual === 'string') {
        if (actual.includes(item as string)) {
          throw new AssertionError(`Expected string "${actual}" NOT to contain "${item}"`);
        }
      }
    },
  };

  return {
    ...matchers,
    not: notMatchers,
  };
}
