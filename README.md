# Moth in the Machine

1947년 Harvard Mark II에서 발견된 실제 나방 버그를 모티브로 한 브라우저 기반 3D 캐주얼 게임입니다.

## 시작하기

요구 환경은 Node.js LTS 20.19 이상 25 미만과 pnpm 10 이상입니다. 저장소의 `.node-version`은 검증 런타임인 Node.js 24.14.0을 고정합니다.

```bash
pnpm install
pnpm dev
```

`http://localhost:5173`에서 현재 개발 빌드를 확인할 수 있습니다.

## 검증

```bash
pnpm test -- --coverage
pnpm verify
pnpm format:check
```

`verify`는 lint, TypeScript, 모듈 경계 계약, 80% per-file 테스트 커버리지, production build를 차례로 검사합니다.

## 구현 단계

개발은 [작업 하네스](docs/Moth%20in%20the%20Machine_하네스.md)의 M1 → M9 게이트 순서를 따릅니다. 현재 상태와 다음 작업은 [PROGRESS.md](PROGRESS.md)를 기준으로 인계합니다.
M1 기반, M2 핵심 도메인 로직, M3 상태 관리·영속화가 완료되었습니다. 다음 진입 단계는 M4 3D 렌더링 기반입니다.

M3는 Zustand 5.0.14를 사용합니다. 진행도와 설정은 `mothProgress` schema v1으로 저장하고, player·timer·result 같은 세션 상태는 새로고침 때 초기화합니다. Three.js와 React Three Fiber는 M4에서 도입합니다.
