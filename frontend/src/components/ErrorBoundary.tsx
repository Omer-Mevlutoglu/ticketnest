import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors so one broken component does not blank the whole app.
 *
 * Without this, any exception thrown during render unmounts the entire tree and
 * the user is left staring at a white page with no way forward.
 *
 * Must be a class: there is no hook equivalent of `componentDidCatch`.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // The place a real error tracker (Sentry) would hook in — see D3.
    console.error("Unhandled render error:", error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className="min-h-screen grid place-items-center px-6 text-center"
      >
        <div className="max-w-md">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-400">
            This page hit an unexpected error. Your bookings and holds are
            unaffected.
          </p>

          {import.meta.env.DEV && (
            <pre className="mt-4 overflow-x-auto rounded-md border border-white/10 bg-white/5 p-3 text-left text-xs text-rose-300">
              {error.message}
            </pre>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={this.reset}
              className="rounded-md bg-primary px-5 py-2 text-sm transition hover:bg-primary-dull"
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-md border border-white/15 px-5 py-2 text-sm transition hover:bg-white/5"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
