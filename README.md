# Moth in the Machine

1947년 Harvard Mark II에서 발견된 실제 나방 버그를 모티브로 한 브라우저 기반 3D 캐주얼 게임입니다.

## 시작하기

요구 환경은 Node.js LTS 20.19 이상 25 미만과 pnpm 10 이상입니다. 저장소의 `.node-version`은 검증 런타임인 Node.js 24.14.0을 고정합니다.

```bash
pnpm install
pnpm dev
```

`http://localhost:5173`에서 M1 부팅 화면을 확인할 수 있습니다.

## 검증

```bash
pnpm verify
pnpm format:check
```

`verify`는 lint, TypeScript, 모듈 경계 계약, production build를 차례로 검사합니다.

## 구현 단계

개발은 [작업 하네스](docs/Moth%20in%20the%20Machine_하네스.md)의 M1 → M9 게이트 순서를 따릅니다. 현재 상태와 다음 작업은 [PROGRESS.md](PROGRESS.md)를 기준으로 인계합니다.

Three.js, React Three Fiber, Zustand는 각각 하네스가 지정한 M4와 M3 이전에는 도입하지 않습니다.
