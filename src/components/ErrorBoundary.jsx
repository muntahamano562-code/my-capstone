import { Component } from 'react';

// Lightweight React error boundary for this Vite SPA.
// Shows a recovery UI instead of a blank screen — no Next.js error files.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error && error.message ? error.message : '' };
  }

  componentDidCatch(error, info) {
    // Surface for debugging without exposing internals to the user.
    console.error('UI error caught by boundary:', error, info);
  }

  handleReload() {
    this.setState({ hasError: false, message: '' });
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error-boundary" role="alert">
          <div className="app-error-boundary__icon" aria-hidden="true">⚠️</div>
          <h2 className="app-error-boundary__title">Something went wrong</h2>
          <p className="app-error-boundary__message">
            The assistant interface hit an unexpected problem. You can reload to try again.
          </p>
          <button
            type="button"
            className="app-error-boundary__retry"
            onClick={this.handleReload}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
