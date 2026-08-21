# b2b-promo

식자재 유통사의 관리자가 등록한 상품 샘플을, 거래처(외식업체·급식업체 등) 담당자가 조회하고 직접 신청할 수 있도록 하는 B2B 샘플 신청 웹 애플리케이션입니다. (교육용 바이브코딩 실습 MVP)

## Demo Site

- 프론트엔드: https://b2b-promo-pfey.vercel.app
- 백엔드 API: https://b2b-promo.vercel.app (헬스체크: `/health`, API 문서: 프로덕션에서는 비활성화됨)

## 문서

| 문서 | 내용 |
|---|---|
| [1. 도메인 정의서](docs/1-domain-definition.md) | 액터/엔티티/유스케이스/비즈니스 규칙/MVP 범위 — 모든 요구사항의 최상위 소스 |
| [2. 유스케이스 다이어그램](docs/2-usecase.md) | 액터-기능 관계(mermaid) |
| [3. PRD](docs/3-PRD.md) | 기능/비기능 요구사항, 기술 스택, 일정 |
| [4. 사용자 시나리오](docs/4-user-scenario.md) | 화면별 흐름 |
| [5. 프로젝트 구조 설계 원칙](docs/5-project-principle.md) | 레이어/네이밍/테스트/보안, 프론트·백엔드 디렉토리 구조 |
| [6. 기술 아키텍처 다이어그램](docs/6-arch-diagram.md) | 시스템 구성도, 요청 처리 흐름(mermaid) |
| [7. 와이어프레임](docs/7-wireframe.md) | 화면별 모바일/데스크탑 와이어프레임 |
| [8. ERD](docs/8-erd.md) | 엔티티 관계도(mermaid) |
| [8. DB 스키마](docs/8-schema.sql) | PostgreSQL 17 DDL |
| [9. 실행 계획](docs/9-plan.md) | Task 분해 및 진행 체크리스트, 변경 이력 |
| [10. 스타일 가이드](docs/10-style.md) | 색상/타이포그래피/컴포넌트 스타일 |
| [API 스펙](docs/swagger.json) | OpenAPI 3.0 (Swagger) |

## 테스트용 계정

| 역할 | 이메일 | 비밀번호 |
|---|---|---|
| 관리자(Admin) | `admin@promo.com` | `asdf1234` |
| 거래처 담당자(Buyer) | `buyer@promo.com` | `asdf1234` |

## 테스트 시나리오

### 거래처 담당자 (`buyer@promo.com`)

1. 로그인 → 그날 처음 로그인이면 "일일 신청 가능 개수" 룰렛이 뜬다. STOP을 눌러 개수를 확인한다.
2. 샘플 목록에서 "신청 가능" 상태인 샘플을 선택해 상세 화면에서 신청한다.
3. 내 신청 내역에서 방금 신청한 샘플이 '신청' 상태로 보이는지 확인하고, 취소한다.
4. 취소된 샘플을 다시 신청(재신청)한다.
5. 우측 상단의 "오늘 신청 가능한 샘플 개수"를 클릭해 오늘 뽑은 룰렛 결과를 다시 확인한다.
6. 마이페이지에서 이름/소속 거래처명을 수정하고 저장한다.

### 관리자 (`admin@promo.com`)

1. 로그인 → 샘플 관리 화면으로 이동한다.
2. "+ 샘플 등록"으로 이미지 파일을 첨부해 새 샘플을 등록한다(신청 시작일/종료일 포함).
3. 등록한 샘플을 수정한다.
4. 샘플의 "신청현황"에서 위 거래처 담당자의 신청 내역(거래처명/담당자명/상태)이 보이는지 확인한다.

### 공통

- 로그아웃 후 로그인 없이 보호된 화면(`/samples`, `/admin/samples` 등)에 직접 접근하면 로그인 화면으로 이동하는지 확인한다.
- 모바일 폭(360px 부근)과 데스크탑 폭에서 각 화면의 반응형 레이아웃(카드↔표, 1단↔2단)을 확인한다.

## 로컬 실행

```bash
# 백엔드
cd backend
npm install
npm run dev        # http://localhost:3000

# 프론트엔드
cd frontend
npm install
npm run dev         # http://localhost:5173
```

환경변수는 `backend/.env.example`을 참고해 `backend/.env`를 채운다.
