# Moth in the Machine — Claude Code 작업 하네스 (Harness)

**버전**: 0.1  
**작성일**: 2026년 8월 1일  
**관계 문서**: 루트 `CLAUDE.md`(전역 규칙·불변식), `PROGRESS.md`(상태 인계), `docs/` 하위 백서(기술 백서 v1.0, 디자인 백서 v1.0, 파일트리)

> 이 문서는 **"무엇을 만드는가"(백서)가 아니라 "어떻게 진행·검증·복구하는가"(운영 규율)** 를 정의한다. 각 phase의 "완료"는 코드가 도는 것이 아니라 **측정 가능한 게이트(DoD) 통과**다. 복잡한 시스템일수록 "에러 없이 도는데 기능은 사실상 안 됨"이 흔하므로, 게이트로 막지 않으면 잘못된 완료 판정이 다음 phase로 전파된다.

---

## 0. 사용법

### 0.1 세션 루프
1. **시작**: `PROGRESS.md` 읽기 → 현재 phase·다음 할 일·미결 질문 확인 → 본 문서의 해당 phase 절 + 관련 백서 절 확인.
2. **작업**: 한 번에 한 phase. 각 작업 단위마다 그 phase의 **검증 명령**을 돌려 게이트로 확인.
3. **종료**: `PROGRESS.md` 갱신(완료 체크·다음 할 일·새 미결 질문·결정 로그) → 커밋.

### 0.2 phase 완료 판정
- DoD 항목이 **전부** 충족되어야 완료. 하나라도 미달이면 미완료로 두고 다음 phase로 가지 않는다.
- 게이트를 못 넘는데 우회 충동이 들면 → §3 멈춤 규칙.

### 0.3 의존 순서
M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9.  
병렬 가능한 구간이 있어도 위 순서를 기본으로 한다. 각 phase의 "진입조건"이 선행 게이트를 명시한다.

### 0.4 `PROGRESS.md` 최소 구성
현재 phase / 직전에 끝낸 것 / 다음 할 일 / 미결 질문 / 결정 로그(날짜·결정·이유). 세션이 끊겨도 **이 파일만 읽으면 이어서 작업 가능**해야 한다.

---

## 1. Phase별 진입조건 · 할 일 · DoD · 검증

### M1 — 기반/스캐폴딩
- 진입조건: 없음 (최초 시작).
- 할 일: Vite + React 18 + TypeScript 프로젝트 생성 → Tailwind + CSS Variables 설정 → 기본 디렉터리 구조(src/components, store, hooks, utils, assets) 생성 → ESLint + Prettier + 경로 alias 설정.
- 참조: 기술 백서 §3, §6 / 디자인 백서 §5, §6
- DoD:
  1. `pnpm install && pnpm dev` 성공, http://localhost:5173 접속 시 빈 React 앱 렌더.
  2. `pnpm lint` + `pnpm typecheck` 그린.
  3. `src/` 하위 디렉터리 경계가 존재하고, 금지된 상호 import 시 lint 에러 발생.
- 검증: `pnpm lint && pnpm typecheck && pnpm build`
- 주의: Three.js 관련 패키지는 이 단계에서 설치하지 않는다.

### M2 — 핵심 도메인 로직 (순수 로직)
- 진입조건: M1 게이트 통과.
- 할 일: `utils/starCalculator.ts`, `utils/collision.ts`, `utils/health.ts` 작성 → 체력 감소·별 계산·착지 판정 순수 함수 구현 → 단위 테스트 작성.
- 참조: 기술 백서 §2.3, §4.3
- DoD:
  1. 단위 테스트 전부 그린 (`pnpm test`).
  2. 동일 입력 → 동일 출력 (결정론). 체력 100% → 별 3, ≥50% → 별 2, >0 → 별 1, 0 → 실패.
  3. 착지 거리 ≤ 0.5 && 속도 ≈ 0 일 때만 성공으로 판정하는 불변식 유지.
- 검증: `pnpm test -- --coverage` (커버리지 80% 이상)
- 주의: Three.js나 React에 의존하지 않는 순수 함수로만 작성.

### M3 — 상태 관리 & 영속화
- 진입조건: M2 게이트 통과.
- 할 일: Zustand store (`store/gameStore.ts`) 구현 → PlayerState, Stage Progress, Settings → LocalStorage 저장/복원 로직.
- 참조: 기술 백서 §4.1
- DoD:
  1. store 액션(updateHealth, land, saveProgress) 호출 시 상태가 정확히 변경.
  2. 페이지 새로고침 후 LocalStorage에서 진행 상황이 복원됨.
  3. 잘못된 JSON이 들어와도 앱이 크래시하지 않고 기본값으로 폴백.
- 검증: 브라우저 콘솔에서 store 액션 수동 호출 + LocalStorage 확인 + 새로고침 테스트.
- 주의: 서버 없이 클라이언트만 사용. 시크릿·민감 데이터 없음.

### M4 — 3D 기반 환경 (Three.js 씬)
- 진입조건: M3 게이트 통과.
- 할 일: `@react-three/fiber` + `@react-three/drei` 설치 → 기본 Canvas + 조명 + 안개 + 간단한 바닥/벽 배치 → 카메라 리그 기초.
- 참조: 기술 백서 §3.2, 디자인 백서 §5.1
- DoD:
  1. Canvas가 전체 화면을 채우고 60fps(데스크톱)로 렌더.
  2. 환경광 + 진공관 포인트 라이트가 디자인 토큰 색상(`#f0c14b` 등)을 따름.
  3. 브라우저 리사이즈 시 뷰포트가 깨지지 않음.
- 검증: `pnpm dev` 후 브라우저에서 씬 확인 + Performance 탭으로 fps 측정.
- 주의: 복잡한 모델(gltf)은 아직 넣지 않는다.  primitive만 사용.

### M5 — 플레이어 컨트롤 & 물리 ★
- 진입조건: M4 게이트 통과.
- 할 일: 나방 메시(간단한 geometry) + WASD/마우스 입력 훅 → 속도·관성 적용 → 카메라 추적 → 기본 충돌 박스.
- 참조: 기술 백서 §2.2, §4.2
- DoD:
  1. WASD로 전후좌우 이동, 마우스로 시야 회전이 부드럽게 동작.
  2. Space로 호버/착지 준비 상태가 전환됨.
  3. 나방이 바닥/벽을 뚫고 지나가지 않음 (간단한 AABB 충돌).
- 검증: 수동 시연 + 콘솔에 position/velocity 로그 출력으로 수치 확인.
- 주의: 본격 장애물 데미지는 M6에서 연결.

### M6 — 장애물·체력·스테이지 로직 ★
- 진입조건: M5 게이트 통과.
- 할 일: 전선·스파크·과열 릴레이·진공관 배치 → 충돌 시 체력 감소 연결 → 튜토리얼 1 + EASY/NORMAL/HARD 각 6의 총 19단계와 난이도별 회랑 정의 → 메인 난이도·개별 단계 선택 및 진행도 기반 해금 → 바닥·천장·좌우 벽 목표의 착지 성공/실패 판정 → NORMAL/HARD 최소 가시성 보강.
- 참조: 기술 백서 §2.3, §4.3, §4.4 / 디자인 백서 §2.2, §4.3
- DoD:
  1. 각 장애물 타입별 데미지량이 명세와 일치하고, 구조물·장애물이 난이도별 경로 선택을 실제로 강제한다.
  2. 체력 0 시 즉시 실패 처리, 착지 성공 시 별 계산이 M2 로직과 일치한다.
  3. 목표 면 swept contact를 구조물 충돌·bounce보다 먼저 판정하며, 최초 terminal 결과는 비가역 latch되어 성공 뒤 실패로 뒤집히지 않는다.
  4. 메인에서 TUTORIAL·EASY·NORMAL·HARD 난이도와 열린 난이도의 개별 단계를 선택한다. TUTORIAL은 항상, EASY는 튜토리얼 클리어 후, NORMAL은 서로 다른 EASY 3단계 이상 클리어 후, HARD는 서로 다른 NORMAL 3단계 이상 클리어 후에만 플레이할 수 있다.
  5. clear/fail 때 중앙 결과 안내가 상태와 Enter 단계 목록 복귀·R 현재 단계 재시작을 표시한다. terminal 진입 즉시 Canvas pointer lock을 해제해 커서를 복원하며 전역 순차 진행을 강제하지 않는다. 새 단계 시작 시 나방 위치·체력·타이머가 정확히 리셋되고, 나방·장애물 primitive 모델이 역할과 실루엣을 구분할 수 있다.
  6. 플레이는 기본 3인칭 추적 시점으로 시작하며 T 입력으로 1인칭·3인칭을 안정적으로 토글한다.
  7. relay-bay는 튜토리얼·EASY, switching-gallery는 NORMAL, logic-labyrinth는 HARD에 사용한다. NORMAL/HARD는 그림자 없는 은은한 분산 보조 조명으로 완전 암부를 제거하면서 기존 성능 예산을 유지한다.
- 검증: 단위 테스트(해금 경계·중복 클리어·영속 진행도·충돌·데미지·다중 표면 착지·terminal latch) + 수동 플레이로 난이도/개별 단계 선택, 잠금 전환, 기본 3인칭·T 시점 전환, clear/fail 중앙 결과 안내와 즉시 pointer lock 해제·커서 복원, Enter 단계 목록 복귀·R 재시작, 4개 목표 표면, NORMAL/HARD 가시성, 회랑별 경로·성능 확인.
- 주의: "돌지만 효과 없음"을 막기 위해 체력 바와 실제 health 값이 항상 동기화되어야 한다. 자동 테스트만으로 M6 완료 처리하지 않고 수동 브라우저 게이트 뒤 커밋·푸시한다.

### M7 — HUD & UI 컴포넌트
- 진입조건: M6 게이트 통과.
- 할 일: HealthBar, Timer, Minimap, StarDisplay, DamageOverlay, 일시정지 모달, 스테이지 선택 화면 구현 → Drei `<Html fullscreen>` HUD 계층과 디자인 토큰 적용.
- 참조: 디자인 백서 §2, §5 / 기술 백서 §5
- DoD:
  1. 모든 UI가 1947년 디자인 토큰(색상·폰트·베이클라이트/금속 질감)을 준수.
  2. store health 변화가 숫자 HP·semantic meter·10개 세그먼트에 실시간 반영되고, health 감소에만 화면 가장자리 붉은 오버레이와 바 shake가 동작한다.
  3. 좌측 stage·중앙 health·우측 timer 헤더, live/terminal 별점, 플레이어→목표 방향·표면·고도를 나타내는 미니맵이 단일 store 값과 일치한다.
  4. P·Escape·문서 비가시화·획득 후 pointer lock 상실이 물리·타이머·피해를 함께 일시정지한다. Continue·Restart·Return이 각각 포인터 잠금/재개·동일 stage 초기화·stage 목록/커서 복귀 계약을 지킨다.
  5. Modal이 Portal·dialog semantics·초기 focus·Tab/Shift+Tab focus trap·focus 복귀를 제공하고, 비대화형 HUD는 Canvas 입력을 차단하지 않는다.
  6. 320px·768px·desktop에서 가로 스크롤 없음, 키보드 focus-visible, `showControlHints`, `prefers-reduced-motion`, `forced-colors` 계약을 통과한다.
  7. GameHud root와 DamageOverlay는 Drei Html의 transformed outer wrapper가 만든 0×0 containing block에 의존하지 않고 `position: absolute` full surface를 유지하며, Html anchor는 camera-forward 위치에서 behind-camera 숨김을 방지한다.
  8. M6 clear/fail 중앙 결과 안내와 Enter 단계 목록 복귀·R 재시작은 M8 전까지 유지된다.
- 검증: 단위/계약 테스트 + 브라우저에서 체력·데미지·타이머·미니맵·별점·일시정지/재개를 수동 시연 + 320/768/desktop 리사이즈·포인터 잠금·focus 순서 확인 + Lighthouse 접근성 점수 확인 + 디자인 백서 색상 대조.
- 주의: 3D 위 Html 오버레이는 drei의 `<Html>` 사용. 자동검증·메뉴 Lighthouse와 별도로 수동 브라우저 실플레이에서 인게임 HUD 가시성을 확인해야 완료 처리한다.
- 회귀 수정(2026-08-13): 사용자 실플레이에서 transformed 0×0 Html wrapper 아래 fixed HUD가 붕괴·clip되는 문제를 확인해 absolute full surface와 camera-forward anchor로 수정했다.
- 자동검증 결과(2026-08-13): lint·TypeScript·import boundary, Vitest 25 files / 402 tests 통과. StageEnvironment.hud·HudVisibility·DamageOverlay 계약 포함. V8 overall coverage statements 98.97% / branches 97.32% / functions 99.02% / lines 98.94%.
- production build 결과: Vite 111 modules, 초기 index 169.55 kB(55.54 kB gzip), lazy SceneCanvas 895.53 kB(244.14 kB gzip). 기존 500 kB 초과 warning만 유지.
- Lighthouse 결과(2026-08-13): 13.4.1 메뉴 화면 accessibility 100, binary failure 0. 메뉴 감사이므로 인게임 HUD 실제 가시성의 증거가 아니다.
- 수동 재검수 결과(2026-08-14): 실제 플레이에서 stage·health·timer·minimap UI와 피격 오버레이 정상 표시, 0×0 HUD 회귀 수정 유효성 확인.
- 현재 진행 메모(2026-08-14): M7 DoD 완료. 사용자가 커밋·푸시를 승인했다.

### M8 — 결과 화면 & 공유 이미지 ★
- 진입조건: M7 게이트 통과.
- 할 일: 결과 모달 구현 → Canvas API로 1080×1080 로그북 스타일 공유 이미지 생성 → 다운로드/클립보드 복사 기능.
- 참조: 기술 백서 §2.4, §4.3 / 디자인 백서 §4.3
- DoD:
  1. 클리어 시 별·시간·체력이 정확히 표시되고, 공유 이미지에 동일 정보가 렌더됨.
  2. 생성된 PNG가 1080×1080이며, 크림 종이 + 타이프라이터 폰트 + 나방 테이프 일러스트가 포함.
  3. 클립보드 복사와 파일 다운로드가 모두 성공.
- 검증: 실제 클리어 후 이미지 생성 → 다운로드 파일 크기·해상도 확인 + 시각적 검수.
- 주의: OffscreenCanvas 가능 시 사용, 아니면 메인 스레드에서 빠르게 생성 후 revokeObjectURL.

### M9 — 통합·폴리시·배포
- 진입조건: M8 게이트 통과.
- 할 일: 전체 플로우 통합 테스트 → 사운드(선택) → 저사양 옵션 → 빌드 최적화 → GitHub Pages 또는 Cloudflare Pages 배포.
- 참조: 기술 백서 §7 / 디자인 백서 §7
- DoD:
  1. `pnpm build` 성공 + preview에서 전체 스테이지 클리어 가능.
  2. LCP 3초 이내, 데스크톱 60fps 유지 (저사양 모드 시 30fps 이상).
  3. 배포 URL에서 새로고침 없이 즉시 플레이 가능 + 공유 이미지 정상 동작.
- 검증: `pnpm build && pnpm preview` + Lighthouse + 실제 배포 URL 수동 테스트.
- 주의: 시크릿·대용량 바이너리 커밋 금지. 환경변수는 빌드 타임에만 사용.

---

## 2. 런북 (증상 → 원인 → 조치)

| # | 증상 | 흔한 원인 | 조치 |
|---|---|---|---|
| 1 | 환경/의존성 설치 실패 | 버전 불일치, 락파일 깨짐 | `pnpm install` 재실행, node 버전 고정, 락파일 재생성 |
| 2 | 빌드/타입체크 실패 | 타입 불일치, Three.js 타입 누락 | `@types/three` 확인, 에러 위치부터 수정 |
| 3 | 테스트 불안정(flaky) | 시간·랜덤 요소 | 시드 고정, 순수 함수만 테스트 |
| 4 | 정합성(parity) 실패 | 도메인 로직과 UI/3D 값이 어긋남 | starCalculator·health 값을 단일 소스(store)에서만 읽도록 정렬 |
| 5 | "돌지만 효과 없음" (핵심 기능) | 체력/착지 신호가 전달되지 않음 | store 구독 확인, 초소형 케이스(체력 100→착지)로 로직 검증 |
| 6 | 수치 발산/폭주(NaN) | 속도·위치 누적 오차 | 클리핑·정규화 추가, deltaTime 고정 |
| 7 | 처리 느림 / fps 저하 | 과도한 충돌 검사, 그림자 | Spatial 컬링, 저사양 모드에서 그림자 끄기 |
| 8 | 경계 위반 lint 에러 | components ↔ store 직접 순환 import | 공유는 hooks/utils만 통해서 |
| 9 | 공유 이미지 깨짐 | Canvas 타이밍·폰트 로딩 | 폰트 로드 완료 후 드로잉, 타임아웃 폴백 |
| 10 | 환경별 동작 차이(로컬↔배포) | 경로·base URL 차이 | vite.config base 설정 일치 |
| 11 | 모바일 터치 충돌 | 조이스틱과 카메라 드래그 충돌 | pointer-events 분리, 터치 영역 명확히 구분 |
| 12 | 3D 로딩 실패 | gltf/텍스처 경로 오류 | assets 경로 절대 경로로 통일, fallback geometry 제공 |

---

## 3. 멈춤 규칙 (STOP)

### 3.1 멈춰야 하는 상황
- 같은 에러/테스트 실패를 **서로 다른 방법으로 3회** 시도해도 미해결.
- DoD 게이트(특히 불변식·핵심 기능 실효·정합성)를 못 넘는데 우회 충동.
- 불변식(루트 `CLAUDE.md`)을 깨야만 통과 가능.
- 큰 아키텍처 변경이 필요해 보임 (예: 상태관리 라이브러리 교체).
- 외부 제약(필요 자원 없음, 브라우저 API 지원 불가 등).

### 3.2 멈출 때 절차
1. `PROGRESS.md`에 기록: **증상 / 재현 방법 / 시도한 것들 / 가설 / 막힌 지점**.
2. 사용자에게 위 요약을 보고하고, 선택지가 있으면 제시한 뒤 결정을 요청한다.
3. 결정 전까지 **불변식을 깨는 임시 우회를 만들지 않는다.**

### 3.3 절대 금지
- 테스트 삭제·약화 또는 게이트 수치 임의 하향으로 "통과" 위장.
- 정합성·불변식이 깨진 채 다음 phase 진행.
- 아키텍처·패키지 경계 임의 변경(사용자 승인 없이).
- 시크릿(`.env`)·대용량 산출물(모델 원본·바이너리 등) 커밋.
- 가드레일 약화(정책 위반·과도 요청·과한 권한).

---

## 4. 검증 우선순위 (한 줄 요약)
불변식/규칙 정확성 > 핵심 기능 실효 (착지·체력·별) > 통합 정합성 > UX/배포.  
앞 단계의 게이트가 깨지면 뒤 단계 작업은 의미가 없으므로, 항상 앞에서부터 굳힌다.