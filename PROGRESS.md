# Moth in the Machine 진행 상황

## 현재 phase

M3 — 상태 관리·영속화 (완료)

## 직전에 끝낸 것

- M1 기반과 M2 핵심 도메인 로직 완료 및 원격 저장소 푸시
- Zustand 5.0.14 vanilla store와 React selector hook 구성
- PlayerState, 세션 상태, Stage Progress, Settings 및 store 액션 구현
- `mothProgress` / schema v1 LocalStorage 저장·복원 계층 구현
- 완료 스테이지의 최고 기록을 최단 시간·최고 별점으로 독립 병합
- 부분 손상 데이터 복구, 잘못된 JSON fallback, 미래 스키마 읽기 전용 보호 구현
- 종료 세션 불변성과 저장 직전 미래 스키마 재확인 회귀 방어 구현
- store, persistence, browser singleton, React hook 테스트 118개 통과
- 사용자 브라우저·콘솔 검수 확인으로 LocalStorage 새로고침 게이트 완료

## 다음 할 일

1. M3 완료 커밋을 원격 저장소에 푸시하고 Draft PR #1 갱신
2. M4 — 3D 렌더링 기반의 기술·디자인 범위 감사
3. Three.js와 React Three Fiber 고정 버전 도입
4. Mark II 내부 3D 씬, 카메라, 조명, 성능 계측 기반 구현

## 검증 결과

- `pnpm install --frozen-lockfile`: 통과
- `pnpm test -- --coverage`: 통과
  - Vitest: 7 files / 118 tests 통과
  - V8 coverage: statements 100%, branches 100%, functions 100%, lines 100%
- `pnpm verify`: 통과
  - ESLint: 0 errors / 0 warnings
  - TypeScript: 통과
  - 모듈 경계 계약: 통과
  - per-file 80% 커버리지 게이트: 통과
  - Vite production build: 통과
- `pnpm format:check`: 통과
- `git diff --check`: 통과
- `pnpm dev`: Vite 6.4.3 부팅 성공, localhost HTTP 200
- 브라우저 LocalStorage·새로고침 수동 검수: 사용자 확인으로 통과

## 현재 제약

- 없음

## 미결 질문

- M6: 스파크/전선의 15~25 데미지는 프레임당, 초당, 접촉 이벤트 중 무엇인가?
- M6: 범위 데미지를 결정론적으로 선택하는 규칙은 무엇인가?
- M6: 최초 3개 스테이지의 이름, 좌표, 장애물 구성, 해금 규칙은 무엇인가?
- M5/M6: Space의 호버/착지 준비 상태와 자동 착지 판정의 정확한 상태 전이는 무엇인가?

## 결정 로그

| 날짜       | 결정                                                                     | 이유                                                                       |
| ---------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 2026-08-09 | 첫 구현 범위를 M1로 제한                                                 | 하네스가 phase 순서와 선행 DoD 통과를 필수로 규정                          |
| 2026-08-09 | React 18을 명시적으로 고정하고 Three.js/Zustand는 설치하지 않음          | 기술 백서 스택과 M1 주의사항 준수                                          |
| 2026-08-09 | UI의 store 직접 import를 lint로 금지                                     | HUD와 도메인의 단일 소스 정합성 및 순환 의존 방지                          |
| 2026-08-09 | 폰트 토큰은 typewriter → 한글 UI fallback 순서로 병합                    | 디자인 백서의 시대감과 기술 백서의 한글 가독성 요구를 함께 만족            |
| 2026-08-09 | Node 24.14.0을 검증 런타임으로 고정                                      | 전역 Node 25.2.0의 Windows 설치·빌드 프로세스 비결정 종료 회피             |
| 2026-08-09 | 사용자 콘솔 시각 검수 확인으로 M1 게이트 완료                            | M1 수동 브라우저 렌더·반응형 검증 완료                                     |
| 2026-08-09 | 착지 정지 임계값을 전체 3D 속도 ≤ 0.1 unit/s로 고정                      | 하네스의 “속도 ≈ 0”을 명시적이고 축 독립적인 불변식으로 변환               |
| 2026-08-09 | 충돌 접촉은 포함하고 모든 도메인 숫자 입력은 유한값만 허용               | 접촉 누락과 NaN/Infinity 전파를 방지해 결정론 유지                         |
| 2026-08-09 | Vitest 4.1.10과 V8 per-file 80% 게이트를 M2 검증에 고정                  | 하네스 명령에서도 테스트 누락이나 합산 커버리지 은폐를 방지                |
| 2026-08-09 | 정수 HP 경계에서 1e-9 이하 부동소수점 노이즈를 정규화                    | 30/60/120fps 누적 데미지가 50·0 경계와 별점·실패 결과를 바꾸지 않도록 보장 |
| 2026-08-09 | Zustand 5.0.14 vanilla store와 얇은 React hook을 M3 경계로 채택          | React 밖에서도 결정론적으로 테스트하고 UI의 단일 selector 진입점을 유지    |
| 2026-08-09 | `mothProgress` schema v1에는 Progress와 Settings만 저장                  | player, timer, result, Date 같은 세션 데이터를 새로고침 뒤 안전하게 초기화 |
| 2026-08-09 | 스테이지 기록은 최단 시간과 최고 별점을 독립 병합하고 총 별은 파생       | 재도전 결과가 기존 최고 기록을 퇴행시키거나 합계를 오염시키지 않도록 보장  |
| 2026-08-09 | 부분 손상 레코드는 복구하되 미래 버전은 저장 직전에도 재확인하여 보호    | 사용 가능한 진행도는 살리고 다른 탭·새 버전의 데이터를 덮어쓰지 않음       |
| 2026-08-09 | cleared/failed 뒤에는 `startStage` 전까지 transient 상태를 불변으로 유지 | 늦게 도착한 프레임·충돌 콜백이 결과를 뒤집거나 실패 세션을 부활시키지 않음 |
| 2026-08-11 | 사용자 브라우저·콘솔 검수 확인으로 M3 게이트 완료                        | LocalStorage 저장·새로고침 복원·손상 데이터 fallback의 수동 DoD 충족       |
