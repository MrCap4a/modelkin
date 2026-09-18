import fs from "node:fs";
import path from "node:path";
import type { Writable } from "node:stream";

/**
 * Writable destination that rotates to `<logDir>/<YYYY-MM-DD>/<name>.log`
 * whenever the calendar day changes (ТЗ §33). Re-derives the current day's
 * path from the system clock on every write instead of caching any
 * in-memory rotation schedule, so behavior is correct across container
 * restarts without needing to persist rotation state.
 */
export class DailyRotatingWriter {
  private currentDateKey: string | null = null;
  private currentStream: fs.WriteStream | null = null;

  constructor(
    private readonly logDir: string,
    private readonly fileName: string,
  ) {}

  private dateKey(date: Date): string {
    return date.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  private getStream(): fs.WriteStream {
    const todayKey = this.dateKey(new Date());

    if (this.currentStream && this.currentDateKey === todayKey) {
      return this.currentStream;
    }

    this.currentStream?.end();

    const dayDir = path.join(this.logDir, todayKey);
    fs.mkdirSync(dayDir, { recursive: true });

    const filePath = path.join(dayDir, `${this.fileName}.log`);
    this.currentStream = fs.createWriteStream(filePath, { flags: "a" });
    this.currentDateKey = todayKey;

    return this.currentStream;
  }

  write(chunk: string): boolean {
    return this.getStream().write(chunk);
  }

  /** Adapts this writer to a plain Node Writable, e.g. for pino's destination. */
  asWritable(): Pick<Writable, "write"> {
    return { write: (chunk: unknown) => this.write(String(chunk)) } as Pick<Writable, "write">;
  }
}
