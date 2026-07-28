import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleRestart = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F6F4EF',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E8E4DE',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '480px',
            textAlign: 'center',
          }}>
            <h1 style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#1C1814',
              margin: '0 0 8px',
            }}>
              出了点问题
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#7A7368',
              margin: '0 0 24px',
              lineHeight: 1.6,
            }}>
              应用遇到了意外错误。你可以尝试恢复，或重启应用。
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleRetry}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#4A6FA5',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                重试
              </button>
              <button
                onClick={this.handleRestart}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: '1px solid #E8E4DE',
                  background: '#fff',
                  color: '#1C1814',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                重启应用
              </button>
            </div>
            {this.state.error && (
              <details style={{
                marginTop: '20px',
                textAlign: 'left',
              }}>
                <summary style={{
                  fontSize: '12px',
                  color: '#7A7368',
                  cursor: 'pointer',
                }}>
                  错误详情
                </summary>
                <pre style={{
                  marginTop: '8px',
                  padding: '12px',
                  background: '#F6F4EF',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#C17A4E',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
