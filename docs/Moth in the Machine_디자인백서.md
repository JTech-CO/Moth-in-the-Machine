# Moth in the Machine 디자인 백서 (Design Whitepaper)

**버전**: 1.0  
**작성일**: 2026년 7월 31일  
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
  - *모바일*: 100% Full Width + 가상 조이스틱 영역 확보
- **테마 정책 (Theme Policy)**: Dark Fixed (다크 테마 고정)
  - *배경색*: `#0a0e17` (깊은 슬레이트·건메탈)
  - *기본 텍스트 색*: `#e8e4d9` (크림 아이보리)

### 2.2. 사용자 상호작용 (Interaction Logic)
- **주요 액션 (Actions)**:
  - **Hover Effects**: 금속 패널 위 버튼/스위치에 미세한 반사 증가 + 베이클라이트 광택 강화
  - **Navigation**: 타이틀 → 스테이지 선택 → 인게임 → 결과 화면의 선형 흐름. 일시정지는 중앙 모달
- **입력 방식 (Input)**: Keyboard/Mouse 우선, 터치 시 가상 조이스틱 + 드래그 카메라. 모든 버튼은 물리적 눌림 피드백 제공

### 2.3. 데이터 구조 및 모듈 (Component Structure)
1.  **헤더 (Header)**: 상단 고정 바 – 좌측 스테이지명, 중앙 체력 바, 우측 타이머
2.  **네비게이션 (Nav)**: 인게임에서는 미니맵 + 목표 화살표만 표시. 메뉴는 일시정지 모달로 처리
3.  **콘텐츠 영역 (Content)**: 전체 화면 3D 뷰포트. HUD는 반투명 금속 패널 스타일 오버레이
4.  **푸터 (Footer)**: 인게임에서는 컨트롤 힌트만 하단 표시 (설정에서 숨김 가능). 결과 화면에서는 공유 버튼 영역

### 2.4. 출력 및 결과물 (Output)
- **결과물 형식**: React Component (JSX) + Canvas 기반 공유 이미지 (1080×1080 PNG)
- **품질 기준 (QA Standards)**:
  - 접근성: WCAG 2.1 AA (고대비 텍스트, 키보드 네비게이션 지원)
  - 반응형: 가로 스크롤 발생 금지, 모바일에서도 3D 조작 가능

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
- **Level 1 (Page Title)**: 28–32px, Bold, 크림 아이보리 (`#e8e4d9`)
- **Level 2 (Section Title)**: 20–22px, SemiBold, 호박색 강조 (`#f0c14b`)
- **Level 3 (Body Text)**: 16px, Regular, 라인하이트 1.5
- **Level 4 (Meta/Caption)**: 13–14px, Regular, 연한 그레이 (`#a8a49a`)

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
3.  **Mobile View**: 가상 조이스틱 하단 배치, HUD 요소 크기 축소, 미니맵 우측 상단 고정

### 4.3. 핵심 컴포넌트 로직 (Core Components)
- **HealthBar**: 진공관 밝기 또는 세그먼트 인디케이터 스타일. 깎일 때 화면 가장자리 붉은 오버레이 + 바 흔들림
- **ResultCard / ShareImage**: 1947년 실제 로그북 페이지를 재현. 크림 종이 배경 + 타이프라이터 폰트 + 테이프에 붙은 나방 일러스트 + 별·시간·체력 정보
- **ControlPanelButton**: 베이클라이트 원형 버튼 + 금속 베벨. 클릭 시 눌림 애니메이션과 기계음 피드백

## 5. UI/UX 디자인 가이드 (Design System)

### 5.1. 색상 팔레트 (Color Palette)
- **Primary Color**: `#f0c14b` (용도: 주요 강조·별·목표 / `--accent-amber`)
- **Secondary/Link**: `#c9a227` (용도: 보조 강조 / `--accent-brass`)
- **Background**: `#0a0e17` (페이지·3D 배경 / `--bg-dark`)
- **Text/Neutral**: `#e8e4d9` (본문 / `--text-cream`), `#a8a49a` (보조 텍스트)
- **Error/Success**: `#ef4444` (데미지), `#22c55e` (체력 양호)
- **Panel Metal**: `#1c2526` ~ `#2a3439` (금속 패널 그라데이션)

### 5.2. 타이포그래피 (Typography)
- **Font Family**: `'Courier Prime', 'IBM Plex Mono', monospace` (타이프라이터) + `'Inter', system-ui` (UI 라벨)
- **Font Weight**: Regular(400), Medium(500), SemiBold(600), Bold(700)

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
│   └── features/               # HUD, Minimap, ShareCanvas, DamageOverlay
└── [설정 파일 - tailwind.config.js, postcss.config.js]
```

## 7. 개발 시 주의사항 (Implementation Notes)

1.  **스타일링 전략 (Styling Strategy)**:
    - CSS Variables로 디자인 토큰 관리. 유틸리티 클래스와 컴포넌트 SCSS 모듈을 혼합 사용.
    - 모든 패널·버튼에 `box-shadow`와 `border`로 금속·베이클라이트 질감 재현.
2.  **접근성 가이드 (Accessibility)**:
    - 모든 인터랙티브 요소에 키보드 포커스 링 제공.
    - 체력 바·타이머는 색상만으로 정보를 전달하지 않고 텍스트·아이콘 병행.
    - 고대비 모드에서도 호박색 강조가 유지되도록 대비 검증.
3.  **예외 처리 (Exception Handling)**:
    - 3D 로딩 실패 시 로그북 스타일 Skeleton UI 노출.
    - 공유 이미지 생성 실패 시 “텍스트만 복사” 폴백 제공.
    - 저사양 기기에서는 그림자·포스트프로세싱을 자동 비활성화하고 UI는 그대로 유지.