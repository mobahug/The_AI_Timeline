import React from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { MONO, SERIF, ink, shell } from '../lib/styles';
import { Btn, Eyebrow } from './kit';

/* If a view throws, show the failure and a way back instead of a white page.
   The board threw once during development and took the whole app with it —
   nothing between it and the root was catching. */
export interface ErrorBoundaryProps { resetKey: string; children?: ReactNode }
interface ErrorBoundaryState { error: Error | null }

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface it where a developer will look, with the component stack.
    console.error('View failed to render:', error, info && info.componentStack);
  }

  override componentDidUpdate(prev: ErrorBoundaryProps) {
    // A navigation is a fresh attempt.
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  override render() {
    if (!this.state.error) return this.props.children;
    const message = (this.state.error && this.state.error.message) || String(this.state.error);
    return (
      <div role="alert" style={{ ...shell('read'), paddingTop: 30 }}>
        <Eyebrow tier="page" dim style={{ marginBottom: 16 }}>Something broke on this page</Eyebrow>
        <h1 tabIndex={-1} style={{ margin: 0, outline: 'none', font: '400 clamp(26px,4vw,40px)/1.1 ' + SERIF, letterSpacing: '-0.025em' }}>
          This view failed to render.
        </h1>
        <pre style={{ margin: '18px 0 0', font: '400 12px/1.6 ' + MONO, color: ink(4), whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message}</pre>
        <div style={{ display: 'flex', gap: 10, marginTop: 26, flexWrap: 'wrap' }}>
          {/* A plain full-load anchor on purpose: the router itself may be what threw. */}
          <Btn href={import.meta.env.BASE_URL} tone="loud">← Front page</Btn>
          <Btn onClick={() => window.location.reload()}>Reload</Btn>
        </div>
      </div>
    );
  }
}
