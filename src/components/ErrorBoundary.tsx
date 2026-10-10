import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', this.props.fallbackLabel, error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleResetData = () => {
    try {
      localStorage.removeItem('opd_store');
      localStorage.removeItem('opd_audit_log');
      localStorage.setItem('opd_store_version', '0'); // forces migration
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="card max-w-lg w-full p-8 text-center">
            <div className="w-14 h-14 bg-[#FCE6E3] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-[#C62F2F] w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-[#12324A] mb-2">
              {this.props.fallbackLabel || 'Something went wrong'}
            </h2>
            <p className="text-sm font-medium text-[#4A5B6B] mb-6">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={this.handleReset} className="btn-primary gap-2">
                <RefreshCw size={16} /> Try again
              </button>
              <button onClick={this.handleResetData} className="btn-secondary gap-2 text-[#C62F2F] border-[#C62F2F]/30">
                <Trash2 size={16} /> Reset demo data
              </button>
            </div>
            <p className="text-xs text-[#4A5B6B] mt-4 font-medium">
              "Reset demo data" clears visits and audit log only — user accounts are preserved.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
