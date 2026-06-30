"use client";
import { Component } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default class WidgetErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`Widget hatası [${this.props.widgetId || 'unknown'}]:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-3 p-4 text-center">
          <div className="p-3 bg-red-50 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Widget Hatası</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[200px] truncate">
              {this.state.error?.message || 'Beklenmeyen bir hata oluştu'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-halo-600 bg-halo-50 rounded-lg hover:bg-halo-100 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Tekrar Dene
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
