# b2b-promotion 프론트엔드앱 개발을 위한 지침

## 반드시 준수할 기술 스택 (docs/3-PRD.md 6절 근거)

- **React 19**
- **전역 상태관리: Zustand**
- **서버 상태(백엔드 통신): TanStack Query**

다른 상태관리/서버 통신 라이브러리(Redux, Recoil, SWR, Axios 전용 래퍼 등)를 임의로 추가하지 않는다. 백엔드는 Node.js + Express, DB는 PostgreSQL 17이며(참고용, 프론트엔드가 직접 다루지 않음), API 요청/응답 형식은 `../docs/swagger.json`을 근거로 한다.

## 프론트엔드 개발 시 참조할 문서

작업 전 관련 문서를 먼저 확인할 것. `../docs/1-domain-definition.md`가 모든 요구사항의 최상위 소스다.

| 문서명 | 파일 | 내용 |
|---|---|---|
| 도메인 정의서 | [`../docs/1-domain-definition.md`](../docs/1-domain-definition.md) | 액터/엔티티/유스케이스/비즈니스 규칙/MVP 범위 — 최상위 소스 |
| 유스케이스 다이어그램 | [`../docs/2-usecase.md`](../docs/2-usecase.md) | 액터-기능 관계(mermaid) |
| PRD | [`../docs/3-PRD.md`](../docs/3-PRD.md) | 기능/비기능 요구사항, 기술 스택, 보안 |
| 사용자 시나리오 | [`../docs/4-user-scenario.md`](../docs/4-user-scenario.md) | 화면별 흐름 |
| 프로젝트 구조 설계 원칙 | [`../docs/5-project-principle.md`](../docs/5-project-principle.md) | 레이어/네이밍/테스트, 프론트엔드 디렉토리 구조(6절) |
| 기술 아키텍처 다이어그램 | [`../docs/6-arch-diagram.md`](../docs/6-arch-diagram.md) | 프론트엔드 컴포넌트 구조 포함 |
| 와이어프레임 | [`../docs/7-wireframe.md`](../docs/7-wireframe.md) | 화면별 모바일/데스크탑 레이아웃, 반응형 원칙 |
| ERD | [`../docs/8-erd.md`](../docs/8-erd.md) | 화면에 표시할 데이터 구조 참고용(mermaid) |
| 실행 계획 | [`../docs/9-plan.md`](../docs/9-plan.md) | 프론트엔드 Task 분해, 체크리스트 |
| 스타일 가이드 | [`../docs/10-style.md`](../docs/10-style.md) | 색상/타이포그래피/컴포넌트 스타일 |
| API 스펙 | [`../docs/swagger.json`](../docs/swagger.json) | OpenAPI 3.0, 백엔드 연동 시 요청/응답 형식 근거 |
