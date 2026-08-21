# 기술 아키텍처 다이어그램

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|---|---|---|
| 0.1 | 2026-08-13 | 최초 작성 |
| 0.2 | 2026-08-13 | 백엔드 요청 처리 계층 흐름 다이어그램 추가 |
| 0.3 | 2026-08-13 | "전체 시스템 구성도" 섹션 제목 추가 |
| 0.4 | 2026-08-13 | 프론트엔드 컴포넌트 구조 다이어그램 추가 |
| 0.5 | 2026-08-21 | 실제 배포 환경(Vercel, Supabase) 반영해 전체 시스템 구성도 갱신 — 프론트엔드/백엔드는 Vercel에, DB와 샘플 이미지 저장은 Supabase(Postgres + Storage)를 사용함. 프론트엔드 컴포넌트 구조에 `roulette` feature와 `rouletteStore` 추가 |

## 전체 시스템 구성도

브라우저(React 19 SPA) - 백엔드 API 서버(Express) - PostgreSQL DB로 이어지는 3단 구조다. 인증은 로그인 시 발급된 access/refresh token을 브라우저가 보관하고, API 요청마다 Express의 인증 미들웨어가 access token을 검증하며, access token 만료 시 refresh token으로 재발급받는다.

프론트엔드와 백엔드는 각각 별도의 Vercel 프로젝트로 배포되고, DB와 샘플 이미지 파일 저장은 Supabase(PostgreSQL 17 + Storage)를 사용한다. 이 두 가지(Vercel, Supabase)는 실제로 쓰는 배포/운영 인프라라 포함하며, 그 외 컨테이너 오케스트레이션·CDN·로드밸런서·API 게이트웨이 등 별도로 구축하지 않은 요소는 포함하지 않는다.

```mermaid
flowchart LR
    subgraph Client["브라우저"]
        FE["프론트엔드(Vercel)<br/>React 19<br/>Zustand + TanStack Query"]
    end

    subgraph Server["백엔드 API 서버(Vercel)"]
        API["Express<br/>routes → controllers → services"]
        AUTH["인증 미들웨어<br/>JWT access token 검증"]
    end

    subgraph Supabase["Supabase"]
        PG[("PostgreSQL 17")]
        STORAGE[("Storage<br/>sample-images 버킷")]
    end

    FE -- "HTTP 요청<br/>Authorization: Bearer access token" --> AUTH
    AUTH -- "검증 통과" --> API
    API -- "pg 라이브러리(Pool)" --> PG
    PG -- "쿼리 결과" --> API
    API -- "이미지 업로드/공개 URL 발급<br/>@supabase/supabase-js" --> STORAGE
    API -- "JSON 응답" --> FE

    FE -. "access token 만료 시<br/>refresh token으로 재발급 요청" .-> API
```

## 백엔드 요청 처리 계층 흐름

API 서버 내부는 `routes → controllers → services → db(pool)` 4단 계층으로만 구성한다(`5-project-principle.md` 2절 기준). 계층 간 역방향 호출은 없다.

```mermaid
flowchart LR
    REQ(["HTTP 요청"]) --> RT["routes<br/>URL/메서드 매핑"]
    RT --> MW["auth 미들웨어<br/>JWT 검증 · role 체크"]
    MW --> CTRL["controllers<br/>요청 파싱 · 응답 포맷팅"]
    CTRL --> SVC["services<br/>비즈니스 규칙 · 트랜잭션"]
    SVC --> POOL["db/pool.js<br/>pg Pool"]
    POOL --> PG2[("PostgreSQL 17")]
```

## 프론트엔드 컴포넌트 구조

`frontend/src` 하위 구조를 따른다(`5-project-principle.md` 6절 기준). Page 컴포넌트가 기능별 쿼리/뮤테이션 훅을 호출하고, 훅은 API 클라이언트를 거쳐 백엔드와 통신한다. 인증 상태(Zustand)는 공용으로 참조된다.

```mermaid
flowchart TD
    APP["App<br/>router + ProtectedRoute"] --> AUTHPAGE["auth<br/>Login/SignupPage"]
    APP --> SAMPLEPAGE["sample<br/>목록/상세/등록·수정 Page"]
    APP --> APPPAGE["application<br/>신청 현황/내 신청내역 Page"]
    APP --> MYPAGE["mypage<br/>MyPage"]
    APP --> ROULETTE["roulette (부가 기능)<br/>RouletteModal/ResultModal/Wheel"]

    AUTHPAGE --> HOOKS["각 feature의<br/>useXxxQueries / useXxxMutations"]
    SAMPLEPAGE --> HOOKS
    APPPAGE --> HOOKS
    MYPAGE --> HOOKS

    HOOKS --> API["xxxApi.ts"]
    API --> HTTP["shared/httpClient.ts"]

    AUTHSTORE["stores/authStore<br/>(Zustand: accessToken, user)"] -.참조.-> HTTP
    AUTHSTORE -.참조.-> APP
    ROULETTESTORE["stores/rouletteStore<br/>(Zustand+persist: 날짜별 뽑은 개수/잔여 개수)"] -.참조.-> ROULETTE
    ROULETTESTORE -.참조.-> APPPAGE
```
