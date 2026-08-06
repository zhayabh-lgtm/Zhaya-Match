import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AdminErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AdminErrorBoundary capturou um erro:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 bg-white border border-red-200 rounded-2xl shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-900">
            {this.props.fallbackTitle || 'Não foi possível carregar a visualização.'}
          </h2>
          <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
            Ocorreu um erro inesperado ao processar os dados desta seção. A navegação do painel permanece funcional.
          </p>
          {this.state.error?.message && (
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-left font-mono text-[11px] text-neutral-600 overflow-x-auto max-h-32">
              {this.state.error.message}
            </div>
          )}
          <div className="pt-2">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white font-medium text-xs rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar novamente</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}



