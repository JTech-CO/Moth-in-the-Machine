# Moth in the Machine 진행 상황

## 현재 phase

M1 — 기반/스캐폴딩 (완료)

## 직전에 끝낸 것

- 기술 백서, 디자인 백서, 작업 하네스 감사
- 문서 사이의 구현 순서와 핵심 불변식 확인
- React 18 + TypeScript + Vite 스캐폴딩 파일 작성
- Tailwind, CSS Variables, SCSS Modules 및 1947년 디자인 토큰 구성
- `@/*` 경로 별칭과 ESLint 모듈 경계 계약 구성
- pnpm lockfile과 빌드 스크립트 공급망 승인 목록 생성
- lint, typecheck, import 경계 계약, production build 통과
- Vite dev 서버 부팅 및 `http://localhost:5173` HTTP 200 응답 확인

## 다음 할 일

1. M2 테스트 러너와 80% 커버리지 게이트 구성
2. 체력·별점·충돌·착지 순수 함수와 경계값 테스트 구현
3. M2 게이트 통과 후 별도 커밋·푸시

## 검증 결과

- `pnpm install --frozen-lockfile`: 통과
- `pnpm verify`: 통과
  - ESLint: 0 errors / 0 warnings
  - TypeScript: 통과
  - 금지 import probe: 예상대로 `no-restricted-imports` 감지
  - Vite production build: 통과
- `pnpm dev`: Vite 6.4.3 부팅 성공, localhost HTTP 200
- 브라우저·콘솔 시각 검수: 사용자 확인으로 통과

## 현재 제약

- 없음

## 미결 질문

- M2: 착지의 “속도 ≈ 0” epsilon 값은 얼마로 고정할 것인가?
- M6: 스파크/전선의 15~25 데미지는 프레임당, 초당, 접촉 이벤트 중 무엇인가?
- M6: 범위 데미지를 결정론적으로 선택하는 규칙은 무엇인가?
- M6: 최초 3개 스테이지의 이름, 좌표, 장애물 구성, 해금 규칙은 무엇인가?
- M5/M6: Space의 호버/착지 준비 상태와 자동 착지 판정의 정확한 상태 전이는 무엇인가?
- M3: LocalStorage schema version, Date 복원, 마이그레이션 정책은 무엇인가?

## 결정 로그

| 날짜       | 결정                                                            | 이유                                                            |
| ---------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| 2026-08-09 | 첫 구현 범위를 M1로 제한                                        | 하네스가 phase 순서와 선행 DoD 통과를 필수로 규정               |
| 2026-08-09 | React 18을 명시적으로 고정하고 Three.js/Zustand는 설치하지 않음 | 기술 백서 스택과 M1 주의사항 준수                               |
| 2026-08-09 | UI의 store 직접 import를 lint로 금지                            | HUD와 도메인의 단일 소스 정합성 및 순환 의존 방지               |
| 2026-08-09 | 폰트 토큰은 typewriter → 한글 UI fallback 순서로 병합           | 디자인 백서의 시대감과 기술 백서의 한글 가독성 요구를 함께 만족 |
| 2026-08-09 | Node 24.14.0을 검증 런타임으로 고정                             | 전역 Node 25.2.0의 Windows 설치·빌드 프로세스 비결정 종료 회피  |
| 2026-08-09 | 사용자 콘솔 시각 검수 확인으로 M1 게이트 완료                   | M1 수동 브라우저 렌더·반응형 검증 완료                          |
