# 유스케이스 다이어그램

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|---|---|---|
| 0.1 | 2026-08-13 | 최초 작성 |
| 0.2 | 2026-08-21 | 로그아웃 유스케이스(UC9) 추가. 일일 신청 가능 개수 룰렛은 원 도메인 밖 부가 기능이라 이 다이어그램에는 포함하지 않음(`1-domain-definition.md` 6-1절 참고) |

`1-domain-definition.md`의 2.역할(Actor), 3.핵심 엔티티, 4.주요 유스케이스를 바탕으로 작성함.

```mermaid
flowchart LR
    Admin(["관리자"])
    Buyer(["거래처 담당자"])

    subgraph Sample["샘플 관리"]
        UC1(["샘플 등록/수정"])
        UC2(["신청 현황 조회"])
    end

    subgraph Application["신청 관리"]
        UC4(["샘플 목록/상세 조회"])
        UC5(["샘플 신청"])
        UC6(["내 신청 내역 조회"])
        UC7(["신청 취소"])
    end

    subgraph User["계정 관리"]
        UC3(["회원가입/로그인"])
        UC8(["마이페이지"])
        UC9(["로그아웃"])
    end

    Admin --> UC1
    Admin --> UC2
    Admin --> UC8
    Admin --> UC9

    Buyer --> UC3
    Buyer --> UC4
    Buyer --> UC5
    Buyer --> UC6
    Buyer --> UC7
    Buyer --> UC8
    Buyer --> UC9

    UC2 -.조회 대상.-> UC5
    UC7 -.상태 변경.-> UC5
```
