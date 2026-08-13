# Moth in the Machine

1947년 Harvard Mark II에서 발견된 실제 나방 버그를 모티브로 한 브라우저 기반 3D 캐주얼 게임입니다.

## 시작하기

요구 환경은 Node.js LTS 20.19 이상 25 미만과 pnpm 10 이상입니다. 저장소의 .node-version은 검증 런타임인 Node.js 24.14.0을 고정합니다.

```bash
pnpm install
pnpm dev
```

http://localhost:5173 에서 현재 개발 빌드를 확인할 수 있습니다.

## 검증

```bash
pnpm test -- --coverage
pnpm verify
pnpm format:check
```

verify는 lint, TypeScript, 모듈 경계 계약, 80% per-file 테스트 커버리지, production build를 차례로 검사합니다.

## 구현 단계

개발은 [작업 하네스](docs/Moth%20in%20the%20Machine_하네스.md)의 M1 → M9 게이트 순서를 따릅니다. 현재 상태와 다음 작업은 [PROGRESS.md](PROGRESS.md)를 기준으로 인계합니다.

M1 기반, M2 핵심 도메인 로직, M3 상태 관리·영속화, M4 3D 환경, M5 플레이어 컨트롤·물리, M6 난이도 선택형 19단계 캠페인, M7 HUD & UI, M8 결과 화면·공유 이미지가 완료되었습니다. M6 역사적 기준선은 19개 테스트 파일·313개 테스트, V8 overall coverage statements 98.82%·branches 96.87%·functions 98.87%·lines 98.80%, 초기 index 170.84 kB(56.03 kB gzip)·lazy Scene 874.63 kB(236.49 kB gzip)이었습니다. M7은 0×0 HUD 가시성 회귀 수정 뒤 2026-08-14 사용자 재수동 실플레이 검수를 통과했고 커밋·푸시 승인을 받았습니다. M8도 같은 날 실제 브라우저 공유 기능 검수를 통과해 완료 및 커밋·푸시 승인을 받았으며, 다음 작업은 아직 시작하지 않은 M9 통합·폴리시·배포입니다.

M3는 Zustand 5.0.14를 사용합니다. 진행도와 설정은 mothProgress schema v1으로 저장하고, player·timer·result 같은 세션 상태는 새로고침 때 초기화합니다.

UI 글꼴은 `@fontsource/inter` 400·600·700과 `@fontsource/courier-prime` 400·700을 번들에 포함해 자체 호스팅합니다. 제목과 주요 단계명은 굵은 Inter sans를, 연번·목표·별·BEST 기록·상태 같은 메타 정보는 Courier Prime typewriter를 사용합니다. 단계 카드는 연번·제목 / 목표 / 별·BEST 기록 / START FLIGHT의 4단 grid로 정보 위계를 키우고, 카드 전체를 하나의 버튼으로 유지하면서 가시적 focus와 구체적인 `aria-label`을 제공합니다.

M4는 Three.js 0.170.0, React Three Fiber 8.18.0, Drei 9.122.0을 사용합니다. 하나의 lazy-loaded Canvas 안에 primitive와 instanced mesh로 Mark II 릴레이 회랑을 구성하고, glTF·텍스처·포스트프로세싱·그림자는 아직 사용하지 않습니다. M6에서는 이 relay-bay를 튜토리얼·EASY에 유지하고, NORMAL은 switching-gallery, HARD는 logic-labyrinth라는 별도 구조의 회랑을 사용합니다. 메뉴 배경은 실행 중인 stage가 있으면 해당 회랑을 우선하며, active run이 없을 때 null·TUTORIAL·EASY는 relay-bay, NORMAL은 switching-gallery, HARD는 logic-labyrinth를 표시합니다. NORMAL/HARD에는 그림자를 만들지 않는 저비용 분산 보조 조명을 더해 어두운 구간의 경로와 장애물을 읽을 수 있게 하되 기존 성능 예산을 유지합니다.

M5에서는 화면을 클릭해 포인터를 잠근 뒤 WASD 또는 화살표 키와 마우스로 나방을 비행합니다. 기본 카메라는 3인칭 추적 시점이며 T로 1인칭과 3인칭을 전환합니다. Space는 hover와 landing-ready를 한 번씩 전환합니다. 비행은 1/120초 fixed-step 관성과 AABB 회랑 충돌을 사용하며, 마우스 입력은 DPI spike·각속도 상한과 fixed-step smoothing으로 안정화됩니다.

M6는 역사 소개와 조작법이 있는 메인 화면에서 TUTORIAL·EASY·NORMAL·HARD 난이도 카드를 먼저 고르고, 그 안의 개별 단계 카드에서 START FLIGHT를 눌러 시작합니다. 튜토리얼은 항상 열려 있고, 튜토리얼을 클리어하면 EASY, 서로 다른 EASY 단계 3개 이상을 클리어하면 NORMAL, 서로 다른 NORMAL 단계 3개 이상을 클리어하면 HARD가 열립니다. 전역 1→19 자동 진행은 없으며 clear/fail 때 중앙 결과 안내가 나타납니다. terminal 진입 즉시 Canvas 포인터 잠금을 해제해 커서를 복원하고, Enter는 방금 선택한 난이도의 개별 단계 선택 화면으로 돌아가며 R은 현재 단계를 다시 시작합니다. 19개 단계의 전선·스파크는 canonical 60Hz 접촉 tick, 과열 릴레이는 거리 기반 8–20 HP/s, 진공관 폭발 존은 시도당 한 번 40 피해를 줍니다. 난이도가 높아질수록 구조물과 장애물이 경로 선택을 강제하며, 목표는 바닥뿐 아니라 천장·좌우 벽에도 놓입니다. landing-ready 비행은 목표 면의 안쪽 법선을 따라 접근하고, 프레임 사이의 swept contact를 충돌·튕김 처리 전에 검사합니다. 최초 terminal 결과는 비가역적으로 latch되므로 목표에 성공 접촉한 뒤 관성으로 튕겨 나가도 실패로 뒤집히지 않습니다. 나방은 앞·뒷날개, 더듬이, 다리와 몸체의 구분을 강화했고 장애물도 기능을 읽을 수 있는 primitive 조합으로 개선했습니다. 정식 HealthBar·Timer·Minimap·DamageOverlay는 M7 범위입니다.

M7 HUD는 Drei `<Html fullscreen>` 계층에서 스테이지·체력·타이머 헤더, 목표 방향·표면·고도를 보여 주는 미니맵, 현재 체력 기반 별점과 terminal 별점, 10세그먼트 semantic HealthBar, 데미지 가장자리 pulse를 표시하도록 구현했습니다. P·Escape, 문서 비가시화, 획득 후 pointer lock 상실은 플레이를 일시정지하고, Portal 모달은 Continue·Restart·Return 동작과 focus trap·focus 복귀를 제공합니다. 비대화형 HUD는 Canvas 입력을 막지 않고 모달과 버튼만 포인터 입력을 받으며, 조작 힌트 설정·강제 색상·동작 축소·320–768px 반응형 계약을 적용합니다. M6의 clear/fail 중앙 안내는 M8의 정식 Portal 결과 모달로 대체했습니다.

첫 사용자 실플레이 검수에서 HUD 전체가 표시되지 않는 회귀를 발견했습니다. Drei Html의 0×0 transformed outer wrapper가 `position: fixed` GameHud·DamageOverlay의 containing block이 되면서 전체 표면이 0×0으로 붕괴·clip되었고, world origin anchor는 카메라 뒤로 이동하면 숨겨질 수 있었습니다. HUD root와 DamageOverlay를 Html 표면 기준 `position: absolute` full surface로 바꾸고 Html anchor를 camera-forward 위치에 유지하도록 수정했으며, StageEnvironment HUD 계층·HUD 가시성·DamageOverlay 표면 계약 테스트를 추가했습니다.

M7 최신 자동검증은 lint·TypeScript·import boundary, 25개 테스트 파일·402개 테스트를 모두 통과했습니다. V8 overall coverage는 statements 98.97%, branches 97.32%, functions 99.02%, lines 98.94%입니다. Vite production build는 111 modules, 초기 index 169.55 kB(55.54 kB gzip), lazy SceneCanvas 895.53 kB(244.14 kB gzip)이며, 기존 500 kB 초과 경고만 유지됩니다.

M8은 clear와 fail 모두를 React Portal 결과 모달로 표시합니다. terminal 순간의 stage·시간·체력·별·timestamp를 결과 스냅샷으로 고정하고, 같은 불변 `ResultPresentation`을 화면·공유 텍스트·공유 이미지에 사용해 표시 불일치를 막습니다. HP가 0이 되는 충돌 실패도 0 HP·0별의 실패 스냅샷을 남깁니다. 결과 모달의 초기 focus는 단계 복귀에 두며 R은 전역 재시작, Enter는 비대화형 영역에서 단계 복귀로 처리하고 버튼에 focus된 Enter와 modifier·repeat 입력은 그대로 보존합니다.

클리어 결과는 Courier 계열 타이프라이터 서체, 크림색 로그북 종이, 테이프와 vector 나방 표본, 별·시간·HP·해시태그가 포함된 1080×1080 Canvas PNG로 생성됩니다. OffscreenCanvas를 우선하고 생성자·context·blob 변환이 지원되지 않거나 실패하면 HTMLCanvasElement에서 다시 렌더·인코딩하며, 폰트 로딩에는 timeout을 둡니다. 준비된 PNG는 클릭 호출 스택 안에서 `ClipboardItem` 쓰기를 시작해 Safari의 사용자 활성화를 보존하고, 자동 텍스트 폴백과 항상 보이는 `COPY RESULT TEXT`를 함께 제공합니다. 다운로드 object URL은 클릭 이후 지연 해제합니다. 결과 모달과 상태·오류 피드백은 focus trap·aria-live·focus-visible·forced-colors·reduced-motion 및 좁은 화면 재배치를 적용합니다.

M8 최신 Node.js 24 자동검증은 lint·TypeScript·import boundary, 33개 테스트 파일·496개 테스트를 모두 통과했습니다. V8 overall coverage는 statements 98.58%, branches 96.94%, functions 98.12%, lines 98.55%입니다. Vite production build는 118 modules, 초기 index 194.62 kB(63.63 kB gzip), lazy SceneCanvas 891.35 kB(242.63 kB gzip)이며 기존 500 kB 초과 경고만 유지됩니다. 2026-08-14 실제 브라우저에서 다운로드 PNG의 1080×1080 해상도·로그북 시각·클립보드 붙여넣기와 결과 입력 흐름이 모두 정상임을 확인해 M8 수동 게이트를 통과했고, M8 완료 및 커밋·푸시를 승인했습니다.

Lighthouse 13.4.1로 `http://127.0.0.1:5173/` 메뉴 화면을 재검증한 결과 accessibility 100, binary failure 0을 기록했습니다. 첫 감사에서 weight-0 `label-content-name` 경고 2개를 확인해 난이도 카드의 중복 `aria-label`을 제거한 뒤 같은 조건으로 재검증했습니다. 메뉴 감사 자체는 인게임 HUD 가시성의 증거가 아니며, 별도의 실제 플레이 재검수에서 stage·health·timer·minimap UI와 피격 오버레이가 정상 표시됨을 확인했습니다.
