import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { chromium, Browser, Page, BrowserContext } from 'playwright';

@Injectable()
export class PlaywrightService implements OnModuleDestroy {
  private browser: Browser | null = null;

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Launch a new browser instance if not already running
   */
  private async ensureBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
      console.log('[PlaywrightService] browser launched');
    }
    return this.browser;
  }

  /**
   * Create a new browser context with a fresh page
   */
  async createContext(): Promise<BrowserContext> {
    const browser = await this.ensureBrowser();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    console.log('[PlaywrightService] context created');
    return context;
  }

  /**
   * Navigate to a URL with retry logic and timeout
   */
  async navigateWithRetry(
    page: Page,
    url: string,
    options: { timeout?: number; retries?: number } = {},
  ): Promise<void> {
    const { timeout = 30000, retries = 2 } = options;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(
          `[PlaywrightService] navigating to ${url} (attempt ${attempt + 1}/${retries + 1})`,
        );
        await page.goto(url, {
          timeout,
          waitUntil: 'domcontentloaded',
        });
        console.log(`[PlaywrightService] navigation succeeded`);
        return;
      } catch (error) {
        lastError = error as Error;
        console.log(
          `[PlaywrightService] navigation failed: ${lastError.message}`,
        );
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    throw new Error(
      `Failed to navigate to ${url} after ${retries + 1} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Scroll page to load lazy content
   */
  async scrollToLoadContent(
    page: Page,
    options: { scrolls?: number; delayMs?: number } = {},
  ): Promise<void> {
    const { scrolls = 5, delayMs = 1000 } = options;

    for (let i = 0; i < scrolls; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await page.waitForTimeout(delayMs);
    }

    console.log(`[PlaywrightService] scrolled ${scrolls} times`);
  }

  /**
   * Check if page shows login wall
   */
  async hasLoginWall(page: Page): Promise<boolean> {
    const loginSelectors = [
      'input[name="email"]',
      'input[name="pass"]',
      '[data-testid="royal_login_form"]',
      'form[data-testid="login-form"]',
    ];

    for (const selector of loginSelectors) {
      const element = await page.$(selector);
      if (element) {
        console.log(
          `[PlaywrightService] login wall detected: ${selector}`,
        );
        return true;
      }
    }

    return false;
  }
}
