import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-danger mb-4" />
          <h2 className="text-base font-semibold text-text-primary mb-2">
            页面渲染出现错误
          </h2>
          <p className="text-sm text-text-secondary max-w-md">
            3D 渲染可能出现错误，请尝试：
          </p>
          <ul className="text-xs text-text-secondary mt-3 space-y-1">
            <li>• 刷新页面重新加载</li>
            <li>• 尝试使用其他格式的模型文件</li>
            <li>• 确认浏览器支持 WebGL</li>
          </ul>
          {this.state.error && (
            <p className="mt-4 text-xs text-text-tertiary font-mono">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 text-sm rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
