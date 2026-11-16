import React, { Component, ErrorInfo, ReactNode } from "react";
import { ExclamationTriangleIcon, ArrowLeftIcon } from "./components/Icons";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Application ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReload = () => {
    try {
      window.location.reload();
    } catch {
      window.location.href = "/";
    }
  };

  private handleReturnHome = () => {
    try {
      this.setState({ hasError: false, error: null });
      const cleanPath = window.location.pathname || "/";
      window.location.assign(cleanPath);
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 transition-colors">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-6 sm:p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <ExclamationTriangleIcon className="w-7 h-7" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-3">
              <span>Gangguan Tampilan Sementara</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              Halaman Perlu Dimuat Ulang
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
              Terjadi kendala teknis saat menampilkan halaman. Silakan muat ulang halaman untuk melanjutkan aktivitas Anda dengan normal.
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 text-left mb-6">
              <p className="text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                Jika Anda sedang mengerjakan ujian, progres jawaban yang telah tersimpan secara lokal di perangkat Anda tetap aman dan akan dipulihkan kembali.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98] cursor-pointer"
              >
                Muat Ulang Halaman
              </button>
              <button
                type="button"
                onClick={this.handleReturnHome}
                className="flex-1 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 transition-all active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <ArrowLeftIcon className="w-4 h-4 shrink-0" />
                <span>Kembali ke Beranda</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
