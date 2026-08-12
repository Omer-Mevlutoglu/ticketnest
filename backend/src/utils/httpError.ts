/**
 * Error carrying an HTTP status code and a message that is safe to show a user.
 *
 * Replaces the `const e = new Error(); // @ts-ignore; e.status = 400` pattern
 * that was repeated ~48 times. Anything thrown that is NOT an `HttpError` is
 * treated by the global handler as an unexpected fault: it is logged in full
 * and reported to the client as a generic 500.
 */
export class HttpError extends Error {
  public readonly status: number;
  /** Stable machine-readable identifier, e.g. "HOLD_EXPIRED". Optional. */
  public readonly code?: string;

  constructor(
    status: number,
    message: string,
    options: { code?: string; cause?: unknown } = {}
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = options.code;
    if (options.cause !== undefined) {
      (this as Error).cause = options.cause;
    }
    Error.captureStackTrace?.(this, HttpError);
  }
}

export const httpError = (
  status: number,
  message: string,
  options: { code?: string; cause?: unknown } = {}
): HttpError => new HttpError(status, message, options);

export const isHttpError = (err: unknown): err is HttpError =>
  err instanceof HttpError;
