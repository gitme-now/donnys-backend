import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import YTDlpWrap from 'yt-dlp-wrap';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class YtDlpService implements OnModuleInit {
  private ytDlp: YTDlpWrap;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const configuredPath = this.configService.get<string>('scraping.ytDlpPath');

    // If a non-default path is explicitly configured (e.g. Docker /usr/local/bin/yt-dlp), use it.
    if (configuredPath && configuredPath !== 'yt-dlp' && fs.existsSync(configuredPath)) {
      console.log('[YtDlpService] using configured yt-dlp binary', { path: configuredPath });
      this.ytDlp = new YTDlpWrap(configuredPath);
      await this.logVersion();
      return;
    }

    // Check if yt-dlp exists on PATH (e.g. homebrew or system install).
    const onPathBinary = this.resolveFromPath('yt-dlp');
    if (onPathBinary) {
      console.log('[YtDlpService] found yt-dlp on PATH', { path: onPathBinary });
      this.ytDlp = new YTDlpWrap(onPathBinary);
      await this.logVersion();
      return;
    }

    // Fall back: download the binary via yt-dlp-wrap (GitHub releases).
    const binDir = path.join(process.cwd(), 'bin');
    const binPath = path.join(binDir, 'yt-dlp');
    fs.mkdirSync(binDir, { recursive: true });

    if (fs.existsSync(binPath)) {
      console.log('[YtDlpService] using cached yt-dlp binary', { path: binPath });
    } else {
      console.log('[YtDlpService] yt-dlp not found — downloading from GitHub releases...', {
        destination: binPath,
      });
      await YTDlpWrap.downloadFromGithub(binPath);
      console.log('[YtDlpService] download complete', { path: binPath });
    }

    this.ytDlp = new YTDlpWrap(binPath);
    await this.logVersion();
  }

  /**
   * Execute yt-dlp with the provided argument list and return stdout as a string.
   */
  async exec(args: string[]): Promise<string> {
    return this.ytDlp.execPromise(args);
  }

  /**
   * Return the underlying YTDlpWrap instance for advanced use.
   */
  getInstance(): YTDlpWrap {
    return this.ytDlp;
  }

  /**
   * Return the currently installed yt-dlp version string.
   */
  async getVersion(): Promise<string> {
    return this.ytDlp.getVersion();
  }

  private async logVersion(): Promise<void> {
    try {
      const version = await this.ytDlp.getVersion();
      console.log('[YtDlpService] yt-dlp ready', { version });
    } catch (err) {
      console.log('[YtDlpService] could not read version', {
        error: (err as Error).message,
      });
    }
  }

  private resolveFromPath(binary: string): string | null {
    const PATH = process.env.PATH || '';
    for (const dir of PATH.split(':')) {
      const candidate = path.join(dir, binary);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return candidate;
      } catch {
        // not found in this dir
      }
    }
    return null;
  }
}
