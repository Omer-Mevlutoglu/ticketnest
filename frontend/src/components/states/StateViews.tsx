import React from "react";
import { Link } from "react-router-dom";

/**
 * Shared loading, empty, and error views.
 *
 * Each announces itself to assistive technology: `role="status"` with
 * `aria-live="polite"` for progress, `role="alert"` for failures. Without
 * those, a screen-reader user gets silence while the page changes underneath
 * them.
 */

/** A single shimmering placeholder block. */
export const Skeleton: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded-md bg-white/10 ${className}`}
  />
);

/**
 * Placeholder cards in the shape of the content being loaded.
 *
 * Preferable to a full-page spinner: the layout does not jump when the real
 * content arrives.
 */
export const CardGridSkeleton: React.FC<{ count?: number; label?: string }> = ({
  count = 6,
  label = "Loading",
}) => (
  <div role="status" aria-live="polite" aria-busy="true">
    <span className="sr-only">{label}…</span>
    <div className="flex flex-wrap gap-8 max-sm:justify-center">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="w-66 space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  </div>
);

/** Rows for table-shaped pages. */
export const ListSkeleton: React.FC<{ rows?: number; label?: string }> = ({
  rows = 5,
  label = "Loading",
}) => (
  <div role="status" aria-live="polite" aria-busy="true" className="space-y-3">
    <span className="sr-only">{label}…</span>
    {Array.from({ length: rows }, (_, i) => (
      <Skeleton key={i} className="h-16 w-full" />
    ))}
  </div>
);

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; to: string };
  icon?: React.ReactNode;
}

/** "Nothing here yet", with a way out. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
}) => (
  <div className="flex flex-col items-center gap-3 py-16 text-center">
    {icon && <div className="text-gray-500">{icon}</div>}
    <h2 className="text-xl font-semibold text-gray-200">{title}</h2>
    {description && (
      <p className="max-w-sm text-sm text-gray-400">{description}</p>
    )}
    {action && (
      <Link
        to={action.to}
        className="mt-2 rounded-md bg-primary px-6 py-2 text-sm font-medium transition hover:bg-primary-dull"
      >
        {action.label}
      </Link>
    )}
  </div>
);

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/** A failed fetch, with a retry rather than a dead end. */
export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => (
  <div
    role="alert"
    className="flex flex-col items-center gap-3 py-16 text-center"
  >
    <h2 className="text-lg font-semibold text-rose-300">
      That didn’t load
    </h2>
    <p className="max-w-sm text-sm text-gray-400">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-2 rounded-md border border-white/15 px-5 py-2 text-sm transition hover:bg-white/5"
      >
        Try again
      </button>
    )}
  </div>
);
