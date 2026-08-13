# 실행 계획

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|---|---|---|
| 0.1 | 2026-08-13 | 최초 작성 |
| 0.2 | 2026-08-13 | 의존 관계 다이어그램에 Task 명칭 표기 및 레이어별 그룹화 |
| 0.3 | 2026-08-13 | BE-6/BE-7 엔드포인트 서술을 swagger.json 기준으로 구체화(PATCH /applications/:id, PUT /users/me/password) |
| 0.4 | 2026-08-13 | DB-1 완료 조건 체크 (b2b_promo DB 생성, DATABASE_URL 접속 확인) |
| 0.5 | 2026-08-13 | DB-2 완료 조건 체크 (테이블/제약 생성 확인, migrations 파일 배치, UNIQUE 위반 테스트) |
| 0.6 | 2026-08-13 | DB-3 완료 조건 체크 (관리자 계정, 신청 예정/가능/종료 샘플 각 1건 삽입) |
| 0.7 | 2026-08-13 | BE-1 완료 조건 체크 (Express 초기 설정, env 검증, /health, 테스트 9개 통과) |

## 1. 개요

`1-domain-definition.md` ~ `8-schema.sql`에서 정의한 요구사항을 데이터베이스 / 백엔드 / 프론트엔드 단위의 독립 Task로 분해한 실행 계획이다. PRD 7절 기준으로 3일·1인 개발을 전제로 하며, MVP 제외 범위(승인 워크플로우, 재고, 검색, 결제 등)에 해당하는 Task는 포함하지 않는다.

- Task ID 규칙: `DB-n`(데이터베이스), `BE-n`(백엔드), `FE-n`(프론트엔드)
- 각 Task는 선행 Task가 끝나면 독립적으로 착수 가능하다.
- 완료 조건의 체크박스가 모두 채워져야 해당 Task를 완료로 본다.

## 2. Task 의존 관계 요약

```mermaid
flowchart LR
    subgraph DB["데이터베이스"]
        DB1["DB-1<br/>PostgreSQL 17 환경 준비"]
        DB2["DB-2<br/>스키마 적용"]
        DB3["DB-3<br/>초기 데이터 투입"]
    end

    subgraph BE["백엔드"]
        BE1["BE-1<br/>백엔드 프로젝트 초기 설정"]
        BE2["BE-2<br/>DB 연결 및 공통 인프라"]
        BE3["BE-3<br/>인증 API"]
        BE4["BE-4<br/>인증·권한 미들웨어"]
        BE5["BE-5<br/>샘플 API"]
        BE6["BE-6<br/>신청 API"]
        BE7["BE-7<br/>마이페이지 API"]
        BE8["BE-8<br/>통합 테스트"]
    end

    subgraph FE["프론트엔드"]
        FE1["FE-1<br/>프론트엔드 프로젝트 초기 설정"]
        FE2["FE-2<br/>인증 기반 구성"]
        FE3["FE-3<br/>로그인 / 회원가입 화면"]
        FE4["FE-4<br/>공용 레이아웃 및 컴포넌트"]
        FE5["FE-5<br/>샘플 목록 / 상세"]
        FE6["FE-6<br/>샘플 신청·취소 / 내 신청 내역"]
        FE7["FE-7<br/>관리자 샘플 관리"]
        FE8["FE-8<br/>관리자 신청 현황"]
        FE9["FE-9<br/>마이페이지"]
        FE10["FE-10<br/>반응형 전체 점검"]
    end

    DB1 --> DB2 --> DB3
    BE1 --> BE2
    DB2 --> BE2
    BE2 --> BE3 --> BE4
    BE4 --> BE5 --> BE6
    BE4 --> BE7
    BE6 --> BE8
    BE7 --> BE8
    FE1 --> FE2 --> FE3
    BE3 --> FE2
    FE2 --> FE4
    FE4 --> FE5 --> FE6
    FE4 --> FE7 --> FE8
    FE4 --> FE9
    BE5 --> FE5
    BE6 --> FE6
    BE5 --> FE7
    BE6 --> FE8
    BE7 --> FE9
    FE6 --> FE10
    FE8 --> FE10
    FE9 --> FE10
```

## 3. 데이터베이스 Task

### DB-1. PostgreSQL 17 환경 준비

- **선행 Task**: 없음
- **작업 내용**
  - PostgreSQL 17 설치 또는 기존 인스턴스 확보
  - 프로젝트 전용 데이터베이스와 접속 계정 생성
  - `DATABASE_URL` 접속 문자열 확정 (`5-project-principle.md` 5절 기준)
- **완료 조건**
  - [x] PostgreSQL 17 인스턴스에 접속 가능하다
  - [x] 프로젝트 전용 데이터베이스가 생성되어 있다
  - [x] `DATABASE_URL` 형태의 접속 문자열로 psql 접속이 성공한다

### DB-2. 스키마 적용

- **선행 Task**: DB-1
- **작업 내용**
  - `docs/8-schema.sql`을 대상 데이터베이스에 실행
  - `backend/src/db/migrations/` 아래에 동일 DDL을 순번 파일로 배치(`5-project-principle.md` 7절 구조)
- **완료 조건**
  - [x] `users`, `samples`, `applications` 3개 테이블이 생성되어 있다
  - [x] `users.email` UNIQUE, `applications (sample_id, user_id)` UNIQUE 제약이 존재한다
  - [x] `account_type`, `status` CHECK 제약과 `end_date >= start_date` CHECK 제약이 존재한다
  - [x] 동일 `(sample_id, user_id)`로 INSERT를 2회 시도하면 두 번째가 UNIQUE 위반으로 실패한다

### DB-3. 초기 데이터 투입

- **선행 Task**: DB-2
- **작업 내용**
  - 관리자 계정 1건 삽입(비밀번호는 해시값으로 저장)
  - 화면 확인용 샘플 데이터 3건 삽입 — 신청 예정(시작일 미래), 신청 가능(기간 내), 신청 종료(종료일 과거) 각 1건
- **완료 조건**
  - [x] `account_type = 'ADMIN'`인 사용자 1건이 존재한다
  - [x] `password_hash` 컬럼에 평문이 아닌 해시값이 저장되어 있다
  - [x] 신청 예정 / 신청 가능 / 신청 종료 상태로 판정되는 샘플이 각 1건 이상 존재한다

## 4. 백엔드 Task

### BE-1. 백엔드 프로젝트 초기 설정

- **선행 Task**: 없음
- **작업 내용**
  - `backend/` 디렉토리를 `5-project-principle.md` 7절 구조로 생성
  - Express, pg, jsonwebtoken, bcrypt(또는 crypto.scrypt) 의존성 설치
  - `config/env.js` 작성 — `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `PORT` 검증
  - `.env.example` 커밋, `.env`는 `.gitignore` 처리
- **완료 조건**
  - [x] `npm start`로 서버가 기동되고 지정 포트에서 응답한다
  - [x] 필수 환경변수를 하나 비우고 기동하면 즉시 종료된다
  - [x] `.env`가 git에 추적되지 않고 `.env.example`만 커밋되어 있다

### BE-2. DB 연결 및 공통 인프라

- **선행 Task**: BE-1, DB-2
- **작업 내용**
  - `db/pool.js`에 pg Pool 인스턴스 1개 생성
  - `utils/AppError.js`, `utils/asyncHandler.js` 작성
  - `middlewares/errorHandler.js`로 공통 에러 응답 포맷 정의
  - CORS를 프론트 개발 서버 origin으로만 허용
- **완료 조건**
  - [ ] 서버 기동 시 DB 연결이 성공한다
  - [ ] 임의의 라우트에서 `AppError`를 던지면 지정한 상태코드와 메시지 형태로 응답한다
  - [ ] 프론트 개발 서버 origin에서 호출 시 CORS 오류가 발생하지 않는다

### BE-3. 인증 API

- **선행 Task**: BE-2
- **작업 내용**
  - `POST /auth/signup` — 거래처 담당자 자가 회원가입(이메일, 비밀번호, 이름, 소속 거래처명)
  - `POST /auth/login` — 이메일/비밀번호 검증 후 access/refresh token 발급
  - `POST /auth/refresh` — refresh token으로 access token 재발급
  - 비밀번호는 해시로 저장, 응답에 절대 포함하지 않음
- **완료 조건**
  - [ ] 회원가입한 계정의 `password_hash`가 평문이 아니다
  - [ ] 중복 이메일로 회원가입하면 실패 응답을 반환한다
  - [ ] 로그인 성공 시 access token과 refresh token이 모두 반환된다
  - [ ] 만료되거나 위조된 refresh token으로 재발급을 시도하면 실패한다
  - [ ] 어떤 인증 응답에도 비밀번호(평문/해시)가 포함되지 않는다

### BE-4. 인증·권한 미들웨어

- **선행 Task**: BE-3
- **작업 내용**
  - `middlewares/auth.js` — Authorization 헤더의 access token 검증 후 `req.user` 설정
  - `middlewares/requireRole.js` — `ADMIN` / `BUYER` 역할 체크
  - 인증이 필요한 모든 라우트에 미들웨어 적용
- **완료 조건**
  - [ ] 토큰 없이 보호된 엔드포인트 호출 시 401을 반환한다
  - [ ] 만료된 access token으로 호출 시 401을 반환한다
  - [ ] BUYER 토큰으로 관리자 전용 엔드포인트 호출 시 403을 반환한다

### BE-5. 샘플 API

- **선행 Task**: BE-4
- **작업 내용**
  - `GET /samples` — 목록 조회(`end_date >= CURRENT_DATE` 필터, 신청 예정/진행중 포함)
  - `GET /samples/:id` — 상세 조회
  - `POST /samples`, `PUT /samples/:id` — 관리자 전용 등록/수정
  - 예정/진행중/종료 상태는 저장하지 않고 `start_date`/`end_date`와 현재 날짜 비교로 계산해 응답에 포함
- **완료 조건**
  - [ ] 관리자가 샘플을 등록하면 목록에 반영된다
  - [ ] BUYER 토큰으로 샘플 등록/수정을 시도하면 403을 반환한다
  - [ ] 목록 응답에 신청 종료된 샘플이 포함되지 않는다
  - [ ] 응답의 샘플 상태가 날짜 기준으로 예정/진행중이 올바르게 계산된다
  - [ ] `samples` 테이블에 상태 저장용 컬럼을 추가하지 않았다

### BE-6. 신청 API

- **선행 Task**: BE-4, BE-5
- **작업 내용**
  - `POST /applications` — 신청/재신청. `INSERT ... ON CONFLICT (sample_id, user_id) DO UPDATE SET status='APPLIED' WHERE applications.status='CANCELLED'` 단일 UPSERT로 처리
  - `PATCH /applications/:id` — 상태를 `CANCELLED`로 변경(삭제 금지)
  - `GET /applications/me` — 본인 신청 내역 조회
  - `GET /samples/:id/applications` — 관리자 전용 샘플별 신청 현황
  - 신청 시점에 `start_date <= today <= end_date`를 서버에서 재검증
- **완료 조건**
  - [ ] 동일 사용자가 동일 샘플을 재신청하면 "이미 신청한 샘플입니다." 메시지를 반환한다
  - [ ] 중복 신청 시도 후에도 해당 조합의 `applications` 레코드 수가 1건으로 유지된다
  - [ ] 취소 후 레코드가 삭제되지 않고 `status`만 `CANCELLED`로 바뀐다
  - [ ] 취소한 샘플을 기간 내 재신청하면 같은 레코드의 `status`가 `APPLIED`로 되돌아간다(레코드 id 동일)
  - [ ] 신청 시작일 이전 샘플에 신청하면 거부된다
  - [ ] 신청 종료일 당일에는 신청이 성공하고, 다음 날에는 신규 신청·재신청이 모두 거부된다
  - [ ] 관리자 신청 현황 응답에 신청/취소 상태가 모두 조회된다

### BE-7. 마이페이지 API

- **선행 Task**: BE-4
- **작업 내용**
  - `GET /users/me` — 내 정보 조회
  - `PUT /users/me` — 이름, 소속 거래처명 수정
  - `PUT /users/me/password` — 새 비밀번호를 해시로 저장
  - 관리자·거래처 담당자 공통 사용
- **완료 조건**
  - [ ] 내 정보 조회 응답에 비밀번호 관련 필드가 포함되지 않는다
  - [ ] 이름/소속 거래처명 수정 결과가 DB에 반영된다
  - [ ] 비밀번호 변경 후 기존 비밀번호로는 로그인되지 않고 새 비밀번호로 로그인된다
  - [ ] 관리자와 거래처 담당자 토큰 모두에서 동작한다

### BE-8. 통합 테스트

- **선행 Task**: BE-6, BE-7
- **작업 내용**
  - supertest 기반 API 통합 테스트 작성(`tests/` 하위)
  - `applications` 비즈니스 규칙 중심으로 작성: 중복 신청, 취소→재신청, 시작 전/종료 후 거부
  - 나머지(회원가입/로그인/샘플 CRUD/마이페이지)는 happy path 1건씩
  - 단위 테스트·E2E는 작성하지 않음
- **완료 조건**
  - [ ] 중복 신청 / 취소→재신청 / 시작 전 신청 / 종료 후 신청 4개 케이스 테스트가 존재하고 통과한다
  - [ ] 회원가입, 로그인, 샘플 등록, 마이페이지 수정의 happy path 테스트가 통과한다
  - [ ] 전체 테스트가 한 번의 명령으로 실행된다

## 5. 프론트엔드 Task

### FE-1. 프론트엔드 프로젝트 초기 설정

- **선행 Task**: 없음
- **작업 내용**
  - `frontend/` 생성, React 19 + Zustand + TanStack Query 설치
  - `5-project-principle.md` 6절 디렉토리 구조 골격 생성
  - `app/router.tsx`, `app/queryClient.ts` 설정
  - `index.css`에 768px breakpoint 기준 반응형 기본 스타일 정의(`7-wireframe.md` 2절)
- **완료 조건**
  - [ ] 개발 서버가 기동되고 기본 라우트가 렌더링된다
  - [ ] `frontend/src` 하위가 문서에 정의된 디렉토리 구조를 따른다
  - [ ] 768px 기준 breakpoint가 스타일에 정의되어 있다

### FE-2. 인증 기반 구성

- **선행 Task**: FE-1, BE-3
- **작업 내용**
  - `stores/authStore.ts` — accessToken, user(role), login/logout 액션
  - `shared/httpClient.ts` — Authorization 헤더 자동 첨부, 401 시 refresh token으로 재발급 후 재시도
  - `app/ProtectedRoute.tsx` — 미인증 시 로그인 화면으로 리다이렉트, 역할별 라우트 분기
- **완료 조건**
  - [ ] 로그인 성공 시 토큰이 `authStore`에 저장된다
  - [ ] 보호된 경로에 미인증 상태로 접근하면 로그인 화면으로 이동한다
  - [ ] access token 만료 시 refresh로 자동 재발급되어 요청이 재시도된다
  - [ ] 컴포넌트가 토큰을 직접 다루지 않고 httpClient/authStore를 통해서만 접근한다

### FE-3. 로그인 / 회원가입 화면

- **선행 Task**: FE-2
- **작업 내용**
  - `LoginPage.tsx`, `SignupPage.tsx` 구현(`7-wireframe.md` 3·4절)
  - `useAuthMutations.ts`, `authApi.ts` 작성
  - 로그인 성공 시 역할별 초기 화면으로 이동(BUYER → 샘플 목록, ADMIN → 샘플 관리 목록)
- **완료 조건**
  - [ ] 회원가입 후 해당 계정으로 로그인된다
  - [ ] 로그인 실패 시 오류 메시지가 화면에 표시된다
  - [ ] 역할에 따라 로그인 후 이동 화면이 달라진다
  - [ ] 모바일/데스크탑 폭에서 와이어프레임과 동일한 배치로 표시된다

### FE-4. 공용 레이아웃 및 컴포넌트

- **선행 Task**: FE-2
- **작업 내용**
  - `shared/layouts/`에 AdminLayout, BuyerLayout 구현(반응형 헤더/네비게이션)
  - `shared/components/`에 Button, Input, Card 등 공용 UI 구현
  - `shared/types.ts`에 User, Sample, Application 타입 정의(`8-erd.md` 기준)
- **완료 조건**
  - [ ] 모바일에서 네비게이션이 세로, 데스크탑에서 가로 한 줄로 배치된다
  - [ ] 공용 컴포넌트가 화면 종속 로직 없이 props만으로 동작한다
  - [ ] feature 폴더 간 직접 import가 없다

### FE-5. 샘플 목록 / 상세 (거래처 담당자)

- **선행 Task**: FE-4, BE-5
- **작업 내용**
  - `SampleListPage.tsx`, `SampleDetailPage.tsx` 구현(`7-wireframe.md` 5·6절)
  - `useSampleQueries.ts`, `sampleApi.ts` 작성
  - 신청 예정 / 신청 가능 상태를 화면에 표시
- **완료 조건**
  - [ ] 목록에 이미지, 샘플명, 신청 기간이 표시된다
  - [ ] 카드 클릭 시 상세 화면으로 이동한다
  - [ ] 모바일은 1열 카드, 데스크탑은 그리드로 전환된다
  - [ ] 상세 화면이 모바일은 세로, 데스크탑은 좌우 2단으로 배치된다

### FE-6. 샘플 신청 / 취소 및 내 신청 내역

- **선행 Task**: FE-5, BE-6
- **작업 내용**
  - 샘플 상세의 신청/취소 버튼 및 `useApplicationMutations.ts` 구현
  - `MyApplicationsPage.tsx` 구현(`7-wireframe.md` 7절) — 상태별 취소/재신청 버튼
  - mutation 성공 시 관련 쿼리만 invalidate
- **완료 조건**
  - [ ] 신청 후 내 신청 내역에 '신청' 상태로 표시된다
  - [ ] 중복 신청 시 "이미 신청한 샘플입니다." 문구가 화면에 표시된다
  - [ ] 취소 후 상태가 '취소'로 바뀌고 재신청 버튼이 노출된다
  - [ ] 신청 시작일 이전 / 종료일 경과 샘플은 신청 버튼이 비활성화되거나 노출되지 않는다
  - [ ] 신청/취소 후 전역 리페치 없이 관련 쿼리만 갱신된다

### FE-7. 관리자 샘플 관리 (목록 / 등록·수정)

- **선행 Task**: FE-4, BE-5
- **작업 내용**
  - `SampleAdminListPage.tsx`, `SampleFormPage.tsx` 구현(`7-wireframe.md` 8절)
  - `useSampleMutations.ts` 작성(등록/수정 공용 폼)
- **완료 조건**
  - [ ] 관리자가 샘플을 등록하면 관리 목록에 반영된다
  - [ ] 기존 샘플 수정 내용이 저장된다
  - [ ] 모바일은 카드, 데스크탑은 표 형태로 목록이 표시된다
  - [ ] 거래처 담당자 계정으로는 해당 화면에 접근할 수 없다

### FE-8. 관리자 신청 현황 화면

- **선행 Task**: FE-7, BE-6
- **작업 내용**
  - `ApplicationStatusPage.tsx` 구현(`7-wireframe.md` 9절)
  - `useApplicationQueries.ts`에 샘플별 신청 현황 조회 추가
- **완료 조건**
  - [ ] 선택한 샘플의 신청 거래처명, 담당자명, 상태가 표시된다
  - [ ] 신청/취소 상태가 모두 조회된다
  - [ ] 모바일은 카드, 데스크탑은 표 형태로 표시된다

### FE-9. 마이페이지

- **선행 Task**: FE-4, BE-7
- **작업 내용**
  - `MyPage.tsx`, `useMyPageMutations.ts`, `myPageApi.ts` 구현(`7-wireframe.md` 10절)
  - 내 정보 수정 영역과 비밀번호 변경 영역 분리
- **완료 조건**
  - [ ] 내 정보(이름, 소속 거래처명) 수정이 저장되고 화면에 반영된다
  - [ ] 비밀번호 변경 후 새 비밀번호로 재로그인된다
  - [ ] 관리자·거래처 담당자 모두 동일 화면을 이용할 수 있다
  - [ ] 데스크탑에서 두 영역이 좌우 2단으로 배치된다

### FE-10. 반응형 전체 점검

- **선행 Task**: FE-6, FE-8, FE-9
- **작업 내용**
  - 전 화면을 모바일(360px) / 데스크탑(1280px) 폭에서 확인
  - `7-wireframe.md` 2절 반응형 원칙과 실제 구현 대조
- **완료 조건**
  - [ ] 8개 화면 모두 모바일 폭에서 가로 스크롤 없이 표시된다
  - [ ] 목록형 화면이 데스크탑에서 표 또는 그리드로 전환된다
  - [ ] 상세·폼 화면이 데스크탑에서 2단 배치로 전환된다
  - [ ] 별도 모바일 전용 화면 없이 단일 코드베이스로 대응된다

## 6. 일정 배분 (3일 기준)

| 일차 | 대상 Task |
|---|---|
| 1일차 | DB-1, DB-2, DB-3, BE-1, BE-2, BE-3, BE-4, FE-1 |
| 2일차 | BE-5, BE-6, BE-7, FE-2, FE-3, FE-4, FE-5 |
| 3일차 | FE-6, FE-7, FE-8, FE-9, BE-8, FE-10 |

프론트엔드가 백엔드 API에 의존하므로, 백엔드 API를 하루 앞서 완료하는 순서를 유지한다. 일정이 밀릴 경우 BE-8(통합 테스트)의 happy path 부분을 축소하되, `applications` 비즈니스 규칙 테스트 4건은 반드시 유지한다.
