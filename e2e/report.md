# b2b-promo E2E 테스트 리포트

- **테스트 도구**: Playwright(Python), headless Chromium
  - `playwright` MCP 도구는 이번 세션에도 연결되어 있지 않아, 대신 `pip install playwright`로 설치한 실제 헤드리스 Chromium을 스크립트(`run_e2e.py`)로 직접 조작했다. MCP가 아니라는 점만 다르고, 실제 브라우저 렌더링·네트워크 요청을 사용한 것은 동일하다.
- **대상**: 이미 실행 중인 로컬 개발 서버(프론트 `http://localhost:5173`, 백엔드 `http://localhost:3000`)
- **기준 문서**: `docs/4-user-scenario.md`(관리자 시나리오 2.1~2.2, 거래처 담당자 시나리오 3.1~3.5, 공통 시나리오 4.1~4.2)
- **실행 방법**: `cd e2e && python run_e2e.py` (서버는 스크립트가 켜지 않음, 사전에 떠 있어야 함)
- **결과**: 31개 스텝 전부 PASS. 스크린샷 31장(`screenshots/`), 원시 결과는 `results.json`.

## 테스트 데이터

- 이 스크립트는 실행마다 고유한 임시 거래처 담당자 계정(`e2e-buyer-<8자리>@b2b-promo.test`)과 임시 샘플 2건("E2E 진행 샘플 `<runid>`", "E2E 예정 샘플 `<runid>`")을 만들어 사용하고, **종료 후 전부 정리(DELETE)한다.** 관리자 계정(`admin@b2b-promo.com`)은 기존 계정을 사용했고, 이름을 일시적으로 바꿔 마이페이지 수정을 검증한 뒤 원래 값("관리자")으로 되돌렸다(31번 스텝).
- 기존 시드 데이터 "신청 종료 샘플"(ENDED)에는 테스트 buyer 계정의 취소 상태 신청 1건을 DB로 직접 준비했다(신청 시작/종료일 검증 때문에 UI/API로는 이 상태에 도달할 수 없어서 픽스처로만 준비 가능). 이 신청 레코드도 종료 후 정리했다.
- 사용자가 수동으로 만든 실제 데이터("감자", "고구마" 등)는 건드리지 않았다.

## 결과 요약

| # | 화면/기능 | 시나리오 | 상태 | 스크린샷 |
|---|---|---|---|---|
| 1 | 미인증 접근 시 로그인 화면으로 리다이렉트 | 4.2 | PASS | [01](screenshots/01_unauthenticated_redirect.png) |
| 2 | 회원가입 화면 | 3.1 | PASS | [02](screenshots/02_signup_page.png) |
| 3 | 회원가입 성공 → 로그인 화면 이동 | 3.1 | PASS | [03](screenshots/03_signup_success.png) |
| 4 | 잘못된 비밀번호로 로그인 시 에러 표시 | 3.1 예외 | PASS | [04](screenshots/04_login_wrong_password.png) |
| 5 | 로그인 성공 → 샘플 목록 화면 이동 | 3.1 | PASS | [05](screenshots/05_login_success_samples.png) |
| 6 | 중복 이메일 회원가입 시 에러 표시 | 3.1 예외 | PASS | [06](screenshots/06_signup_duplicate_email.png) |
| 7 | 관리자 로그인 → 샘플 관리 화면 | 2.1 | PASS | [07](screenshots/07_admin_login.png) |
| 8 | 관리자 샘플 등록(진행중 샘플) | 2.1 | PASS | [08](screenshots/08_admin_register_ongoing.png) |
| 9 | 관리자 샘플 등록(예정 샘플) | 2.1 | PASS | [09](screenshots/09_admin_register_scheduled.png) |
| 10 | 관리자 샘플 수정 | 2.1 | PASS | [10](screenshots/10_admin_edit_sample.png) |
| 11 | 샘플 목록 조회 | 3.2 | PASS | [11](screenshots/11_sample_list.png) |
| 12 | 예정 샘플 상세 조회 및 신청 버튼 미노출 | 3.2 / 3.3 예외(시작 전) | PASS | [12](screenshots/12_sample_detail_scheduled.png) |
| 13 | 진행중 샘플 상세 조회 | 3.2 | PASS | [13](screenshots/13_sample_detail_ongoing.png) |
| 14 | 샘플 신청 | 3.3 | PASS | [14](screenshots/14_sample_apply.png) |
| 15 | 중복 신청 시 409 및 안내 문구 | 3.3 예외(중복 신청) | PASS | [15](screenshots/15_duplicate_apply.png) |
| 16 | 종료된 샘플 신규 신청 차단 | 3.3 예외(종료 후) | PASS | [16](screenshots/16_apply_after_end.png) |
| 17 | 샘플 신청 취소 | 3.4 | PASS | [17](screenshots/17_sample_cancel.png) |
| 18 | 취소 후 재신청(샘플 상세에서) | 3.4 | PASS | [18](screenshots/18_reapply_from_detail.png) |
| 19 | 내 신청 내역 조회 | 3.5 | PASS | [19](screenshots/19_my_applications.png) |
| 20 | 종료된 샘플의 취소 상태 - 재신청 버튼 비활성 | 3.4 예외(종료 후 재신청) | PASS | [20](screenshots/20_reapply_disabled_for_ended.png) |
| 21 | 내 신청 내역에서 취소 후 재신청 버튼 노출 | 3.4 | PASS | [21](screenshots/21_my_applications_cancel.png) |
| 22 | 마이페이지 진입 및 내 정보 조회 | 4.1 | PASS | [22](screenshots/22_mypage_view.png) |
| 23 | 마이페이지 내 정보 수정 | 4.1 | PASS | [23](screenshots/23_mypage_update_profile.png) |
| 24 | 마이페이지 비밀번호 변경 | 4.1 | PASS | [24](screenshots/24_mypage_change_password.png) |
| 25 | 비밀번호 변경 후 재로그인 | 4.1 | PASS | [25](screenshots/25_relogin_new_password.png) |
| 26 | 로그아웃 | 공통 | PASS | [26](screenshots/26_logout.png) |
| 27 | 로그아웃 후 보호된 화면 접근 차단 | 4.2 | PASS | [27](screenshots/27_after_logout_blocked.png) |
| 28 | 거래처 담당자의 관리자 화면 접근 차단 | 4.2(역할 기반) | PASS | [28](screenshots/28_buyer_blocked_from_admin.png) |
| 29 | 존재하지 않는 샘플 상세 조회(404) | 예외 케이스 | PASS | [29](screenshots/29_sample_not_found.png) |
| 30 | 관리자 신청 현황 조회 | 2.2 | PASS | [30](screenshots/30_admin_application_status.png) |
| 31 | 관리자 마이페이지 접근 및 수정 | 4.1 | PASS | [31](screenshots/31_admin_mypage.png) |

**31 / 31 PASS.**

## 예외/엣지 케이스 상세

- **잘못된 비밀번호(#4)**: `이메일 또는 비밀번호가 올바르지 않습니다.` 메시지 확인.
- **중복 이메일 가입(#6)**: `이미 사용 중인 이메일입니다.` 메시지 확인.
- **신청 시작 전 샘플(#12)**: 상세 조회는 가능하나 신청 버튼이 아예 렌더링되지 않음.
- **중복 신청(#15)**: 이미 APPLIED 상태에서 동일 계정의 다른 탭/세션이 다시 신청을 시도하는 상황을 재현하기 위해, 인증된 브라우저 컨텍스트의 `fetch`로 `POST /applications`를 한 번 더 호출해 백엔드가 `409 이미 신청한 샘플입니다.`를 반환하는지 직접 확인했다(프론트는 이미 신청 상태를 알면 버튼을 "신청 취소"로 바꿔버려 일반적인 클릭 흐름으로는 이 상태에 도달하기 어렵기 때문).
- **종료된 샘플 신규 신청(#16)**: UI는 신청 버튼을 노출하지 않음을 먼저 확인하고, 동일한 방식으로 백엔드에 직접 `POST /applications`를 호출해 `400 신청 기간이 아닙니다.`를 반환하는지 확인했다.
- **종료 후 재신청 차단(#20)**: 종료된 샘플에 대한 취소 상태 신청을 DB 픽스처로 준비한 뒤, 내 신청 내역 화면에서 해당 항목의 "재신청" 버튼이 `disabled` 속성을 가지고 있는지 확인했다.
- **로그아웃 후 접근 차단(#27)**, **역할 기반 접근 차단(#28)**, **존재하지 않는 샘플(#29)**: 각각 로그인 화면 리다이렉트, `/`로 리다이렉트, "샘플을 찾을 수 없습니다." 문구를 확인했다.

## 발견된 이슈 (버그 아님, 참고용 관찰)

1. **비활성 버튼의 시각적 구분 없음**: `frontend/src/index.css`에 `:disabled` 상태에 대한 스타일이 전혀 없어서, `#20` 스크린샷의 "재신청" 버튼처럼 `disabled` 속성이 걸려 있어도 겉보기에는 활성 버튼과 동일하게 보인다(클릭은 실제로 안 먹지만 사용자가 눌러도 되는 버튼처럼 착각할 수 있음). 기능적으로는 정상이나 UX 개선 여지가 있다. 이번 E2E 작업 범위 밖이라 수정하지 않았다.
2. **날짜 표시가 원본 ISO 타임스탬프**: 샘플 목록/상세/관리 화면의 신청기간이 `2026-08-13T15:00:00.000Z ~ 2026-08-26T15:00:00.000Z`처럼 그대로 노출된다(이미 `docs/9-plan.md` 0.23 변경 이력에 기록된 기존 이슈, 이번 테스트에서도 동일하게 재확인됨). 별도 날짜 포맷팅 작업이 필요하다.

## 파일 구성

```
e2e/
├── run_e2e.py          # 테스트 스크립트(재실행 가능, 자체적으로 테스트 데이터 생성/정리)
├── results.json        # 스텝별 결과 원본(JSON)
├── report.md           # 이 문서
└── screenshots/        # 스텝별 스크린샷 31장 (01~31)
```

재실행하려면 백엔드(`:3000`)와 프론트엔드(`:5173`) 개발 서버가 떠 있는 상태에서 `python run_e2e.py`를 실행하면 된다. 매 실행마다 고유한 buyer 계정과 샘플을 새로 만들고 끝나면 정리하므로 반복 실행해도 데이터가 누적되지 않는다.
