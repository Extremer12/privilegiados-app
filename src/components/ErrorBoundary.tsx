import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);

    // Auto-recover from stale chunks after a new Vercel deployment
    if (
      error?.message &&
      (error.message.includes("Failed to fetch dynamically imported module") ||
       error.message.includes("dynamically imported module"))
    ) {
      const hasReloaded = sessionStorage.getItem("chunk_reload_attempted");
      if (!hasReloaded) {
        sessionStorage.setItem("chunk_reload_attempted", "true");
        window.location.reload();
        return;
      }
    }
  }

  handleReload = () => {
    sessionStorage.removeItem("chunk_reload_attempted");
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/25">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white mb-2 tracking-tight">
                Algo salió mal
              </h1>
              <p className="text-slate-400 text-sm">
                Ocurrió un error inesperado. Intenta recargar la página.
              </p>
            </div>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold uppercase tracking-wider text-xs shadow-lg shadow-amber-500/20 transition-all duration-300 hover:scale-105"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar Página
            </button>
            {this.state.error && (
              <details className="text-left">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors">
                  Detalles técnicos
                </summary>
                <pre className="mt-2 p-3 rounded-xl bg-slate-900 text-xs text-red-400 overflow-auto max-h-32 border border-slate-800 font-mono">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
