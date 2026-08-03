/**
 * Error carrying an HTTP status code.
 *
 * Replaces the `const e = new Error(); // @ts-ignore; e.status = 400` pattern.
 * Introduced here for the code touched by WP1.1/WP1.2; WP2.1 adopts it across
 * the rest of the codebase and teaches the global handler about it.
 */
export class HttpError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    Error.captureStackTrace?.(this, HttpError);
  }
}

export const httpError = (status: number, message: string): HttpError =>
  new HttpError(status, message);
