import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';

import styles from '@/App.module.scss';
import type { SceneAvailability } from '@/components/three/SceneCanvas';

const SceneCanvas = lazy(() => import('@/components/three/SceneCanvas'));

const environmentChecks = [
  ['FLIGHT INPUT', 'ONLINE'],
  ['INERTIA MODEL', 'STABLE'],
  ['COLLISION AABB', 'ARMED'],
] as const;

type SceneStatus = 'loading' | SceneAvailability;

interface SceneErrorBoundaryProps {
  readonly children: ReactNode;
  readonly onError: () => void;
}

interface SceneErrorBoundaryState {
  readonly hasError: boolean;
}

class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  state: SceneErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    console.error('The M5 flight scene failed to render.', error, errorInfo.componentStack);
    this.props.onError();
  }

  render(): ReactNode {
    return this.state.hasError ? <SceneFailure /> : this.props.children;
  }
}

function SceneLoading() {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.loadingLight} aria-hidden="true" />
      INITIALIZING RELAY BAY
    </div>
  );
}

function SceneFailure() {
  return (
    <div className={styles.failure} role="alert">
      <div>
        <span>RELAY BAY · FAULT</span>
        <strong>3D 환경을 불러오지 못했습니다.</strong>
        <p>페이지를 새로고침하거나 최신 브라우저에서 다시 시도해 주세요.</p>
      </div>
    </div>
  );
}

function App() {
  const [sceneStatus, setSceneStatus] = useState<SceneStatus>('loading');
  const markSceneUnavailable = useCallback(() => setSceneStatus('unavailable'), []);
  const sceneReady = sceneStatus === 'ready';

  return (
    <main className={styles.screen}>
      <SceneErrorBoundary onError={markSceneUnavailable}>
        <Suspense fallback={<SceneLoading />}>
          <SceneCanvas onAvailabilityChange={setSceneStatus} />
        </Suspense>
      </SceneErrorBoundary>

      <div className={styles.vignette} aria-hidden="true" />

      <section className={styles.readout} aria-labelledby="project-title">
        <p className={styles.eyebrow}>HARVARD COMPUTATION LABORATORY · MARK II · 1947</p>
        <h1 id="project-title" className={styles.title}>
          Moth <span>in the</span> Machine
        </h1>
        <p className={styles.summary}>
          {sceneReady
            ? '비행 제어 온라인. 화면을 클릭한 뒤 나방을 릴레이 회랑 안에서 조종하세요.'
            : '비행 시스템을 동기화하고 있습니다. 3D 렌더러를 준비하는 중입니다.'}
        </p>

        <dl className={styles.systems}>
          {environmentChecks.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{sceneReady ? value : 'SYNCING'}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className={styles.footer}>
        <span>CLICK · WASD / ARROWS + MOUSE · SPACE MODE</span>
        <span className={sceneReady ? styles.ready : styles.pending}>
          <span aria-hidden="true">{sceneReady ? '●' : '○'}</span>{' '}
          {sceneReady ? 'M5 · FLIGHT SYSTEMS ONLINE' : 'FLIGHT SYSTEMS SYNCING'}
        </span>
      </footer>
    </main>
  );
}

export default App;
