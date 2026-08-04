import {
  expireOverdueBookings,
  ExpireOverdueResult,
} from "../services/bookingService";

export type ExpiryRunOutcome =
  | ({ status: "ran" } & ExpireOverdueResult)
  | { status: "skipped"; reason: "already-running" | "stopped" };

export interface ExpiryWorkerOptions {
  intervalMs?: number;
  /** Injectable for tests. Defaults to the real sweep. */
  run?: () => Promise<ExpireOverdueResult>;
  logger?: Pick<Console, "log" | "error">;
}

const DEFAULT_INTERVAL_MS = 60 * 1000;

/**
 * Periodically releases lapsed seat holds.
 *
 * Owns its own lifecycle so it is not entangled with HTTP startup: the app can
 * be built and served without it, which is what lets integration tests drive
 * the API without a background job mutating state underneath them.
 *
 * Single-instance only. Two API instances both run this, and while the sweep is
 * idempotent so the result stays correct, the work is duplicated. Before
 * scaling horizontally, move execution to one external scheduler or a delayed
 * job queue.
 *
 * A TTL index is NOT an alternative here: TTL deletes whole documents, and what
 * is needed is a state transition on embedded seats.
 */
export class ExpiryWorker {
  private readonly intervalMs: number;
  private readonly run: () => Promise<ExpireOverdueResult>;
  private readonly logger: Pick<Console, "log" | "error">;

  private timer: NodeJS.Timeout | null = null;
  private inFlight: Promise<ExpiryRunOutcome> | null = null;
  private stopped = false;

  constructor(options: ExpiryWorkerOptions = {}) {
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.run = options.run ?? expireOverdueBookings;
    this.logger = options.logger ?? console;
  }

  /** True while a sweep is in progress. */
  get isRunning(): boolean {
    return this.inFlight !== null;
  }

  /**
   * Runs one sweep.
   *
   * Overlapping invocations are refused rather than queued: a slow sweep must
   * not stack up behind the interval. The caller can tell the difference from
   * the returned `status`.
   */
  async runOnce(): Promise<ExpiryRunOutcome> {
    if (this.stopped) {
      return { status: "skipped", reason: "stopped" };
    }
    if (this.inFlight) {
      return { status: "skipped", reason: "already-running" };
    }

    const execute = async (): Promise<ExpiryRunOutcome> => {
      const startedAt = Date.now();
      try {
        const result = await this.run();

        if (result.expiredCount || result.releasedSeats || result.failedCount) {
          this.logger.log(
            JSON.stringify({
              job: "expire-overdue-bookings",
              expiredCount: result.expiredCount,
              releasedSeats: result.releasedSeats,
              failedCount: result.failedCount,
              durationMs: Date.now() - startedAt,
            })
          );
        }

        return { status: "ran", ...result };
      } catch (err) {
        this.logger.error(
          JSON.stringify({
            job: "expire-overdue-bookings",
            error: err instanceof Error ? err.message : String(err),
            durationMs: Date.now() - startedAt,
          })
        );
        throw err;
      }
    };

    this.inFlight = execute().finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  /** Starts the interval and kicks off an immediate sweep. */
  start(): void {
    if (this.timer) return;
    this.stopped = false;

    const tick = () => {
      this.runOnce().catch(() => {
        // Already logged in execute(); never let a rejection reach the loop.
      });
    };

    tick();
    this.timer = setInterval(tick, this.intervalMs);
    this.timer.unref?.();
  }

  /**
   * Stops scheduling new sweeps and waits for the one in flight, so a shutdown
   * never severs a run partway through.
   */
  async stop(): Promise<void> {
    this.stopped = true;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.inFlight) {
      await this.inFlight.catch(() => {});
    }
  }
}
