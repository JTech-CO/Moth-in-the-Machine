# Moth in the Machine 진행 상황

## 현재 phase

M6 — 난이도 선택형 19단계 캠페인·다중 표면 착지 확장 (완료)

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
- 당시 CONTACT CHECK·THERMAL DRIFT·CASCADE TEST 초기 3개 프로토타입과 각 spawn·targetPosition·안전 우회 장애물 배치 확정
- 전선 15·스파크 25를 canonical 60Hz 접촉 tick으로 적용하고 30/60/120Hz 누적 피해 동등성 검증
- 과열 릴레이를 core 20 → range 8 HP/s 선형 감쇠, 진공관 폭발 존을 stage run당 1회 40 피해로 구현
- primitive 기반 전선·스파크·과열 릴레이·진공관과 0.5 unit 착지 범위를 나타내는 amber 목표 패드 구현
- fixed-step 물리 뒤 장애물 판정 → 원자적 HP 감소 → HP 0 우선 실패 → 목표 착지 판정 파이프라인 연결
- store가 canonical stage spawn을 사용하고 start마다 stageRunId를 증가시켜 위치·HP·속도·타이머·로컬 위험 상태를 완전 초기화
- 초기 3개 프로토타입에서 R 재시작과 Enter 순환 흐름을 구현했으며, 이후 전역 다음 단계 자동 시작을 선택 난이도의 단계 목록 복귀로 대체
- store health와 직접 연결된 최소 semantic meter 및 STAGE·HEALTH·STATUS/별점 readout, M6 flight elapsed 진단 추가
- idle 상태를 역사 소개·조작법·난이도/개별 단계 선택이 있는 타이틀 게이트로 복원하고 시작 전 나방·장애물·타이머 비활성화
- 고 DPI 마우스 대응을 위해 yaw/pitch 감도 하향, 이벤트 spike·각속도 상한, yaw 최단경로 fixed-step smoothing 적용
- 목표 패드 안 첫 접촉의 미세한 수평 관성은 즉시 실패시키지 않고 감쇠 뒤 정지 기준을 충족하도록 settling 판정 추가
- 사용자 재검수에서 성공 접촉 뒤 bounce로 바닥 실패가 되는 문제와 3단계·단일 회랑·모델링 한계를 확인
- 캠페인을 튜토리얼 1 + EASY/NORMAL/HARD 각 6의 총 19단계 canonical 데이터 카탈로그로 확장
- relay-bay는 튜토리얼·EASY, switching-gallery는 NORMAL, logic-labyrinth는 HARD에 배치하고 난이도별 구조물이 경로 선택을 강제
- 목표를 floor·ceiling·left-wall·right-wall로 일반화하고 모든 목표에 실내 방향 단위 normal을 지정
- swept contact를 구조물 충돌·bounce 전에 판정하고 최초 terminal 결과를 비가역 latch해 성공 뒤 실패 전환 차단
- 앞·뒷날개·더듬이·다리 실루엣을 강화한 나방과 기능 식별성이 높은 장애물 primitive 모델로 개선
- 기본 카메라는 3인칭 추적 시점으로 시작하고 T 입력으로 1인칭·3인칭을 전환하도록 연결
- clear/fail 때 중앙 결과 안내를 표시하고 terminal 진입 즉시 Canvas 포인터 잠금을 해제해 커서를 복원
- 결과 안내에서 Enter는 선택한 난이도의 단계 목록 복귀, R은 현재 단계 재시작으로 명시
- `@fontsource/inter` 400·600·700과 `@fontsource/courier-prime` 400·700을 자체 호스팅하고, 굵은 sans 제목과 typewriter 메타 정보로 역할 분리
- 단계 카드의 연번·제목·목표·별·BEST 기록·START FLIGHT를 확대해 4단 grid로 정리하고, 카드 전체 단일 버튼·가시적 focus·구체적 `aria-label` 유지
- 메뉴 회랑은 active run을 최우선으로 표시하고, 비실행 상태에서 null·TUTORIAL·EASY는 relay-bay, NORMAL은 switching-gallery, HARD는 logic-labyrinth로 선택
- 난이도·개별 단계 선택, 진행도 기반 해금, 선택 난이도 단계 목록 복귀, NORMAL/HARD 무그림자 분산 보조 조명, 결과 안내·포인터 해제·T 시점 전환을 포함한 313개 테스트와 production build 통과
- 사용자 최종 브라우저 검수에서 자체 호스팅 폰트, 확대·4단 배치한 단계 카드, TUTORIAL·EASY·NORMAL·HARD별 메뉴 회랑이 정상임을 확인하고 M6 수동 게이트 완료

## 다음 할 일

1. M7 — HealthBar·Timer·Minimap·StarDisplay·DamageOverlay와 일시정지 모달 구현
2. Html overlay의 Canvas 입력 경계, 키보드·스크린 리더 정보 전달, focus 순서·대비·동작 축소를 포함한 접근성 검증

## 검증 결과

- Node.js 24.14.0 / pnpm 11.16.0 고정 런타임 확인
- pnpm install --frozen-lockfile: 통과
- pnpm verify: 최신 선택형 캠페인 통합 후 통과
  - ESLint: 0 errors / 0 warnings
  - TypeScript: 통과
  - 모듈 경계 계약: 통과
  - Vitest: 19 files / 313 tests 통과
  - V8 coverage: statements 98.82%, branches 96.87%, functions 98.87%, lines 98.80%
  - 난이도 해금·중복 클리어·메뉴 복귀·회랑 조명 계약 포함
  - Vite production build: 통과
- pnpm format:check: 통과
- git diff --check: 통과
- Three.js 0.170.0 및 @types/three 0.170.0 단일 버전 확인
- 소스 계약: Canvas 1개, glTF·텍스처 로더·포스트프로세싱·그림자 활성화 없음
- production JS: 초기 index 170.84 kB(56.03 kB gzip), lazy Scene 874.63 kB(236.49 kB gzip); 기존 500 kB 초과 경고 유지
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
  - [M5 flight] position·velocity 유한값, 콘솔 오류·FPS 저하·리사이즈 문제 없음
- M6 확장 최신 자동 검증: 19 files / 313 tests 통과, V8 overall coverage statements 98.82% / branches 96.87% / functions 98.87% / lines 98.80%
  - 튜토리얼 1 + EASY/NORMAL/HARD 각 6의 총 19단계, 난이도·개별 단계 선택과 고유 클리어 수 기반 해금 계약 검증
  - 전선·스파크 60Hz tick 및 과열 릴레이 30/60/120Hz 피해 동등성 검증
  - 진공관 one-shot/re-arm, 4개 목표 면 swept contact·접선 반경·법선 접근속도 경계, 비가역 terminal latch와 HP 0 우선순위 검증
  - 마우스 spike·yaw wrap·30/60/120Hz smoothing·각속도 상한, 난이도/단계 메뉴와 NORMAL/HARD 보조 조명 계약 검증
  - 새 단계 canonical spawn·HP 100·velocity 0·timer 0·stageRunId 증가 및 clear/fail 뒤 선택 난이도 단계 목록 복귀 검증
- M6 확장 실제 난이도 선택·해금·다중 표면 clear/fail·중앙 결과 안내·terminal 포인터 해제·T 시점 전환·회랑 가시성·모델·성능·최종 UI 수동 검수: 사용자 최종 확인으로 통과

## 현재 제약

- 500 kB 초과 lazy SceneCanvas 경고는 M4 기준선에서 이어 기록하고 M9 LCP/번들 최적화 게이트에서 재검토

## 미결 질문

- M7: 전체 화면 Canvas 위 Html overlay에서 HUD의 비차단 pointer-events와 일시정지 모달의 포인터 잠금 해제·focus trap·복귀 경계를 어떤 컴포넌트 계약으로 고정할 것인가?

## 결정 로그

| 날짜       | 결정                                                                     | 이유                                                                                        |
| ---------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| 2026-08-09 | 첫 구현 범위를 M1로 제한                                                 | 하네스가 phase 순서와 선행 DoD 통과를 필수로 규정                                           |
| 2026-08-09 | React 18을 명시적으로 고정하고 Three.js/Zustand는 설치하지 않음          | 기술 백서 스택과 M1 주의사항 준수                                                           |
| 2026-08-09 | UI의 store 직접 import를 lint로 금지                                     | HUD와 도메인의 단일 소스 정합성 및 순환 의존 방지                                           |
| 2026-08-09 | 폰트 토큰은 typewriter → 한글 UI fallback 순서로 병합                    | 디자인 백서의 시대감과 기술 백서의 한글 가독성 요구를 함께 만족                             |
| 2026-08-09 | Node 24.14.0을 검증 런타임으로 고정                                      | 전역 Node 25.2.0의 Windows 설치·빌드 프로세스 비결정 종료 회피                              |
| 2026-08-09 | 사용자 콘솔 시각 검수 확인으로 M1 게이트 완료                            | M1 수동 브라우저 렌더·반응형 검증 완료                                                      |
| 2026-08-09 | 착지 정지 임계값을 전체 3D 속도 ≤ 0.1 unit/s로 고정                      | 하네스의 “속도 ≈ 0”을 명시적이고 축 독립적인 불변식으로 변환                                |
| 2026-08-09 | 충돌 접촉은 포함하고 모든 도메인 숫자 입력은 유한값만 허용               | 접촉 누락과 NaN/Infinity 전파를 방지해 결정론 유지                                          |
| 2026-08-09 | Vitest 4.1.10과 V8 per-file 80% 게이트를 M2 검증에 고정                  | 하네스 명령에서도 테스트 누락이나 합산 커버리지 은폐를 방지                                 |
| 2026-08-09 | 정수 HP 경계에서 1e-9 이하 부동소수점 노이즈를 정규화                    | 30/60/120fps 누적 데미지가 50·0 경계와 별점·실패 결과를 바꾸지 않도록 보장                  |
| 2026-08-09 | Zustand 5.0.14 vanilla store와 얇은 React hook을 M3 경계로 채택          | React 밖에서도 결정론적으로 테스트하고 UI의 단일 selector 진입점을 유지                     |
| 2026-08-09 | mothProgress schema v1에는 Progress와 Settings만 저장                    | player, timer, result, Date 같은 세션 데이터를 새로고침 뒤 안전하게 초기화                  |
| 2026-08-09 | 스테이지 기록은 최단 시간과 최고 별점을 독립 병합하고 총 별은 파생       | 재도전 결과가 기존 최고 기록을 퇴행시키거나 합계를 오염시키지 않도록 보장                   |
| 2026-08-09 | 부분 손상 레코드는 복구하되 미래 버전은 저장 직전에도 재확인하여 보호    | 사용 가능한 진행도는 살리고 다른 탭·새 버전의 데이터를 덮어쓰지 않음                        |
| 2026-08-09 | cleared/failed 뒤에는 startStage 전까지 transient 상태를 불변으로 유지   | 늦게 도착한 프레임·충돌 콜백이 결과를 뒤집거나 실패 세션을 부활시키지 않음                  |
| 2026-08-11 | 사용자 브라우저·콘솔 검수 확인으로 M3 게이트 완료                        | LocalStorage 저장·새로고침 복원·손상 데이터 fallback의 수동 DoD 충족                        |
| 2026-08-11 | Three 0.170.0 / Fiber 8.18.0 / Drei 9.122.0을 정확히 고정                | React 18과 기술 백서 r170+/Fiber 8 요구를 충족하고 중복 Three를 방지                        |
| 2026-08-11 | M4 씬은 하나의 lazy Canvas와 primitive·instancing만 사용                 | 초기 HTML LCP를 지키면서 glTF 없이 회랑 밀도와 데스크톱 성능을 확보                         |
| 2026-08-11 | Drei PerformanceMonitor를 숫자 DPR 상태 1.0–1.5에 직접 연결              | AdaptiveDpr 단독 사용의 무효 경로와 리사이즈 시 DPR 되돌림을 방지                           |
| 2026-08-11 | 핵심 Canvas 경계는 SSR 계약 테스트, 실제 WebGL·FPS는 브라우저로 분리     | 단위 테스트 수치를 과장하지 않고 플랫폼 경계를 실제 환경에서 검증                           |
| 2026-08-11 | 사용자 브라우저 검수로 M4 게이트 완료                                    | 3D 표시·콘솔·50–60fps·리사이즈 DoD를 실제 환경에서 충족                                     |
| 2026-08-11 | readout과 설명문 폭을 29rem으로 확장                                     | 마지막 글자 고립 줄바꿈을 제거하면서 모바일 숨김과 상태 패널 구도를 유지                    |
| 2026-08-11 | Space는 로컬 hover ↔ landing-ready edge 토글로 고정                      | M5 준비 자세·제어 하강을 M6 terminal isLanded·성공 판정과 분리                              |
| 2026-08-11 | 프레임 물리는 로컬 ref와 1/120초 fixed-step으로 유지                     | React/store 60fps 갱신 없이 delta 독립 관성·카메라와 유한값 불변식 보장                     |
| 2026-08-11 | 회랑 interior AABB를 나방 half-extents만큼 inset                         | 보이는 바닥·벽과 collider 중심 한계를 단일 설정에서 일치                                    |
| 2026-08-11 | M5 store stage 생명주기는 시작하지 않음                                  | M6의 stage·target·terminal landing 범위를 선점하지 않고 샌드박스 물리만 검증                |
| 2026-08-11 | 사용자 브라우저 검수로 M5 게이트 완료                                    | 입력·관성·카메라·모드·충돌·유한 로그·성능·리사이즈 DoD를 실제 환경에서 충족                 |
| 2026-08-11 | 최초 3개 프로토타입을 고정 정의하고 store가 canonical spawn을 직접 사용  | 화면·물리·전환이 서로 다른 stage ID나 임의 spawn을 가질 수 없게 단일화                      |
| 2026-08-11 | 전선 15·스파크 25를 렌더 FPS가 아닌 canonical 60Hz 접촉 tick으로 해석    | 백서의 접촉 프레임당 피해를 지키면서 30/60/120fps 난이도 차이를 제거                        |
| 2026-08-11 | 과열 범위는 core 20 → range 8 HP/s 선형 감쇠, 진공관은 run당 1회 40      | 거리 경계가 명확하고 NaN·특이점 없이 결정론적으로 재현되도록 고정                           |
| 2026-08-11 | start마다 stageRunId를 증가시키고 PlayerFlightRig를 keyed remount        | 같은 stage 재시도도 물리·입력·타이머·접촉 tick·one-shot을 모두 초기화                       |
| 2026-08-11 | store의 post-damage HP로 실패를 착지보다 먼저 확정                       | React render 지연과 무관하게 치명 피해가 clear·progress 저장보다 우선                       |
| 2026-08-11 | M6는 store 직결 semantic meter와 숫자 readout만 제공                     | health 동기화 DoD를 검수하되 정식 HealthBar·DamageOverlay는 M7에 유지                       |
| 2026-08-12 | 초기 idle을 타이틀·소개·START 게이트로 유지                              | 신규 사용자가 게임 맥락과 조작을 이해한 뒤 난이도와 개별 단계를 선택                        |
| 2026-08-12 | 마우스 입력에 낮은 축별 감도·event cap·각속도 cap·fixed smoothing 적용   | OS·DPI·polling rate 차이에서도 순간 화면 반전 없이 조작 가능성 유지                         |
| 2026-08-12 | 패드 내부 고속 접촉은 failure 대신 settling 후 성공/이탈을 판정          | 첫 접촉의 미세 수평 관성이 정확한 착지를 즉시 실패로 고정하지 않도록 보정                   |
| 2026-08-12 | M6 캠페인을 튜토리얼 1 + EASY/NORMAL/HARD 각 6의 19단계로 확장           | 3단계·단일 회랑으로는 난이도 상승과 경로 판단 요구를 충족하지 못함                          |
| 2026-08-12 | 목표 면 swept contact를 충돌·bounce 전에 검사하고 terminal을 latch       | 성공 접촉 뒤 관성으로 튕겨 바닥 실패가 성공 결과를 뒤집는 회귀를 차단                       |
| 2026-08-12 | 난이도별 relay-bay/switching-gallery/logic-labyrinth 회랑을 분리         | NORMAL·HARD가 EASY와 다른 공간 구성과 고도·방향 경로 판단을 요구하도록 보장                 |
| 2026-08-12 | 수동 브라우저 게이트 전 M6 커밋·푸시 보류                                | 자동 검증만으로 모델·경로·다중 표면 착지의 실제 플레이 품질을 확정하지 않음                 |
| 2026-08-12 | 메인에서 난이도 카드 뒤 개별 단계 카드를 선택하고 진행도로 난이도를 해금 | 전역 강제 순차 진행 없이 원하는 열린 단계를 고르면서 캠페인 성취를 보존                     |
| 2026-08-12 | 선택 난이도를 실행 중 보존하고 clear/fail 뒤 Enter로 그 단계 목록 복귀   | 결과 뒤 다음 전역 번호를 자동 시작하지 않고 같은 난이도에서 선택권을 유지                   |
| 2026-08-12 | NORMAL/HARD에 그림자 없는 은은한 분산 보조 조명을 배치                   | 어두운 분위기와 기존 성능 예산을 유지하면서 완전 암부의 플레이 불가를 방지                  |
| 2026-08-13 | 사용자 최종 브라우저 검수로 M6 게이트 완료                               | 자체 호스팅 폰트·단계 카드 정보 위계·난이도별 메뉴 회랑을 포함한 최종 UI와 플레이 흐름 확인 |
