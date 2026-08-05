/// <reference types="vite/client" />

/**
 * Typed Vite environment.
 *
 * Without this, `import.meta.env` is untyped and every call site reached for
 * `(import.meta as any).env` with its own eslint-disable. Declaring it once
 * removes those casts.
 */
interface ImportMetaEnv {
  /** Origin of the backend API, no trailing slash. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
