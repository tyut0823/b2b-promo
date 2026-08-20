# b2b-promotion 백엔드 개발을 위한 지침

## 반드시 준수할 사항

- SOLID 원칙을 반드시 지킬 것
- Clean 아키텍처를 반드시 구현할 것
- 단, 위 두 원칙은 `../docs/5-project-principle.md`가 정한 MVP 범위(3일·1인 개발, routes→controllers→services→db 4단 레이어, repository 패턴/DI 컨테이너 등 배제)를 벗어나지 않는 선에서 적용한다. 두 문서가 충돌하면 `5-project-principle.md`를 따른다.

## 백엔드 개발 시 참조할 문서

작업 전 관련 문서를 먼저 확인할 것. `../docs/1-domain-definition.md`가 모든 요구사항의 최상위 소스다.

| 문서명 | 파일 | 내용 |
|---|---|---|
| 도메인 정의서 | [`../docs/1-domain-definition.md`](../docs/1-domain-definition.md) | 액터/엔티티/유스케이스/비즈니스 규칙/MVP 범위 — 최상위 소스 |
| PRD | [`../docs/3-PRD.md`](../docs/3-PRD.md) | 기능/비기능 요구사항, 기술 스택, 보안 |
| 사용자 시나리오 | [`../docs/4-user-scenario.md`](../docs/4-user-scenario.md) | 화면별 흐름 |
| 프로젝트 구조 설계 원칙 | [`../docs/5-project-principle.md`](../docs/5-project-principle.md) | 레이어/네이밍/테스트/보안, 백엔드 디렉토리 구조 |
| 기술 아키텍처 다이어그램 | [`../docs/6-arch-diagram.md`](../docs/6-arch-diagram.md) | 백엔드 요청 처리 계층 흐름 포함 |
| ERD | [`../docs/8-erd.md`](../docs/8-erd.md) | mermaid 엔티티 관계도 |
| DB DDL | [`../docs/8-schema.sql`](../docs/8-schema.sql) | PostgreSQL 17 스키마 |
| 실행 계획 | [`../docs/9-plan.md`](../docs/9-plan.md) | 백엔드 Task 분해, 체크리스트 |
| API 스펙 | [`../docs/swagger.json`](../docs/swagger.json) | OpenAPI 3.0 |
