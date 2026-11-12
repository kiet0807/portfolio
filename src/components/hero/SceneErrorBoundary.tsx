import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Called once when the 3D scene (or its chunk) fails. */
  onError: () => void;
}

interface State {
  failed: boolean;
}

/** Any WebGL / chunk-loading error ends here; the static backdrop stays visible. */
export class SceneErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(): void {
    this.props.onError();
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
