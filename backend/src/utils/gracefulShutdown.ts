import { Server } from "node:http";
import mongoose from "mongoose";
import { ExpiryWorker } from "../jobs/expiryWorker";

export interface ShutdownOptions {
  server: Server;
  worker: ExpiryWorker;
  /** How long to let in-flight work finish before forcing the exit. */
  timeoutMs?: number;
  logger?: Pick<Console, "log" | "error">;
  /** Injectable so tests do not kill the runner. */
  exit?: (code: number) => void;
  /** Injectable so tests do not close the connection they share. */
  closeDatabase?: () => Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Shuts the process down without cutting off work in progress.
 *
 * The order matters:
 *
 *  1. Flip a flag so the readiness probe reports unready — a load balancer
 *     stops sending new traffic before the socket closes, which is what makes
 *     a deploy seamless rather than a burst of failed requests.
 *  2. Stop the expiry worker and wait for the sweep in flight.
 *  3. Stop accepting connections, and let open requests finish. Idle keep-alive
 *     sockets are closed immediately; without that they hold the server open
 *     for their full timeout even though no request is running.
 *  4. Close MongoDB.
 *
 * A deadline backs all of it. A shutdown that hangs forever is worse than one
 * that gives up: orchestrators send SIGKILL anyway, mid-write.
 */
export const createShutdownHandler = ({
  server,
  worker,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  logger = console,
  exit = (code) => process.exit(code),
  closeDatabase = () => mongoose.connection.close(false),
}: ShutdownOptions) => {
  let shuttingDown = false;

  const isShuttingDown = () => shuttingDown;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.log(
      JSON.stringify({ event: "shutdown.start", signal, timeoutMs })
    );

    // Hard deadline. Unref'd so it cannot itself keep the process alive.
    const deadline = setTimeout(() => {
      logger.error(
        JSON.stringify({ event: "shutdown.timeout", signal, timeoutMs })
      );
      exit(1);
    }, timeoutMs);
    deadline.unref?.();

    try {
      await worker.stop();

      await new Promise<void>((resolve) => {
        server.close(() => resolve());
        // Requests already being served keep their sockets; only idle ones go.
        server.closeIdleConnections?.();
      });

      await closeDatabase();

      clearTimeout(deadline);
      logger.log(JSON.stringify({ event: "shutdown.complete", signal }));
      exit(0);
    } catch (err) {
      clearTimeout(deadline);
      logger.error(
        JSON.stringify({
          event: "shutdown.failed",
          signal,
          message: err instanceof Error ? err.message : String(err),
        })
      );
      exit(1);
    }
  };

  return { shutdown, isShuttingDown };
};
