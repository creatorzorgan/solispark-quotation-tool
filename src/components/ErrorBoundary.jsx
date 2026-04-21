// Generic React error boundary. Wrap around any optional feature that calls
// third-party code (Google Maps, html2canvas, etc.) so a runtime crash there
// doesn't white-screen the whole page. The surrounding UI keeps working and
// the user sees a concise fallback message.

import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', this.props.label || 'unknown', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold mb-1">
              {this.props.label || 'This section'} hit a problem.
            </div>
            <div className="text-amber-700 text-xs mb-2">
              {this.state.error.message || String(this.state.error)}
            </div>
            <button
              type="button"
              onClick={this.reset}
              className="text-xs font-semibold underline hover:text-amber-900"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
