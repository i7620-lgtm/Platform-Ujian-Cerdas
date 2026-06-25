import React, { Component, ErrorInfo, ReactNode } from "react";
export class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  public state: { hasError: boolean, error: Error | null } = { hasError: false, error: null };
  public static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error(error); }
  public render() {
    if (this.state.hasError) {
      return <div style={{padding: 20, color: 'red'}}>
        <h1>Runtime Error!</h1>
        <pre>{this.state.error?.toString()}</pre>
        <pre>{this.state.error?.stack}</pre>
      </div>;
    }
    return this.props.children;
  }
}
