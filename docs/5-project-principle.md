# 프로젝트 구조 설계 원칙

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|---|---|---|
| 0.1 | 2026-08-13 | 최초 작성 |
| 0.2 | 2026-08-13 | 환경변수 항목(DB 접속 정보, JWT 시크릿, 토큰 만료 시간) 구체화 |
| 0.3 | 2026-08-13 | 프론트엔드 디렉토리 구조에 frontend/ 최상위 폴더 추가 |

이 문서는 `1-domain-definition.md`, `2-usecase.md`, `3-PRD.md`, `4-user-scenario.md`에서 정의한 도메인/요구사항을 실제 코드로 구현할 때 따라야 할 구조·원칙을 정의한다. 3일/1인 개발 규모의 교육용 MVP를 기준으로 하며, 과도한 추상화나 확장성 대비 설계는 의도적으로 배제한다.

## 1. 최상위 원칙 (모든 스택 공통)

- **단일 저장소, 단일 문서 소스**: `docs/`의 PRD·시나리오가 유일한 요구사항 소스다. 코드가 문서와 어긋나면 문서를 먼저 갱신하고 코드를 고친다.
- **YAGNI**: PRD 8절 제외 범위(승인 워크플로우, 재고, 검색, 결제 등)에 해당하는 코드/테이블/필드/화면을 미리 만들지 않는다.
- **기능은 PRD/시나리오에 1:1로 매핑**: 문서에 없는 화면·엔드포인트·필드를 "나중에 필요할 것 같아서" 추가하지 않는다.
- **레이어는 최소한**: 프론트엔드·백엔드 모두 계층을 나누되, 그 계층이 실제로 다른 일을 할 때만 나눈다. 인터페이스 1개짜리 추상화, 팩토리 패턴, DI 컨테이너를 도입하지 않는다.
- **핵심 엔티티는 User·Sample·Application 3개뿐이다.** 여기서 벗어나는 개념(카테고리, 태그, 조직 계층 등)을 임의로 만들지 않는다.
- **날짜/상태는 계산, 저장하지 않는다**: 샘플의 예정/진행중/종료 상태는 `start_date`/`end_date`와 현재 날짜 비교로만 판단한다(별도 status 컬럼 없음). 서버가 유일한 진실 소스이며, 프론트는 서버 응답을 그대로 표시한다.
- **에러 메시지는 문서 문구 그대로 사용**: "이미 신청한 샘플입니다." 등 PRD/시나리오에 명시된 문구를 API 에러 메시지와 화면 문구에 동일하게 사용해 프론트-백엔드 간 불일치를 없앤다.
- **과잉 설계 금지 체크리스트**: repository 패턴, ORM, DI 컨테이너, 이벤트 버스, 메시지 큐, 캐싱 레이어(Redis), 마이크로서비스 분리는 이 프로젝트에서 의도적으로 배제한다. 필요해지는 시점(트래픽/팀 규모 변화)에 그때 추가한다.

## 2. 의존성/레이어 원칙

### 공통 흐름

- 프론트엔드: `Page 컴포넌트 → 커스텀 훅(쿼리/뮤테이션) → API 클라이언트 → httpClient`
- 백엔드: `routes → controllers → services → db(pool)`
- 양쪽 모두 역방향 의존 금지(하위 레이어가 상위 레이어를 import하지 않음).

### 프론트엔드

- **Zustand vs TanStack Query 책임 분리**
  - Zustand: 서버에서 오지 않거나 여러 화면이 공유해야 하는 클라이언트 상태만 담당 (accessToken, 로그인한 user 정보/role). 이 프로젝트는 `authStore` 하나로 충분하며 스토어를 과도하게 쪼개지 않는다.
  - TanStack Query: 서버에서 가져오는 모든 데이터(샘플 목록/상세, 신청 현황, 내 정보)를 담당. 별도 로컬 캐시를 만들지 않고 `queryClient.invalidateQueries`로 최신화한다.
  - 샘플 신청/취소 후에는 mutation의 `onSuccess`에서 관련 쿼리만 invalidate한다(전역 리페치 금지).
- 인증 토큰은 `authStore`에 저장하고 `httpClient` 인터셉터가 참조한다(컴포넌트가 직접 토큰을 다루지 않음).
- 역할(Admin/Buyer) 분기는 라우터 레벨(`ProtectedRoute`/역할별 라우트 그룹)에서 처리하고, 컴포넌트 내부의 `if (role === 'ADMIN')` 남발을 피한다.
- feature 폴더 간 직접 import를 금지한다(예: `sample`이 `application` 내부 파일을 import하지 않음). 공유가 필요하면 `shared/types.ts`로 승격한다.

### 백엔드

- **controller 책임**: 요청 파싱, 입력 검증(필수값/형식), service 호출, 응답 포맷팅. 비즈니스 로직(신청 유일성, 기간 판정)은 두지 않는다.
- **service 책임**: 비즈니스 규칙 + DB 트랜잭션. pg client를 직접 사용한다.
- **신청 유일성 보장(2중 방어)**
  1. DB: `applications` 테이블에 `UNIQUE (sample_id, buyer_id)` 제약을 건다. 이것이 최종 방어선이다.
  2. 서비스: `INSERT ... ON CONFLICT (sample_id, buyer_id) DO UPDATE SET status = 'APPLIED' WHERE applications.status = 'CANCELLED'` 형태의 단일 UPSERT로 신청/재신청을 원자적으로 처리한다(2단계 SELECT-후-분기 로직 지양, 레이스 컨디션 방지).
  - 이미 APPLIED 상태에서 재신청 시도는 UPSERT의 `WHERE` 조건에 걸려 갱신되지 않으므로, 갱신 행 수를 확인해 "이미 신청한 샘플입니다" 에러를 반환한다.
  - 취소는 단순 `UPDATE ... SET status='CANCELLED' WHERE sample_id=$1 AND buyer_id=$2 AND status='APPLIED'`.
- **기간 판정**은 목록 조회 시 DB 쿼리(`end_date >= CURRENT_DATE`)로 1차 필터링하고, 신청 시점에 서비스 레벨에서 `start_date <= today <= end_date`를 재검증한다(클라이언트가 보낸 시각을 신뢰하지 않음).
- **트랜잭션**: 신청/취소는 단일 UPSERT/UPDATE 문으로 원자성이 보장되므로 명시적 `BEGIN/COMMIT`이 필요 없다. 여러 쿼리를 묶어야 하는 경우(현재 MVP엔 없음)에만 `pool.connect()` + `BEGIN/COMMIT/ROLLBACK`을 사용한다.
- 권한 분리는 `requireRole('ADMIN')` 미들웨어로 라우트 단위에서 차단한다. 서비스 레벨에서 role을 재확인하지 않는다(과잉 방어 지양).

## 3. 코드/네이밍 원칙

### 프론트엔드

- **Page 컴포넌트**: `XxxPage.tsx`, 라우트에 매핑되는 화면 단위. 데이터 훅 호출 + 하위 UI 조합만 담당.
- **공용 컴포넌트**: `PascalCase.tsx`, 화면 종속 로직 없이 props만으로 동작.
- **쿼리 훅**: `useXxxQueries.ts`에 조회(단수/목록) 함수들을 모음. 파일당 하나의 도메인 리소스.
- **뮤테이션 훅**: `useXxxMutations.ts`로 조회 훅과 분리(생성/수정/삭제 vs 조회 책임 구분).
- **API 클라이언트**: `xxxApi.ts`에 fetch 함수만 정의(순수 함수, 훅 아님). 쿼리/뮤테이션 훅이 이 함수를 호출.
- **스토어**: `xxxStore.ts`, 상태+액션을 한 파일에.
- 파일당 책임 1개 원칙(컴포넌트/훅/API 클라이언트를 섞지 않음). 단, 60줄 미만의 사소한 로컬 훅은 Page 파일 내부에 인라인 허용.

### 백엔드

- 파일명: `역할.레이어.js` 형태 (`samples.controller.js`, `applications.service.js`) — Node 관례를 그대로 따름.
- DB 컬럼/테이블: `snake_case`(PostgreSQL 관례). API 응답 JSON도 별도 camelCase 변환 레이어 없이 snake_case 그대로 반환(프론트와 합의만 하면 됨).
- 라우트 경로: 복수형 명사 리소스 기준 REST(`/samples`, `/applications`), 동사는 HTTP 메서드로 표현.
- 상태값은 문자열 상수(`'APPLIED'`, `'CANCELLED'`)를 DB CHECK 제약과 코드에서 그대로 공유. 별도 enum 테이블을 만들지 않는다.
- 함수명은 동사로 시작(`createSample`, `cancelApplication`). 컨트롤러 함수명은 라우트 핸들러 역할 그대로(`create`, `list`, `detail`).

## 4. 테스트/품질 원칙

- 테스트 피라미드를 요구하지 않는다. **API 레벨 통합 테스트만** 작성한다(supertest + 테스트 DB 또는 트랜잭션 롤백).
- 최우선 테스트 대상: `applications` 도메인의 비즈니스 규칙 — 중복 신청, 취소→재신청, 신청 시작 전/종료 후 신청 거부. PRD 4.5/4.6 규칙이 여기 집중되어 있으므로 반드시 테스트로 검증한다.
- 나머지(회원가입/로그인/샘플 CRUD/마이페이지)는 happy path 1개씩만 커버한다.
- 컴포넌트/함수 단위의 mock 위주 단위 테스트나 E2E 테스트는 별도로 구성하지 않는다. 통합 테스트 한 층으로 충분하다.
- 커버리지 수치 목표(80% 등)를 강제하지 않는다 — 이 프로젝트 규모에 맞지 않는다.
- lint는 기존에 설정된 것이 있으면 사용하고, 없다면 이번 MVP에서 새로 도입하지 않는다.

## 5. 설정/보안/운영 원칙

- `.env`는 `.gitignore`에 포함하고 `.env.example`만 커밋한다. 코드에 하드코딩하지 않고 반드시 환경변수로 관리해야 하는 값은 다음과 같다.
  - **DB 접속 정보**: `DATABASE_URL` (PostgreSQL 접속 문자열: host/port/user/password/db명 포함) 형태로 한 번에 관리한다. 개별 변수(`DB_HOST`, `DB_PORT` 등)로 쪼개지 않는다.
  - **JWT 시크릿**: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`을 access/refresh용으로 분리해서 관리한다(같은 시크릿 재사용 금지 — 하나가 유출돼도 다른 토큰까지 위조되지 않도록).
  - **토큰 만료 시간**: `JWT_ACCESS_EXPIRES_IN`(예: `1h`), `JWT_REFRESH_EXPIRES_IN`(예: `14d`)로 관리해 코드 수정 없이 정책을 조정할 수 있게 한다.
  - 그 외: `PORT`.
- 서버 기동 시 필수 환경변수 누락을 검증하고, 누락 시 즉시 종료한다(런타임 중 undefined로 조용히 실패하지 않게).
- 비밀번호는 `bcrypt`(또는 Node 내장 `crypto.scrypt`) 중 하나만 선택해 해시로 저장한다. salt rounds는 라이브러리 기본값을 사용한다.
- JWT는 access token(짧은 만료, `JWT_ACCESS_EXPIRES_IN`)과 refresh token(긴 만료, `JWT_REFRESH_EXPIRES_IN`)을 함께 사용한다. refresh token은 DB 저장 없이 stateless 검증으로 시작한다(블랙리스트/회전 로직은 MVP 범위 밖 — 필요해지면 추가).
- CORS는 프론트 개발 서버 origin만 명시적으로 허용한다.
- rate limit, API 게이트웨이, 서비스 디스커버리, 분산 트레이싱은 이 규모(단일 Express 서버, 1인 개발)에 불필요하므로 도입하지 않는다.
- 로깅은 `console.log`/`console.error` 수준으로 충분하다. 구조화 로깅(Winston, correlation ID 등)은 도입하지 않는다.
- DB 마이그레이션은 SQL 파일을 순서대로 수동 실행한다(마이그레이션 프레임워크 도입은 3일짜리 프로젝트에 과함).

## 6. 프론트엔드 디렉토리 구조

```
frontend/
└── src/
    ├── app/                      # 앱 진입/전역 설정
    │   ├── App.tsx               # 라우터 마운트
    │   ├── router.tsx            # 라우트 정의 (역할별 라우트 분리)
    │   ├── queryClient.ts        # TanStack Query client 설정
    │   └── ProtectedRoute.tsx    # 인증 가드 (미인증 시 /login 리다이렉트)
    │
    ├── features/                 # 기능 단위 (도메인 기준, 계층 아님)
    │   ├── auth/
    │   │   ├── LoginPage.tsx
    │   │   ├── SignupPage.tsx
    │   │   ├── useAuthMutations.ts   # login/signup mutation
    │   │   └── authApi.ts
    │   ├── sample/
    │   │   ├── SampleListPage.tsx        # Buyer용 목록
    │   │   ├── SampleDetailPage.tsx      # Buyer용 상세 + 신청/취소 버튼
    │   │   ├── SampleAdminListPage.tsx   # Admin용 등록/수정 목록
    │   │   ├── SampleFormPage.tsx        # Admin용 등록/수정 폼
    │   │   ├── useSampleQueries.ts       # useSampleList, useSampleDetail
    │   │   ├── useSampleMutations.ts     # useCreateSample, useUpdateSample
    │   │   └── sampleApi.ts
    │   ├── application/
    │   │   ├── ApplicationStatusPage.tsx  # Admin: 샘플별 신청 현황
    │   │   ├── MyApplicationsPage.tsx     # Buyer: 내 신청 내역
    │   │   ├── useApplicationQueries.ts
    │   │   ├── useApplicationMutations.ts # useApply, useCancelApply
    │   │   └── applicationApi.ts
    │   └── mypage/
    │       ├── MyPage.tsx
    │       ├── useMyPageMutations.ts     # 정보수정/비밀번호변경
    │       └── myPageApi.ts
    │
    ├── stores/
    │   └── authStore.ts           # Zustand: accessToken, user(role), login/logout 액션
    │
    ├── shared/
    │   ├── components/            # Button, Input, Card, Modal 등 공용 UI
    │   ├── layouts/                # AdminLayout, BuyerLayout (반응형 헤더/네브)
    │   ├── httpClient.ts           # fetch/axios 인스턴스, 401 시 refresh 처리
    │   └── types.ts                # Sample, Application, User 등 공용 타입
    │
    ├── main.tsx
    └── index.css                   # 반응형 기본 스타일
```

`features/*`는 화면(Page)과 그 화면 전용 훅/API만 포함한다. 공용 컴포넌트만 `shared`로 분리하고, 최상위에 별도의 `components/`, `hooks/`, `api/` 계층을 두지 않아 관련 파일을 기능 폴더 안에서 한 번에 찾을 수 있게 한다.

## 7. 백엔드 디렉토리 구조

```
backend/
├── src/
│   ├── app.js                 # Express 앱 생성, 미들웨어/라우터 조립
│   ├── server.js              # 서버 기동(listen), graceful shutdown
│   ├── config/
│   │   └── env.js             # process.env 읽고 검증(누락 시 기동 실패)
│   ├── db/
│   │   ├── pool.js            # pg Pool 인스턴스 1개
│   │   └── migrations/
│   │       ├── 001_create_users.sql
│   │       ├── 002_create_samples.sql
│   │       └── 003_create_applications.sql
│   ├── middlewares/
│   │   ├── auth.js            # JWT access token 검증, req.user 세팅
│   │   ├── requireRole.js      # role(ADMIN/BUYER) 체크
│   │   └── errorHandler.js    # 공통 에러 응답 포맷
│   ├── routes/
│   │   ├── index.js           # 라우터 등록 집합
│   │   ├── auth.routes.js     # /auth/signup, /auth/login, /auth/refresh
│   │   ├── samples.routes.js  # /samples (목록/상세/등록/수정)
│   │   ├── applications.routes.js # /applications (신청/취소/내 내역/현황)
│   │   └── users.routes.js    # /users/me (마이페이지)
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── samples.controller.js
│   │   ├── applications.controller.js
│   │   └── users.controller.js
│   ├── services/
│   │   ├── auth.service.js        # 해시/JWT 발급, 검증 로직
│   │   ├── samples.service.js     # 샘플 등록/수정/조회 + 기간 판정
│   │   ├── applications.service.js # 신청/취소 트랜잭션, 유일성 보장
│   │   └── users.service.js
│   └── utils/
│       ├── AppError.js        # 상태코드+메시지 갖는 커스텀 에러
│       └── asyncHandler.js    # 컨트롤러 try/catch 래퍼
├── tests/
│   ├── applications.test.js   # 신청/취소/재신청/중복/기간 규칙 통합 테스트
│   ├── auth.test.js
│   └── samples.test.js
├── .env.example
├── package.json
└── README.md
```

`routes → controllers → services → db` 4단만 사용하고, `repository`/`dto`/`mapper` 등의 추가 레이어는 두지 않는다(pg 쿼리는 service에서 직접 작성). 폴더당 파일 하나가 원칙이며, 기능별로 잘게 쪼개지 않고 엔티티(User/Sample/Application) 단위로 파일을 유지한다.
