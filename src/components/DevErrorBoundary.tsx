'use client';
import { Component, type ReactNode } from 'react';
export class DevErrorBoundary extends Component<{children: ReactNode},{err?: Error}> {
  state = { err: undefined as Error | undefined };
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() {
    if (this.state.err) return (
      <div style={{padding:16, background:'#fee', color:'#900', fontFamily:'monospace', whiteSpace:'pre-wrap'}}>
        <b>Runtime Error</b>
        <div>{String(this.state.err.message)}</div>
        <div>{String(this.state.err.stack || '')}</div>
      </div>
    );
    return this.props.children;
  }
}
