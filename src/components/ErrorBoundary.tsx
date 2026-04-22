import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState;
  props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: any) {
    return {
      hasError: true,
      error: error?.message || 'An unknown error occurred',
    };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Error caught:', error, errorInfo);
  }

  handleReset = () => {
    (this as any).setState({ hasError: false, error: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#050a14] to-black">
          <div className="bg-white/10 backdrop-blur-lg border border-red-500/30 bg-red-500/5 max-w-md w-full p-8 space-y-6 text-center rounded-xl">
            <div className="flex justify-center">
              <div className="bg-red-500/20 p-4 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-500" strokeWidth={1.5} />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-red-500">Oops!</h1>
              <p className="text-white/60 text-sm">
                An unexpected error occurred. Please try restarting the application.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 text-black font-bold text-lg px-6 py-3 rounded-lg hover:bg-yellow-400 transition-all"
              >
                <RefreshCw size={18} strokeWidth={1.5} />
                Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
