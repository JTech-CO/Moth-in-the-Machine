# Moth in the Machine 기술 백서 (Technical Whitepaper)

**버전**: 1.0  
**작성일**: 2026년 7월 31일  
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
  - **Input**: Keyboard (WASD/화살표 + Space), Mouse (시야 회전), Touch (가상 조이스틱 + 드래그)
  - **Action**: 목표 지점 착지 시 자동 판정 → 체력/시간 계산 → 결과 화면 전환. 장애물 충돌 시 실시간 체력 감소 + 비주얼 피드백(화면 가장자리 붉은 오버레이)
- **데이터 검증 (Validation)**: 클라이언트 사이드에서 체력 0 이하, 착지 좌표 오차(±0.5 unit) 검증. 서버 검증 불필요(오프라인 우선).

### 2.3. 데이터 모델 (Data Model)
주요 모듈에서 다루는 데이터 객체(Entity)의 스키마를 정의합니다.
1.  **Stage**: id(Number), name(String), targetPosition({x,y,z}), obstacles(Array), bestTime(Number), bestStars(Number 0~3)
2.  **PlayerState**: health(Number 0~100), position({x,y,z}), velocity({x,y,z}), isLanded(Boolean)
3.  **Result**: stageId(Number), time(Number), remainingHealth(Number), stars(Number), timestamp(Date)
4.  **Progress**: completedStages(Array<Stage>), totalStars(Number) → LocalStorage에 직렬화 저장

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
1.  **초기화 (Init)**: Vite 앱 로드 → LocalStorage에서 진행 상황 복원 → Three.js 씬 초기화(라이트, 안개, 포스트프로세싱) → 첫 스테이지 또는 스테이지 선택 화면 렌더
2.  **이벤트 처리 (Process)**: 입력 → 나방 물리 업데이트(속도/관성) → 장애물 AABB/구 충돌 검사 → 체력 감소 → 목표 좌표 도달 시 착지 판정
3.  **렌더링/갱신 (Update)**: requestAnimationFrame 루프 내에서 카메라 추적 + HUD 오버레이 동기화. 결과 화면 진입 시 Canvas에 별·시간·체력 바를 그려 공유 이미지 생성

### 4.3. 핵심 알고리즘 (Core Algorithms)
- **착지 판정 알고리즘**: 플레이어 위치와 목표 좌표의 유클리드 거리가 0.5 이하이고, Y축 속도가 거의 0일 때 성공으로 간주. 체력 잔량에 따라 별 부여 (100% → 3, ≥50% → 2, >0 → 1)
- **장애물 데미지 계산**:  
  - 스파크/전선: 접촉 프레임당 15~25  
  - 과열 릴레이 범위: 거리 반비례 초당 8~20  
  - 진공관 폭발 존: 일회성 40
- **공유 이미지 생성**: Canvas 2D Context에 배경 그라데이션 → 로고 → 큰 별 아이콘 → 시간/체력 텍스트 → 해시태그 순으로 드로잉 후 toBlob()

## 5. UI 구현 가이드 (Implementation Guide)
*디자인 시스템을 코드로 구현하기 위한 기술적 설정값입니다.*

### 5.1. 디자인 토큰 (Design Tokens)
- **Colors**: `--bg-dark: #0a0e17`, `--accent-gold: #f0c14b`, `--health-green: #22c55e`, `--health-red: #ef4444`, `--spark: #fbbf24`
- **Typography**: `'Pretendard', 'Inter', system-ui`, Base Size 16px
- **Breakpoints**: Mobile(768px), Tablet(1024px), Desktop(1280px+)

### 5.2. 공통 컴포넌트 (Shared Components)
- **Button**: Props – variant(`primary`|`secondary`|`ghost`), size(`sm`|`md`|`lg`), disabled. 호버 시 미세 스케일 + 글로우
- **Modal**: React Portal 사용, z-index 1000, 배경 클릭으로 닫기 가능. 결과/일시정지/설정에 공용
- **HealthBar**: width 퍼센트 기반, 색상 그라데이션 + 깎일 때 shake 애니메이션
- **StarDisplay**: 1~3개 별 아이콘, 금/은/동 색상 분기

## 6. 파일 구조 (File Structure)

```text
moth-in-the-machine/
├── src/
│   ├── api/                # (향후 리더보드용 빈 폴더)
│   ├── assets/             # 모델(gltf), 텍스처, 사운드, 폰트
│   ├── components/
│   │   ├── common/         # Button, Modal, HealthBar, StarDisplay
│   │   ├── hud/            # Timer, Minimap, DamageOverlay
│   │   ├── layout/         # TitleScreen, StageSelect, ResultScreen
│   │   └── three/          # Moth, Obstacles, StageEnvironment, CameraRig
│   ├── hooks/              # useKeyboard, useGameLoop, useShareImage
│   ├── pages/              # Home, Play, StageSelect (React Router)
│   ├── store/              # gameStore.ts (Zustand)
│   ├── utils/              # collision.ts, starCalculator.ts, shareCanvas.ts
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
    - 3D 모델은 glTF + Draco 압축 필수.
    - 장애물 충돌은 프레임마다 전체 검사하지 않고 Spatial Hash 또는 단순 거리 컬링 적용.
    - 공유 이미지는 OffscreenCanvas 가능 시 사용, 아니면 메인 스레드에서 빠르게 생성 후 즉시 revokeObjectURL.
    - React.memo + useMemo로 HUD 리렌더링 최소화.
3.  **이슈 대응 (Known Issues)**:
    - iOS Safari에서 100vh 문제 → `100dvh` 또는 visualViewport 대응.
    - 저사양 기기에서 프레임 드롭 시 자동으로 그림자/포스트프로세싱 비활성화 옵션 제공.
    - 터치 기기에서 카메라 드래그와 조이스틱 충돌 방지 위해 pointer-events 분리.