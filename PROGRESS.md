# Moth in the Machine 진행 상황

## 현재 phase

M5 — 플레이어 컨트롤·물리 (완료)

## 직전에 끝낸 것

- M1 기반, M2 핵심 도메인 로직, M3 상태 관리·영속화 완료 및 원격 저장소 푸시
- Three.js 0.170.0, React Three Fiber 8.18.0, Drei 9.122.0 호환 조합 고정
- 하나의 lazy-loaded 전체 화면 Canvas와 ACES/SRGB 렌더러, WebGL fallback·오류 경계 구현
- primitive만 사용한 Mark II 릴레이 회랑, 금속 바닥·벽·황동 레일·진공관 환경 구현
- 캐비닛 10개, 릴레이 본체·접점 각 300개, 레일 20개를 instanced mesh로 구성
- #f0c14b 호박색 진공관 포인트 라이트, 크림색 환경광, 안개를 디자인 토큰에 연결
- 가로 회랑 뷰와 세로 릴레이 랙 뷰를 전환하는 aspect-aware 카메라 리그 구현
- 2.5초 FPS 표본을 DPR 1.0–1.5에 직접 연결한 적응형 성능 제어 구현
- 3D 청크 로딩 전에도 프로젝트 제목이 초기 HTML에 남도록 LCP 안전 로딩 구조 구현
- 초기 HTML, Canvas props, WebGL fallback/ready, DPR 상한을 검증하는 SSR 계약 테스트 추가
- 사용자 브라우저에서 3D 씬, 콘솔 오류 없음, 50–60fps 유지, 전체 화면 리사이즈 정상 확인
- 설명문 readout을 27rem에서 29rem으로 넓혀 마지막 글자만 고립되던 줄바꿈 수정
- M4 완료 커밋을 원격 브랜치에 푸시하고 Draft PR #1을 M1–M4 범위로 갱신
- primitive만 사용한 유기적 나방 메시와 delta 기반 날개·bank·착륙 준비 자세 구현
- Canvas 포인터 잠금, WASD·화살표, 마우스 yaw/pitch, Space edge 토글 입력 훅 구현
- 1/120초 fixed-step, 프레임 delta 0.1초·8 substep 상한의 3D 속도·관성 물리 구현
- hover는 마우스 pitch를 따르는 자유 비행, landing-ready는 제어 하강으로 분리
- 보이는 회랑 AABB를 나방 반크기만큼 inset한 바닥·천장·좌우·전후 충돌과 sliding 구현
- 정적 M4 카메라를 delta-damped 비롤링 추적 카메라로 교체
- 포인터 잠금 중 0.75초 간격으로 유한한 position·velocity·mode 개발 로그 출력
- 입력·물리·Canvas 계약 186개 테스트와 production build 통과
- 사용자 브라우저에서 포인터 잠금, 키보드·마우스 비행, Space 모드, 충돌, 유한 로그, 성능·리사이즈 확인

## 다음 할 일

1. M6 — 스테이지·장애물·데미지 범위 감사
2. 최초 3개 스테이지 좌표·장애물·목표 구성 확정
3. 목표 착지 판정과 HP 감소를 기존 M2/M3 도메인·store에 연결

## 검증 결과

- Node.js 24.14.0 / pnpm 11.16.0 고정 런타임 확인
- pnpm install --frozen-lockfile: 통과
- pnpm verify: 통과
  - ESLint: 0 errors / 0 warnings
  - TypeScript: 통과
  - 모듈 경계 계약: 통과
  - Vitest: 11 files / 186 tests 통과
  - V8 coverage: statements 99.30%, branches 98.80%, functions 98.97%, lines 99.28%
  - SceneCanvas.tsx per-file: statements 93.33%, branches 100%, functions 83.33%, lines 93.33%
  - Vite production build: 통과
- pnpm format:check: 통과
- git diff --check: 통과
- Three.js 0.170.0 및 @types/three 0.170.0 단일 버전 확인
- 소스 계약: Canvas 1개, glTF·텍스처 로더·포스트프로세싱·그림자 활성화 없음
- production JS: 초기 청크 154.46 kB(50.55 kB gzip), lazy SceneCanvas 842.57 kB(227.17 kB gzip)
- pnpm dev: Vite 6.4.3 부팅, localhost HTTP 200 및 HMR 성공
- 실제 WebGL 씬·콘솔·Performance·리사이즈 수동 검수: 사용자 확인으로 통과
  - 3D 릴레이 회랑 정상 표시
  - 콘솔 오류 없음
  - 화면 크기 변경 중 50–60fps 유지
  - 리사이즈 정상
- M5 실제 조작·시각 수동 검수: 사용자 확인으로 통과
  - 포인터 잠금과 WASD·화살표 이동·관성 정상
  - 마우스 yaw/pitch와 추적 카메라 정상
  - Space hover ↔ landing-ready 제어 하강 정상
  - 바닥·좌우 벽·회랑 끝 AABB 관통 없음
  - `[M5 flight]` position·velocity 유한값, 콘솔 오류·FPS 저하·리사이즈 문제 없음

## 현재 제약

- 500 kB 초과 lazy SceneCanvas 경고는 M4 기준선에서 이어 기록하고 M9 LCP/번들 최적화 게이트에서 재검토

## 미결 질문

- M6: 스파크/전선의 15~25 데미지는 프레임당, 초당, 접촉 이벤트 중 무엇인가?
- M6: 범위 데미지를 결정론적으로 선택하는 규칙은 무엇인가?
- M6: 최초 3개 스테이지의 이름, 좌표, 장애물 구성, 해금 규칙은 무엇인가?
- M6: landing-ready 바닥 접촉 뒤 목표 거리·속도 판정과 terminal land 전이의 정확한 순서는 무엇인가?

## 결정 로그

| 날짜       | 결정                                                                   | 이유                                                                         |
| ---------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 2026-08-09 | 첫 구현 범위를 M1로 제한                                               | 하네스가 phase 순서와 선행 DoD 통과를 필수로 규정                            |
| 2026-08-09 | React 18을 명시적으로 고정하고 Three.js/Zustand는 설치하지 않음        | 기술 백서 스택과 M1 주의사항 준수                                            |
| 2026-08-09 | UI의 store 직접 import를 lint로 금지                                   | HUD와 도메인의 단일 소스 정합성 및 순환 의존 방지                            |
| 2026-08-09 | 폰트 토큰은 typewriter → 한글 UI fallback 순서로 병합                  | 디자인 백서의 시대감과 기술 백서의 한글 가독성 요구를 함께 만족              |
| 2026-08-09 | Node 24.14.0을 검증 런타임으로 고정                                    | 전역 Node 25.2.0의 Windows 설치·빌드 프로세스 비결정 종료 회피               |
| 2026-08-09 | 사용자 콘솔 시각 검수 확인으로 M1 게이트 완료                          | M1 수동 브라우저 렌더·반응형 검증 완료                                       |
| 2026-08-09 | 착지 정지 임계값을 전체 3D 속도 ≤ 0.1 unit/s로 고정                    | 하네스의 “속도 ≈ 0”을 명시적이고 축 독립적인 불변식으로 변환                 |
| 2026-08-09 | 충돌 접촉은 포함하고 모든 도메인 숫자 입력은 유한값만 허용             | 접촉 누락과 NaN/Infinity 전파를 방지해 결정론 유지                           |
| 2026-08-09 | Vitest 4.1.10과 V8 per-file 80% 게이트를 M2 검증에 고정                | 하네스 명령에서도 테스트 누락이나 합산 커버리지 은폐를 방지                  |
| 2026-08-09 | 정수 HP 경계에서 1e-9 이하 부동소수점 노이즈를 정규화                  | 30/60/120fps 누적 데미지가 50·0 경계와 별점·실패 결과를 바꾸지 않도록 보장   |
| 2026-08-09 | Zustand 5.0.14 vanilla store와 얇은 React hook을 M3 경계로 채택        | React 밖에서도 결정론적으로 테스트하고 UI의 단일 selector 진입점을 유지      |
| 2026-08-09 | mothProgress schema v1에는 Progress와 Settings만 저장                  | player, timer, result, Date 같은 세션 데이터를 새로고침 뒤 안전하게 초기화   |
| 2026-08-09 | 스테이지 기록은 최단 시간과 최고 별점을 독립 병합하고 총 별은 파생     | 재도전 결과가 기존 최고 기록을 퇴행시키거나 합계를 오염시키지 않도록 보장    |
| 2026-08-09 | 부분 손상 레코드는 복구하되 미래 버전은 저장 직전에도 재확인하여 보호  | 사용 가능한 진행도는 살리고 다른 탭·새 버전의 데이터를 덮어쓰지 않음         |
| 2026-08-09 | cleared/failed 뒤에는 startStage 전까지 transient 상태를 불변으로 유지 | 늦게 도착한 프레임·충돌 콜백이 결과를 뒤집거나 실패 세션을 부활시키지 않음   |
| 2026-08-11 | 사용자 브라우저·콘솔 검수 확인으로 M3 게이트 완료                      | LocalStorage 저장·새로고침 복원·손상 데이터 fallback의 수동 DoD 충족         |
| 2026-08-11 | Three 0.170.0 / Fiber 8.18.0 / Drei 9.122.0을 정확히 고정              | React 18과 기술 백서 r170+/Fiber 8 요구를 충족하고 중복 Three를 방지         |
| 2026-08-11 | M4 씬은 하나의 lazy Canvas와 primitive·instancing만 사용               | 초기 HTML LCP를 지키면서 glTF 없이 회랑 밀도와 데스크톱 성능을 확보          |
| 2026-08-11 | Drei PerformanceMonitor를 숫자 DPR 상태 1.0–1.5에 직접 연결            | AdaptiveDpr 단독 사용의 무효 경로와 리사이즈 시 DPR 되돌림을 방지            |
| 2026-08-11 | 핵심 Canvas 경계는 SSR 계약 테스트, 실제 WebGL·FPS는 브라우저로 분리   | 단위 테스트 수치를 과장하지 않고 플랫폼 경계를 실제 환경에서 검증            |
| 2026-08-11 | 사용자 브라우저 검수로 M4 게이트 완료                                  | 3D 표시·콘솔·50–60fps·리사이즈 DoD를 실제 환경에서 충족                      |
| 2026-08-11 | readout과 설명문 폭을 29rem으로 확장                                   | 마지막 글자 고립 줄바꿈을 제거하면서 모바일 숨김과 상태 패널 구도를 유지     |
| 2026-08-11 | Space는 로컬 hover ↔ landing-ready edge 토글로 고정                    | M5 준비 자세·제어 하강을 M6 terminal isLanded·성공 판정과 분리               |
| 2026-08-11 | 프레임 물리는 로컬 ref와 1/120초 fixed-step으로 유지                   | React/store 60fps 갱신 없이 delta 독립 관성·카메라와 유한값 불변식 보장      |
| 2026-08-11 | 회랑 interior AABB를 나방 half-extents만큼 inset                       | 보이는 바닥·벽과 collider 중심 한계를 단일 설정에서 일치                     |
| 2026-08-11 | M5 store stage 생명주기는 시작하지 않음                                | M6의 stage·target·terminal landing 범위를 선점하지 않고 샌드박스 물리만 검증 |
| 2026-08-11 | 사용자 브라우저 검수로 M5 게이트 완료                                  | 입력·관성·카메라·모드·충돌·유한 로그·성능·리사이즈 DoD를 실제 환경에서 충족  |
