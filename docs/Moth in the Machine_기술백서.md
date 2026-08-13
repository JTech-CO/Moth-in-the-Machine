# Moth in the Machine 기술 백서 (Technical Whitepaper)

**버전**: 1.1\
**작성일**: 2026년 7월 31일  
**개정일**: 2026년 8월 14일\
**참고 문서**: 기획서 v1.0, UI/UX 레이아웃 문서 v1.0

## 1. 프로젝트 개요 (Project Overview)
### 1.1. 프로젝트 명
**Moth in the Machine** (부제: 마크 II의 나방)

### 1.2. 목적 (Purpose)
*1947년 하버드 Mark II 컴퓨터에서 실제로 발견된 ‘나방 버그’를 모티브로 한 웹 기반 3D 캐주얼 게임을 개발한다.*
- 플레이어가 나방이 되어 3D 공간 내 Mark II 컴퓨터 내부를 자유롭게 비행하며, 각 스테이지의 지정된 릴레이/목표 지점에 정확히 착지하는 것을 목표로 한다.
- 체력 관리, 장애물 회피, 시간 경쟁 요소를 결합하여 Wordle처럼 간단하면서도 중독성 있는 클리어·공유 경험을 제공한다.
- 순수 웹 기술만으로 설치 없이 브라우저에서 즉시 플레이 가능하도록 하여, SNS 바이럴을 극대화한다.

### 1.3. 핵심 차별점 (Key Differentiators)
1.  **역사적 몰입감 (Historical Immersion)**: 실제 Mark II 컴퓨터의 릴레이, 진공관, 전선, 스파크를 3D로 재현하여 ‘최초의 컴퓨터 버그’를 체험형 게임으로 승화.
2.  **경량 3D + 공유 최적화 (Lightweight 3D & Share-First)**: Three.js 기반 경량 렌더링과 Canvas API를 활용한 Wordle 스타일 결과 이미지 생성으로, 별 개수·소요 시간을 즉시 SNS에 공유 가능.
3.  **체력 기반 별점 시스템 (Health-Driven Star Rating)**: 단순 클리어가 아닌 체력 잔량(50%/100%)에 따른 3단계 별점 구조로 재도전 동기와 완성도를 동시에 확보.

## 2. 상세 기능 요구사항 (Detailed Requirements)

### 2.1. 시스템 환경 및 인터페이스 (System & Interface)
- **뷰 모드 (View Mode)**: Desktop First + Fluid Layout (최소 지원 해상도 1280×720, 모바일은 가상 조이스틱 + 터치 카메라 지원)
- **테마 정책 (Theme Policy)**: CSS Variables 기반 다크 테마 고정 (컴퓨터 내부 분위기 유지). 라이트 모드 미지원.

### 2.2. 사용자 상호작용 로직 (Interaction Logic)
- **이벤트 처리 (Event Handling)**:
  - **Input**: Keyboard (WASD/화살표 + Space, T 시점 전환), Mouse (시야 회전), Touch (가상 조이스틱 + 드래그)
  - **Action**: 바닥·천장·좌우 벽의 목표 면에 착지 시 자동 판정 → 체력/시간 계산 → 정식 Portal 결과 모달. terminal 진입 즉시 Canvas pointer lock을 해제하고 커서를 복원하며, 결과 모달이 Enter의 선택 난이도 단계 목록 복귀와 R의 현재 단계 재시작을 소유한다. 장애물 충돌 시 실시간 체력 감소 + 비주얼 피드백(화면 가장자리 붉은 오버레이)
- **데이터 검증 (Validation)**: 클라이언트 사이드에서 체력 0 이하, 목표 면의 접선 방향 반경(0.5 unit), 안쪽 법선 방향 접근과 swept contact를 검증. 서버 검증 불필요(오프라인 우선).

### 2.3. 데이터 모델 (Data Model)
주요 모듈에서 다루는 데이터 객체(Entity)의 스키마를 정의합니다.
1.  **Stage**: id(Number 1~19), name(String), difficulty(tutorial | easy | normal | hard), environment(relay-bay | switching-gallery | logic-labyrinth), target({position, surface, inwardNormal}), obstacles(Array), bestTime(Number), bestStars(Number 0~3)
2.  **PlayerState**: health(Number 0~100), position({x,y,z}), velocity({x,y,z}), isLanded(Boolean)
3.  **Result**: stageId(Number), time(Number), remainingHealth(Number), stars(Number), timestamp(Date)
4.  **Progress**: completedStages(Array<Stage>), totalStars(Number) → LocalStorage에 직렬화 저장
5.  **Campaign**: 조작 튜토리얼 1개 + EASY 6개 + NORMAL 6개 + HARD 6개 = 총 19단계. ID는 데이터 카탈로그의 안정적인 정렬·참조 키이며, 런타임은 전역 순차 진행 대신 난이도 선택 → 해당 난이도의 개별 단계 선택 흐름을 사용한다.

### 2.4. 출력 및 성능 기준 (Output & Performance)
- **결과물 형식**: Canvas 기반 PNG Blob (1080×1080 정사각 공유 이미지), LocalStorage 저장, 클립보드 복사
- **품질 기준 (QA Standards)**:
  - 초기 로딩 시간(LCP): 3초 이내 (3D 에셋 압축 + Lazy Loading)
  - 프레임레이트: 데스크톱 60fps 유지, 모바일 30fps 이상
  - 브라우저 호환성: Chrome, Safari, Edge, Firefox 최신 2개 버전 (IE 미지원)

## 3. 기술 스택 및 라이브러리 (Tech Stack)

### 3.1. Core
- **Frontend**: React 18 + TypeScript 5.x + Vite
- **3D Engine**: Three.js (r170+)
- **Backend**: 없음 (순수 클라이언트 사이드). 향후 리더보드 필요 시 Cloudflare Workers 검토
- **Database**: LocalStorage (진행 상황 영속화)

### 3.2. Libraries & Tools
1.  **@react-three/fiber** (필수)
    - **버전**: 8.x
    - **용도**: React 선언형 Three.js 렌더링
    - **설정 값**: canvas 크기 100vw/100vh, antialias true, powerPreference high-performance
2.  **@react-three/drei** (필수)
    - **용도**: OrbitControls 대체 커스텀 카메라, Html 오버레이, useTexture, Sparkles 등 이펙트
3.  **zustand** (필수)
    - **용도**: 전역 상태 관리 (PlayerState, Stage Progress, Settings)
4.  **html2canvas** 또는 **Canvas API 직접 구현** (필수)
    - **용도**: 결과 화면을 1080×1080 PNG로 렌더링하여 공유
5.  **howler.js** (선택)
    - **용도**: 날개짓, 스파크, 릴레이 클릭, 클리어 사운드 관리

## 4. 아키텍처 및 로직 (Architecture & Logic)

### 4.1. 상태 관리 전략 (State Management)
애플리케이션의 데이터 흐름과 상태 관리 방식을 정의합니다.
- **Scope**: 전역(Global) – 진행 상황·설정·현재 스테이지 / 지역(Local) – 프레임 단위 물리·카메라
- **Tool**: Zustand Store + Custom Hooks

```typescript
// 상태 관리 스키마 예시
const useGameStore = create((set, get) => ({
  health: 100,
  time: 0,
  stars: 0,
  currentStage: null,
  progress: JSON.parse(localStorage.getItem('mothProgress') || '{}'),
  updateHealth: (delta: number) => set((s) => ({ health: Math.max(0, s.health + delta) })),
  land: (success: boolean) => { /* 별 계산 및 결과 저장 */ },
  saveProgress: () => localStorage.setItem('mothProgress', JSON.stringify(get().progress))
}));
```

### 4.2. 주요 동작 파이프라인 (Main Workflow)
1.  **초기화 (Init)**: Vite 앱 로드 → LocalStorage에서 진행 상황 복원 → Three.js 씬 초기화(라이트, 안개) → 메인 화면의 난이도 선택 렌더
2.  **이벤트 처리 (Process)**: 입력 → 나방 fixed-step 물리 후보 위치 계산 → 이전·후보 위치 사이의 목표 면 swept contact 판정 및 최초 terminal 결과 latch → 구조물/장애물 AABB·구 충돌과 bounce 처리 → 체력 감소
3.  **렌더링/갱신 (Update)**: requestAnimationFrame 루프 내에서 카메라 추적 + HUD 오버레이 동기화. 결과 화면 진입 시 Canvas에 별·시간·체력 바를 그려 공유 이미지 생성

### 4.3. 핵심 알고리즘 (Core Algorithms)
- **다중 표면 착지 판정 알고리즘**:
  - 목표는 position, surface, 실내를 향하는 단위 normal을 가진다. 바닥·천장·좌우 벽을 동일한 면 계약으로 처리한다.
  - 이전 위치와 후보 위치의 선분이 목표 평면을 통과하는지 swept 방식으로 먼저 검사하고, 접점을 목표 면의 접선 공간에 투영한 반경이 0.5 unit 이내인지 확인한다.
  - landing-ready 접근 속도의 법선 성분이 안전 범위일 때 성공한다. 목표 접촉으로 생성된 최초 terminal 결과는 비가역 latch되어 뒤이은 구조물 충돌·관성 bounce·바닥 접촉이 성공을 실패로 뒤집지 못한다.
  - 체력 잔량에 따라 별을 부여한다 (100% → 3, ≥50% → 2, >0 → 1).
- **장애물 데미지 계산**:  
  - 전선: canonical 60Hz 접촉 tick당 15 / 스파크: tick당 25
  - 과열 릴레이 범위: 거리 반비례 초당 8~20  
  - 진공관 폭발 존: 일회성 40
- **공유 이미지 생성**: terminal 결과 스냅샷에서 불변 `ResultPresentation`을 한 번 파생해 결과 모달·공유 텍스트·PNG가 같은 stage·별·시간·체력 값을 사용한다. 1080×1080 Canvas 2D Context에 크림 로그북 종이 → Courier 계열 제목 → 테이프와 vector 나방 표본 → 별·시간·HP → 해시태그 순으로 드로잉한 뒤 PNG Blob으로 변환한다. OffscreenCanvas를 우선하고 생성·context·blob 변환이 불가능하면 HTMLCanvasElement로 폴백하며 폰트 로딩 timeout 뒤에도 안전하게 진행한다.
### 4.4. 캠페인·회랑 구성 (Campaign & Corridor Layouts)
- **선택 흐름**: 메인 화면에서 TUTORIAL·EASY·NORMAL·HARD 난이도를 먼저 선택하고, 열린 난이도 안에서는 1개 또는 6개의 개별 단계 중 원하는 단계를 선택한다. 선택한 난이도는 실행 중에도 보존하며, 완료·실패 상태에서 Enter를 누르면 방금 선택한 난이도의 개별 단계 선택 화면으로 돌아간다. 전역 다음 단계로 자동 전환하지 않는다.
- **카메라·terminal 흐름**: 플레이는 기본 3인칭 추적 카메라로 시작하고 T 입력으로 1인칭·3인칭을 토글한다. clear/fail 시 Portal 결과 모달을 표시하며 Canvas pointer lock을 즉시 해제해 커서를 복원한다. 결과 모달은 대화형 요소·modifier·repeat 입력을 침범하지 않는 R·Enter 단축키를 소유하고, R 재시작 시 같은 단계의 기본 플레이 상태로 돌아간다.
- **해금 규칙**: TUTORIAL은 항상 플레이할 수 있다. 튜토리얼 클리어 후 EASY, 서로 다른 EASY 단계 3개 이상 클리어 후 NORMAL, 서로 다른 NORMAL 단계 3개 이상 클리어 후 HARD를 해금한다. 중복 재클리어는 해금 개수에 중복 산입하지 않으며 LocalStorage에서 복원한 완료 기록에도 같은 규칙을 적용한다.
- **튜토리얼 1 + EASY 6**: M4의 Mark II 릴레이 베이(relay-bay)를 사용해 기본 비행·착지와 장애물 조합을 학습한다.
- **NORMAL 6**: 교차 게이트와 천장 버스가 있는 switching-gallery를 사용한다. 구조물과 장애물의 간격이 직선 비행을 차단해 좌우 경로 판단을 요구한다.
- **HARD 6**: 바닥·천장 데크, 좌우 게이트와 중앙 코어가 교차하는 logic-labyrinth를 사용한다. 고도와 방향을 함께 바꾸는 경로 선택을 강제한다.
- NORMAL과 HARD는 바닥 외에도 천장·좌우 벽 목표를 사용한다. 목표 메시의 방향과 물리 법선은 같은 canonical target 정의에서 파생한다.
- **가시성·성능**: switching-gallery와 logic-labyrinth에는 은은한 분산 보조 조명을 배치해 경로·장애물·목표 접근면의 최소 가시성을 보장한다. 보조 조명은 그림자를 생성하지 않고 저비용 광원 수와 기존 적응형 DPR 정책 안에서 운용해 데스크톱 60fps 성능 예산을 유지한다.
- 나방은 몸통·앞날개·뒷날개·더듬이·다리의 실루엣을 분리한 primitive 모델을 사용한다. 전선·스파크·과열 릴레이·진공관 장애물 역시 역할과 충돌 범위를 읽을 수 있는 primitive 조합으로 표현한다.

## 5. UI 구현 가이드 (Implementation Guide)
*디자인 시스템을 코드로 구현하기 위한 기술적 설정값입니다.*

### 5.1. 디자인 토큰 (Design Tokens)
- **Colors**: `--bg-dark: #0a0e17`, `--accent-gold: #f0c14b`, `--health-green: #22c55e`, `--health-red: #ef4444`, `--spark: #fbbf24`
- **Typography**: 제목은 `'Inter', system-ui, sans-serif`, 계기·메타 정보는 `'Courier Prime', monospace`, Base Size 16px. 두 폰트는 `@fontsource` 번들로 자체 호스팅
- **Breakpoints**: Mobile(768px), Tablet(1024px), Desktop(1280px+)

### 5.2. 공통 컴포넌트 (Shared Components)
- **Button**: variant(`primary`|`secondary`|`ghost`), size(`sm`|`md`|`lg`), disabled를 지원한다. 금속 베벨과 베이클라이트 눌림 상태, 키보드 focus-visible, forced-colors 상태를 보장
- **Modal**: React Portal 사용, z-index 1000, `role="dialog"`·`aria-modal`·레이블/설명 연결. 초기 focus와 Tab/Shift+Tab focus trap, 닫힌 뒤 이전 focus 복귀를 제공하며 배경 클릭과 Escape 닫기를 지원
- **HealthBar**: store health와 동기화한 10세그먼트 계기판. 숫자 HP와 semantic `<meter>`를 함께 제공하고, 피해 revision 때 바 shake를 표시하되 동작 축소 환경에서는 애니메이션을 제거
- **StarDisplay**: 1~3개 별 아이콘, 금/은/동 색상 분기와 읽을 수 있는 레이블 제공. 플레이 중에는 현재 health 파생값, terminal에서는 store에 latch된 최종 별점을 표시

### 5.3. HUD·일시정지 통합 (HUD & Pause Integration)
- **Canvas 계층**: 인게임 HUD는 Drei `<Html fullscreen>` 안에 렌더한다. GameHud root와 DamageOverlay는 transformed outer wrapper 아래 fixed containing block에 의존하지 않고 Html 표면 기준 `position: absolute` full surface를 사용하며, Html anchor는 camera-forward 위치에서 world-origin의 behind-camera 숨김을 방지한다. HUD 루트는 `pointer-events: none`으로 비행 입력을 통과시키고, 일시정지 버튼과 Modal 같은 대화형 요소만 포인터 입력을 받는다.
- **상단 계기**: 좌측 stage 식별자, 중앙 HealthBar, 우측 Timer를 배치한다. Timer는 store elapsed를 `MM:SS.t`로 표시하고 semantic `<time>` 값을 제공한다.
- **Minimap**: 플레이어 x/z를 회랑 경계에 투영하고 목표까지의 선·방향을 표시한다. 목표의 floor·ceiling·left-wall·right-wall 표면과 플레이어 대비 ASCEND·DESCEND·LEVEL 고도 정보를 텍스트로 병행한다.
- **DamageOverlay**: 직전 health보다 현재 health가 낮을 때만 피해량 기반 강도로 화면 가장자리 적색 pulse를 발생시킨다. `prefers-reduced-motion`에서는 pulse와 shake를 표시하지 않는다.
- **Pause contract**: P·Escape, 문서 비가시화, 한 번 획득한 Canvas pointer lock의 상실은 `paused`로 전환해 물리·타이머·피해와 카메라 T 토글을 멈춘다. Continue는 play 상태와 pointer lock을 복원하고, Restart는 동일 stage를 초기화하며, Return은 stage 목록으로 돌아가 커서를 보이게 한다.
- **결과 경계**: M8 `ResultScreen`은 M6 clear/fail 중앙 안내를 대체하는 별도 Portal 모달이며 M7 PauseModal과 섞이지 않는다. clear와 fail 모두 terminal 결과 스냅샷을 표시하고, 치명 피해는 HP 0·0별 실패 스냅샷을 남긴다. 단일 불변 presentation이 화면·텍스트·PNG의 동일 값을 보장한다.
- **반응형·접근성**: 320px부터 768px 전환점을 포함해 가로 스크롤 없이 계기를 재배치한다. `showControlHints`, `forced-colors`, `prefers-reduced-motion`, 키보드 focus 순서를 모두 보존한다.

### 5.4. M7 자동검증·Lighthouse 기준선 (Verification Baseline)
- **정적 게이트**: ESLint 0 errors / 0 warnings, TypeScript, import boundary 통과
- **회귀 계약**: 사용자 실플레이에서 발견한 0×0 HUD 붕괴·overflow clip을 수정하고 StageEnvironment.hud, HudVisibility, DamageOverlay 테스트를 추가
- **테스트**: Vitest 25 files / 402 tests 통과
- **V8 overall coverage**: statements 98.97%, branches 97.32%, functions 99.02%, lines 98.94%
- **Production build**: Vite 111 modules, 초기 index 169.55 kB(55.54 kB gzip), lazy SceneCanvas 895.53 kB(244.14 kB gzip)
- **Lighthouse**: 13.4.1 메뉴 화면 accessibility 100, binary failure 0. 메뉴 DOM만 감사했으므로 인게임 HUD 실제 가시성의 증거로 사용하지 않는다.
- **상태**: 기존 500 kB 초과 warning만 유지한다. 2026-08-14 사용자 재수동 실플레이에서 stage·health·timer·minimap UI와 피격 오버레이가 정상 표시되고 0×0 HUD 회귀 수정이 유효함을 확인해 M7 완료·커밋·푸시 승인을 확정했다. 메뉴 Lighthouse 결과는 인게임 가시성 증거와 계속 분리한다.

### 5.5. M8 결과·공유 통합 및 검증 상태
- **결과 모달**: clear/fail 공용 React Portal `ResultScreen`이 latch된 결과 기록을 표시한다. Modal의 dialog semantics·단계 복귀 초기 focus·focus trap·focus 복귀를 유지하며, 비해제형 backdrop과 이미지 재생성에서도 focus 이탈을 막고 상태·오류 피드백은 `aria-live`로 전달한다.
- **공유 액션**: 준비된 `image/png`는 클릭 호출 스택에서 `ClipboardItem` 쓰기를 시작해 transient activation을 보존하고 미지원·실패 시 결과 텍스트를 복사한다. 별도의 `COPY RESULT TEXT`를 항상 제공하며 이미지 생성 실패 시 재생성 동작도 노출한다. 다운로드는 사용자 클릭 뒤 object URL을 지연 revoke해 탐색 시작 전에 URL이 사라지지 않게 한다.
- **접근성·반응형**: 키보드 focus-visible, forced-colors, reduced-motion, 좁은 화면의 단일 열 재배치와 가로 overflow 방지 계약을 적용한다.
- **자동검증**: Node.js 24에서 lint·TypeScript·import boundary, Vitest 33 files / 496 tests 통과. V8 overall coverage statements 98.58% / branches 96.94% / functions 98.12% / lines 98.55%.
- **Production build**: Vite 118 modules, 초기 index 194.62 kB(63.63 kB gzip), lazy SceneCanvas 891.35 kB(242.63 kB gzip). 기존 500 kB 초과 warning만 유지한다.
- **게이트 상태**: 2026-08-14 사용자 실제 브라우저 검수에서 다운로드 PNG의 1080×1080 해상도·로그북 시각, clipboard 이미지/텍스트 붙여넣기, clear/fail terminal 입력과 반응형 동작이 모두 정상임을 확인했다. M8 DoD를 완료하고 커밋·푸시를 승인했으며, 다음 작업은 아직 시작하지 않은 M9 통합·폴리시·배포다.

## 6. 파일 구조 (File Structure)

```text
moth-in-the-machine/
├── src/
│   ├── api/                # (향후 리더보드용 빈 폴더)
│   ├── assets/             # 모델(gltf), 텍스처, 사운드, 폰트
│   ├── components/
│   │   ├── ui/             # Button, Modal, HealthBar, StarDisplay
│   │   ├── hud/            # GameHud, Timer, Minimap, PauseModal, DamageOverlay
│   │   ├── layout/         # TitleScreen, StageSelect, ResultScreen
│   │   └── three/          # Moth, Obstacles, StageEnvironment, CameraRig
│   ├── hooks/              # useKeyboard, useGameLoop, useShareImage
│   ├── pages/              # Home, Play, StageSelect (React Router)
│   ├── store/              # gameStore.ts (Zustand)
│   ├── utils/              # stages.ts, collision.ts, corridorLayouts.ts, starCalculator.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── favicon.ico
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

## 7. 개발 시 주의사항 (Implementation Notes)
1.  **보안 (Security)**:
    - 외부 API 호출 없음. LocalStorage 데이터는 JSON.stringify 전 단순 검증만 수행.
    - 공유 이미지 생성 시 사용자 입력 텍스트 없음 → XSS 위험 제로.
2.  **성능 최적화 (Optimization)**:
    - M6 환경·나방·장애물은 경량 primitive와 instancing을 우선한다. 이후 외부 3D 에셋을 도입할 때만 glTF + Draco 압축을 필수로 한다.
    - 장애물 충돌은 프레임마다 전체 검사하지 않고 Spatial Hash 또는 단순 거리 컬링 적용.
    - 공유 이미지는 OffscreenCanvas 가능 시 사용, 아니면 메인 스레드에서 빠르게 생성 후 즉시 revokeObjectURL.
    - React.memo + useMemo로 HUD 리렌더링 최소화.
3.  **이슈 대응 (Known Issues)**:
    - iOS Safari에서 100vh 문제 → `100dvh` 또는 visualViewport 대응.
    - 저사양 기기에서 프레임 드롭 시 자동으로 그림자/포스트프로세싱 비활성화 옵션 제공.
    - 터치 기기에서 카메라 드래그와 조이스틱 충돌 방지 위해 pointer-events 분리.