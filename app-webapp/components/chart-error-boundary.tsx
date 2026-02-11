"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Error already captured by getDerivedStateFromError; fallback UI is shown.
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50">
            <p className="text-sm text-gray-400">
              Impossible d&apos;afficher le graphique
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
