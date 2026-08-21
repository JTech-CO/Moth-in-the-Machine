# Moth in the Machine 디자인 백서 (Design Whitepaper)

**버전**: 1.3\
**작성일**: 2026년 7월 31일  
**개정일**: 2026년 8월 21일\
**작성자**: 디자인팀  
**참고 문서**: 기획서 v1.0, 기술 백서 v1.0, 1947년 Mark II 시대 디자인 요소 정리

---

## 1. 프로젝트 개요 (Project Overview)
### 1.1. 프로젝트 명
**Moth in the Machine UI/UX Design**

### 1.2. 목적 (Purpose)
*1947년 하버드 Mark II 컴퓨터에서 실제로 발견된 ‘나방 버그’를 모티브로 한 웹 3D 게임에, 해당 시대의 군사·과학 연구소 미학을 정확하게 재현한 인터페이스를 구축한다.*
- 플레이어가 나방이 되어 컴퓨터 내부를 비행하는 경험을 방해하지 않으면서도, 체력·시간·목표를 직관적으로 전달하는 HUD와 결과 공유 화면을 제공한다.
- Windows XP 스타일이나 스팀펑크를 배제하고, 1947년 당시의 기능적·산업적 디자인 언어만으로 시대감을 완성한다.

### 1.3. 핵심 차별점 (Key Differentiators)
1.  **시대 정확성 (Period Authenticity)**: 1947년 Mark II 콘솔·로그북·진공관·베이클라이트 스위치의 실제 시각 언어를 기반으로 한 스케어모픽 UI
2.  **기능적 몰입 (Functional Immersion)**: 게임 플레이를 방해하지 않는 최소한의 HUD와, 실제 실험실 계기판처럼 배치된 정보 계층
3.  **공유 최적화 (Share-First Aesthetic)**: Wordle 스타일 결과 이미지를 1947년 로그북 페이지로 재현하여 SNS 바이럴과 역사적 재미를 동시에 확보

## 2. 상세 기능 요구사항 (Detailed Requirements)

### 2.1. 레이아웃 및 인터페이스 (Layout & Interface)
- **뷰 모드 (View Mode)**: Full-Width Fluid Layout (3D 뷰포트가 화면 전체를 차지)
  - *데스크톱*: 100vw × 100vh, HUD는 고정 오버레이
  - *좁은 화면*: 320px 이상에서 메뉴·HUD·결과 UI를 재배치. 터치 비행 조작은 후속 범위
- **테마 정책 (Theme Policy)**: Dark Fixed (다크 테마 고정)
  - *배경색*: `#0a0e17` (깊은 슬레이트·건메탈)
  - *기본 텍스트 색*: `#e8e4d9` (크림 아이보리)

### 2.2. 사용자 상호작용 (Interaction Logic)
- **주요 액션 (Actions)**:
  - **Hover Effects**: 금속 패널 위 버튼/스위치에 미세한 반사 증가 + 베이클라이트 광택 강화
  - **Navigation**: 타이틀/메인 → 난이도 선택 → 해당 난이도의 개별 단계 선택 → 인게임 → 정식 Portal 결과 모달 → 선택한 난이도의 개별 단계 선택 복귀의 계층 흐름. clear/fail 진입 즉시 포인터 잠금을 해제하고 커서를 복원한다. 결과 모달의 Enter는 보존된 난이도의 단계 목록으로 돌아가며, R은 현재 단계를 재시작하고 다음 단계로 자동 이동하지 않는다. 단축키는 버튼 등 대화형 요소의 입력을 침범하지 않는다. P·Escape, 문서 비가시화, 획득 후 포인터 잠금 상실은 중앙 일시정지 모달을 열고, Continue·Restart·Return 동작을 제공한다.
- **입력 방식 (Input)**: Keyboard/Mouse 우선. 카메라는 기본 3인칭이며 T로 1인칭·3인칭을 전환한다. 터치 가상 조이스틱·드래그 카메라는 후속 범위이며 모든 버튼은 물리적 눌림 피드백을 제공한다.
- **캠페인 구성 (Campaign)**: 조작 튜토리얼 1개 + EASY·NORMAL·HARD 각 6개, 총 19단계. 난이도를 선택한 뒤 그 안의 개별 단계를 플레이하며, 전역 1→19 강제 순차 진행은 사용하지 않는다. relay-bay는 튜토리얼·EASY, switching-gallery는 NORMAL, logic-labyrinth는 HARD의 고유 공간 언어로 사용
- **메뉴 배경 회랑 (Menu Corridor)**: 실행 중인 stage가 있으면 그 stage의 environment를 최우선으로 유지한다. active run이 없을 때 선택값 null·TUTORIAL·EASY는 relay-bay, NORMAL은 switching-gallery, HARD는 logic-labyrinth를 배경으로 표시한다.
- **해금 표현 (Unlock States)**: TUTORIAL은 항상 활성화한다. 튜토리얼 클리어 전 EASY, 서로 다른 EASY 3단계 클리어 전 NORMAL, 서로 다른 NORMAL 3단계 클리어 전 HARD는 잠금 상태로 표시하고, 잠금 이유와 남은 조건을 텍스트로 함께 전달한다.
- **공간 난이도 (Spatial Difficulty)**: EASY는 기본 조작을 학습하고, NORMAL은 교차 게이트, HARD는 데크·게이트·코어와 장애물로 직선 경로를 차단해 방향·고도 판단을 요구
- **목표 표면 (Target Surfaces)**: EASY는 바닥 중심, NORMAL·HARD는 바닥·천장·좌우 벽으로 확장. 목표 원은 표면 방향과 안쪽 접근 방향을 시각적으로 명확히 전달
- **어두운 회랑 가시성 (Dark Corridor Visibility)**: NORMAL·HARD의 분위기는 어둡게 유지하되, 경로·장애물 윤곽·목표 접근면이 사라지는 완전 암부는 허용하지 않는다. 크림·호박색의 은은한 분산 보조 조명을 사용하고 그림자는 생성하지 않아 기존 성능 예산을 유지한다.
- **품질 선택 (Quality Choice)**: 메인 푸터의 `QUALITY · AUTO / ADAPTIVE | LOW SPEC` 버튼은 현재 모드를 직접 표시하고 `aria-pressed`와 구체적인 레이블을 제공한다. LOW SPEC은 장식 밀도와 렌더 비용만 줄이며 HUD·목표·위험·핵심 회랑 조명은 유지한다.

### 2.3. 데이터 구조 및 모듈 (Component Structure)
1.  **헤더 (Header)**: 상단 고정 바: 좌측 스테이지명, 중앙 10세그먼트 체력 바, 우측 타이머. 체력은 숫자 HP와 semantic meter를 병행하고 시간은 `MM:SS.t` 계기 형식으로 표시
2.  **네비게이션 (Nav)**: 메인에서는 난이도 카드와 개별 단계 카드를 계층적으로 표시하고 잠금·완료·최고 기록을 구분한다. 단계 카드는 연번·제목 / 목표 / 별·BEST 기록 / START FLIGHT를 4단 grid로 구성해 넓은 카드에서도 정보가 흩어지지 않게 한다. 카드 전체를 하나의 버튼으로 유지하고 가시적 focus와 단계명·목표·완료 기록·시작 의도를 포함한 `aria-label`을 제공한다. 인게임 미니맵은 플레이어와 목표 방향, 목표 표면, ASCEND·DESCEND·LEVEL 고도를 함께 표시하며 일시정지는 중앙 모달로 처리한다.
3.  **콘텐츠 영역 (Content)**: 전체 화면 3D 뷰포트. HUD는 반투명 금속 패널 스타일 오버레이
4.  **푸터 (Footer)**: 메뉴에서는 영속 `QUALITY` 토글, 인게임에서는 컨트롤 힌트(설정에서 숨김 가능), 결과 화면에서는 공유 버튼 영역을 제공한다.

### 2.4. 출력 및 결과물 (Output)
- **결과물 형식**: React Component (JSX) + Canvas 기반 공유 이미지 (1080×1080 PNG)
- **품질 기준 (QA Standards)**:
  - 접근성: WCAG 2.1 AA (고대비 텍스트, 키보드 네비게이션 지원)
  - 반응형: 320px 이상에서 가로 스크롤 발생 금지. 현재 3D 비행은 데스크톱 키보드·마우스 우선

## 3. 기술 스택 및 라이브러리 (Tech Stack)

### 3.1. Core
- **Frontend Framework**: React 18 + TypeScript
- **Styling Engine**: CSS Variables + Tailwind CSS (유틸리티) + 커스텀 SCSS 모듈

### 3.2. Libraries & Tools
1.  **@react-three/fiber + @react-three/drei**
    - **용도**: 3D 씬 렌더링 및 HUD Html 오버레이
    - **설정 값**: 다크 환경광 + 진공관 포인트 라이트
2.  **html2canvas / Canvas API**
    - **용도**: 로그북 스타일 공유 이미지 생성
3.  **framer-motion** (선택)
    - **용도**: 버튼 눌림·패널 슬라이드 등 미세 애니메이션

## 4. 아키텍처 및 로직 (Architecture & Logic)

### 4.1. 시각적 계층 구조 (Visual Hierarchy)
- **Level 1 (Page Title)**: 28~32px, Bold, 크림 아이보리 (`#e8e4d9`)
- **Level 2 (Section Title)**: 20~22px, SemiBold, 호박색 강조 (`#f0c14b`)
- **Level 3 (Body Text)**: 16px, Regular, 라인하이트 1.5
- **Level 4 (Meta/Caption)**: 13~14px, Regular, 연한 그레이 (`#a8a49a`)

```css
/* 스타일 적용 예시 코드 */
.section-title {
  font-size: 1.375rem;
  font-weight: 600;
  color: #f0c14b;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
```

### 4.2. 반응형 로직 (Responsive Logic)
1.  **Desktop (Default)**: 전체 화면 3D + 고정 HUD 오버레이
2.  **Transition Point**: 1024px (태블릿), 768px (모바일)
3.  **Mobile View**: 320~768px에서 HUD 요소를 재배치·축소하고 미니맵을 우측에 유지하며, 조작 힌트와 계기판이 겹치거나 가로 스크롤을 만들지 않게 한다. 가상 조이스틱은 후속 터치 입력 범위로 남긴다.

### 4.3. 핵심 컴포넌트 로직 (Core Components)
- **HealthBar**: 10개 진공관 세그먼트 인디케이터 스타일. 숫자 HP와 semantic meter를 병행하고 깎일 때 화면 가장자리 붉은 오버레이 + 바 흔들림을 표시
- **Timer**: Courier Prime 계기 숫자로 `MM:SS.t`를 표시하며 스크린 리더가 읽을 수 있는 시간 값을 병행
- **Minimap**: 회랑 x/z 경계에 플레이어와 목표를 투영하고 연결선·표면 배지·고도 지시를 함께 표시해 색상이나 방향선 하나에만 의존하지 않음
- **StarDisplay**: 플레이 중에는 현재 HP로 예상 별점을 갱신하고 clear/fail 뒤에는 latch된 최종 별점을 표시. 금·은·동 색과 읽을 수 있는 레이블을 병행
- **DamageOverlay**: health 감소에만 반응하는 가장자리 적색 pulse. 피해량에 따라 강도를 조절하고 동작 축소 환경에서는 pulse와 shake를 제거
- **PauseModal**: Portal 기반 중앙 금속 패널. Continue·Restart·Return을 순서대로 배치하고 초기 focus, Tab/Shift+Tab 순환, 닫힌 뒤 이전 focus 복귀를 보장
- **ResultCard / ShareImage**: clear/fail 공용 Portal 모달에 1947년 실제 로그북 페이지를 재현한다. terminal 결과 스냅샷에서 만든 단일 불변 presentation으로 화면과 공유 결과의 별·시간·체력을 일치시킨다. 클리어 공유 이미지는 1080×1080 크림 종이 + Courier 계열 타이프라이터 폰트 + 테이프와 vector 나방 표본 + 별·시간·HP·해시태그로 구성한다.
- **ControlPanelButton**: 베이클라이트 원형 버튼 + 금속 베벨. 클릭 시 눌림 애니메이션과 기계음 피드백
- **TerminalNotice (M6)**: clear/fail 상태와 Enter 단계 목록 복귀·R 재시작을 안내하던 임시 중앙 표면. M8에서 정식 `ResultScreen` Portal 모달로 대체
- **Moth Model**: 앞·뒷날개, 더듬이, 다리와 몸통의 실루엣을 분명히 하여 파리와 혼동되지 않는 primitive 나방으로 표현
- **Obstacle Model**: 전선·스파크·과열 릴레이·진공관의 기능과 충돌 범위를 색·형태·발광 구조로 구분하며, 회랑 구조와 분리되어 떠 보이지 않게 결합
- **QualityToggle**: 메뉴 푸터에서 AUTO/LOW SPEC을 전환하는 단일 버튼. 현재 모드, 다음 동작과 pressed 상태를 색상 외 텍스트·접근성 속성으로 전달한다.
- **BootShell**: React와 3D 청크가 준비되기 전에도 시대적 제목·연구소 메타·초기화 상태를 즉시 보여 주며 앱 mount 뒤 제거된다.

- **M7 HUD 가시성 회귀**: 사용자 실플레이에서 Drei Html의 transformed 0×0 wrapper 아래 fixed GameHud·DamageOverlay가 붕괴·clip되는 문제를 발견했다. 두 표면을 `position: absolute` full surface로 바꾸고 Html을 camera-forward에 anchor해 world-origin behind-camera 숨김도 방지했다.
- **M7 자동 QA 기준선**: StageEnvironment.hud·HudVisibility·DamageOverlay 회귀 계약을 포함한 25개 테스트 파일·402개 테스트를 통과했다. V8 overall coverage는 statements 98.97%, branches 97.32%, functions 99.02%, lines 98.94%이며 build는 111 modules, index 169.55 kB(55.54 kB gzip), SceneCanvas 895.53 kB(244.14 kB gzip)이다.
- **M7 Lighthouse QA**: 메뉴 화면 accessibility 100, binary failure 0은 메뉴 DOM에만 해당하며 인게임 HUD 실제 가시성의 증거가 아니다.
- **M7 게이트 상태**: 2026-08-14 사용자 재수동 실플레이에서 stage·health·timer·minimap UI와 피격 오버레이가 정상 표시됨을 확인했다. 0×0 HUD 회귀 수정 뒤 시각 게이트를 통과해 M7을 완료하고 커밋·푸시를 승인했다. 메뉴 Lighthouse 결과는 인게임 가시성 증거와 분리해 유지한다.
- **M8 공유 폴백**: OffscreenCanvas를 우선하고 생성·context·PNG 인코딩 실패 시 HTMLCanvasElement로 다시 렌더링하며 폰트 로딩 timeout을 둔다. 준비된 PNG 복사는 클릭 호출 스택에서 시작해 Safari activation을 보존하고, 자동 텍스트 폴백과 항상 보이는 `COPY RESULT TEXT`를 함께 둔다. 다운로드 URL은 클릭 뒤 지연 해제한다.
- **M8 자동 QA**: Node.js 24 기준 33개 테스트 파일·496개 테스트를 통과했다. V8 overall coverage는 statements 98.58%, branches 96.94%, functions 98.12%, lines 98.55%이며 build는 118 modules, index 194.62 kB(63.63 kB gzip), SceneCanvas 891.35 kB(242.63 kB gzip)이다. 기존 500 kB 초과 warning만 유지한다.
- **M8 게이트 상태**: 2026-08-14 사용자 실제 브라우저 검수에서 다운로드 PNG의 1080×1080 해상도·로그북 시각, clipboard 이미지/텍스트 붙여넣기, clear/fail 결과 입력과 반응형 동작이 모두 정상임을 확인해 M8을 완료했다.
- **M9 초기 경험**: JS·3D 청크 전에도 시대적 제목과 초기화 상태가 보이는 boot shell을 제공하고, canonical·Open Graph·Twitter 메타데이터와 공개 플레이 URL을 연결했다.
- **M9 저사양 UX**: `QUALITY` 버튼의 focus·pressed 상태와 좁은 화면 배치를 보장한다. LOW SPEC에서도 NORMAL/HARD 회랑의 방향·고도·목표가 사라지지 않으며 선택은 새로고침 뒤 유지된다.
- **M9 자동 QA**: 41개 테스트 파일·552개 테스트, coverage statements 98.60% / branches 97.05% / functions 98.16% / lines 98.58%를 통과했다. 초기 JS는 191.22 KiB(62.53 KiB gzip), 전체 JS는 298.66 KiB gzip이다.
- **M9 배포 게이트**: https://jtech-co.github.io/Moth-in-the-Machine/ 에서 desktop/mobile LCP 412/2883ms를 기록하고 3초 예산을 통과했다. 2026-08-21 사용자 검수에서 AUTO 약 60fps, LOW SPEC 30fps 이상, 저사양 회랑 가시성, 품질 영속화, 이미지 복사와 PNG 다운로드를 확인했다.

## 5. UI/UX 디자인 가이드 (Design System)

### 5.1. 색상 팔레트 (Color Palette)
- **Primary Color**: `#f0c14b` (용도: 주요 강조·별·목표 / `--accent-amber`)
- **Secondary/Link**: `#c9a227` (용도: 보조 강조 / `--accent-brass`)
- **Background**: `#0a0e17` (페이지·3D 배경 / `--bg-dark`)
- **Text/Neutral**: `#e8e4d9` (본문 / `--text-cream`), `#a8a49a` (보조 텍스트)
- **Error/Success**: `#ef4444` (데미지), `#22c55e` (체력 양호)
- **Panel Metal**: `#1c2526` ~ `#2a3439` (금속 패널 그라데이션)

### 5.2. 타이포그래피 (Typography)
- **Self-hosting**: `@fontsource/inter`의 400·600·700과 `@fontsource/courier-prime`의 400·700을 애플리케이션 번들에서 자체 호스팅해 외부 폰트 네트워크 요청과 초기 폰트 불확실성을 제거한다.
- **Font Role**: 제목·난이도·단계명은 굵은 `'Inter', system-ui, sans-serif`를 사용하고, 연번·목표·별·BEST 시간·상태·조작 힌트 같은 메타 정보는 `'Courier Prime', monospace`를 사용한다. 한글은 각 토큰의 시스템 UI fallback으로 가독성을 유지한다.
- **Font Weight**: Inter Regular(400)·SemiBold(600)·Bold(700), Courier Prime Regular(400)·Bold(700)

## 6. 파일 구조 (File Structure)

```text
src/
├── assets/
│   ├── images/                 # 로그북 텍스처, 나방 실루엣, 진공관 등
│   └── styles/
│       ├── global.css          # Reset & Global Styles
│       └── variables.css       # Design Tokens (색상·폰트·간격)
├── components/
│   ├── layout/                 # TitleScreen, StageSelect, ResultScreen
│   ├── ui/                     # Button, HealthBar, StarDisplay, Modal
│   └── hud/                    # GameHud, Timer, Minimap, PauseModal, DamageOverlay
└── [설정 파일 - tailwind.config.js, postcss.config.js]
```

## 7. 개발 시 주의사항 (Implementation Notes)

1.  **스타일링 전략 (Styling Strategy)**:
    - CSS Variables로 디자인 토큰 관리. 유틸리티 클래스와 컴포넌트 SCSS 모듈을 혼합 사용.
    - 모든 패널·버튼에 `box-shadow`와 `border`로 금속·베이클라이트 질감 재현.
2.  **접근성 가이드 (Accessibility)**:
    - 모든 인터랙티브 요소에 키보드 포커스 링 제공.
    - 단계 카드는 중첩 버튼 없이 카드 전체를 하나의 버튼으로 제공하고, 별점은 보이는 기호와 읽을 수 있는 레이블을 함께 사용한다. 제목·기록은 좁은 화면에서 wrap하되 가로 스크롤을 만들지 않는다.
    - 체력 바·타이머는 색상만으로 정보를 전달하지 않고 텍스트·아이콘 병행.
    - 고대비 모드에서도 호박색 강조가 유지되도록 대비 검증.
    - 비대화형 HUD는 Canvas 비행 입력을 통과시키고 버튼·모달만 pointer-events를 받는다. 일시정지 모달은 focus trap과 이전 focus 복귀를 제공한다.
    - 결과 모달도 Portal dialog semantics, 초기 focus·focus trap·focus 복귀, aria-live 상태/오류, 키보드 focus-visible을 제공하며 좁은 화면에서 단일 열로 재배치한다.
    - `prefers-reduced-motion`에서는 피해 pulse·바 shake·버튼 transform을 제거하고, `forced-colors`에서도 경계·focus·상태가 구분되게 한다. 품질 버튼도 같은 focus·고대비 계약을 따른다.
3.  **예외 처리 (Exception Handling)**:
    - 3D 로딩 실패 시 로그북 스타일 Skeleton UI 노출.
    - 공유 이미지 생성 실패 시 “텍스트만 복사” 폴백 제공.
    - 저사양 기기에서는 LOW SPEC이 DPR·antialias·장식·동적광 비용을 줄이되 UI와 핵심 회랑 조명은 그대로 유지한다.
