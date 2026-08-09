import styles from '@/App.module.scss';

const foundationChecks = [
  ['REACT CORE', 'ONLINE'],
  ['TYPE SYSTEM', 'ARMED'],
  ['RELAY MAP', 'STANDBY'],
] as const;

function App() {
  return (
    <main
      className={`${styles.screen} relative isolate flex min-h-dvh items-center justify-center p-5`}
    >
      <div className={styles.glow} aria-hidden="true" />
      <section
        className={`${styles.panel} w-full max-w-3xl overflow-hidden rounded-sm border border-brass/40 p-6 sm:p-10`}
        aria-labelledby="project-title"
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-amber/20 pb-4 font-mono text-[0.7rem] tracking-[0.16em] text-muted sm:text-xs">
          <span>HARVARD COMPUTATION LABORATORY</span>
          <span>MARK II · 1947</span>
        </header>

        <div className="mt-8 flex items-center gap-3 font-mono text-xs tracking-[0.2em] text-amber">
          <span className={styles.statusLight} aria-hidden="true" />
          <span>MACHINE STATUS · FOUNDATION ONLINE</span>
        </div>

        <h1
          id="project-title"
          className="mt-5 font-mono text-4xl font-bold uppercase leading-none tracking-[-0.05em] text-cream sm:text-6xl"
        >
          Moth <span className="text-amber">in the</span> Machine
        </h1>

        <p className="mt-5 max-w-xl font-sans text-sm leading-7 text-muted sm:text-base">
          최초의 컴퓨터 버그가 다시 움직이기 시작했습니다. 비행 시스템 연결을 위한 기반 회로가
          준비되었습니다.
        </p>

        <dl className="mt-9 grid gap-px border border-amber/15 bg-amber/15 sm:grid-cols-3">
          {foundationChecks.map(([label, value]) => (
            <div key={label} className="bg-panel/95 px-4 py-3">
              <dt className="font-sans text-[0.65rem] tracking-[0.14em] text-muted">{label}</dt>
              <dd className="mt-1 font-mono text-sm text-cream">{value}</dd>
            </div>
          ))}
        </dl>

        <footer className="mt-8 flex items-center justify-between gap-4 font-mono text-[0.65rem] tracking-[0.14em] text-muted">
          <span>M1 · RELAY BAY FOUNDATION</span>
          <span aria-label="System ready">● READY</span>
        </footer>
      </section>
    </main>
  );
}

export default App;
