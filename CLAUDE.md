# b2b-promo 프로젝트의 최상위 지침

## 반드시 준수할 최우선 지침

- 모든 대화는 한국어로 할 것
- 오버엔지니어링 금지

## 개발할 때 다음 사항을 준수할 것

- 안드레 카파시의 CLAUDE.md
- https://raw.githubusercontent.com/multica-ai/andrej-karpathy-skills/refs/heads/main/CLAUDE.md

## docs 디렉토리 문서 참조

작업 전 관련 문서를 먼저 확인할 것. `1-domain-definition.md`가 모든 요구사항의 최상위 소스이며, 다른 문서와 내용이 다르면 그쪽을 도메인 정의서에 맞춰 수정한다.

| 파일 | 내용 |
|---|---|
| `docs/1-domain-definition.md` | 도메인 정의서 (액터/엔티티/유스케이스/비즈니스 규칙/MVP 범위) — 최상위 소스 |
| `docs/2-usecase.md` | 유스케이스 다이어그램(mermaid) |
| `docs/3-PRD.md` | PRD (기능/비기능 요구사항, 기술 스택, 일정) |
| `docs/4-user-scenario.md` | 사용자 시나리오 (화면별 흐름) |
| `docs/5-project-principle.md` | 프로젝트 구조 설계 원칙 (레이어/네이밍/테스트/보안, 프론트·백엔드 디렉토리 구조) |
| `docs/6-arch-diagram.md` | 기술 아키텍처 다이어그램(mermaid) |
| `docs/7-wireframe.md` | 화면 와이어프레임 (모바일/데스크탑) |
| `docs/8-erd.md` | ERD(mermaid) |
| `docs/8-schema.sql` | DB DDL (PostgreSQL 17) |
| `docs/9-plan.md` | 실행 계획 (DB/백엔드/프론트엔드 Task 분해, 체크리스트) |
| `docs/swagger.json` | OpenAPI 3.0 API 스펙 |
| `docs/assets/` | 와이어프레임 등 이미지 자산(svg) |
