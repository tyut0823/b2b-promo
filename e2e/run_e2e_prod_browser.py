"""
b2b-promo 배포된 프론트엔드+백엔드 브라우저 E2E 테스트.

docs/4-user-scenario.md의 시나리오(2.1, 2.2, 3.1~3.5, 4.1, 4.2)를 기준으로
실제 브라우저(Playwright, headless Chromium)로 배포된 프론트엔드/백엔드를
대상으로 조작하고, 화면마다 스크린샷을 남긴다.

대상:
- 프론트엔드: https://b2b-promo-pfey.vercel.app
- 백엔드: https://b2b-promo.vercel.app

이 스크립트는 테스트 픽스처(ADMIN 계정, 진행중/예정/종료 샘플, 종료 샘플에 대한
취소 상태 신청)를 준비/정리하기 위해 운영 DB(Supabase)에 직접 접근한다
(backend/node_modules의 bcrypt, pg 사용). 자격증명은 e2e/.env에서 읽는다
(하드코딩하지 않음 - e2e/.env.example 참고).

실행: NODE_PATH=<repo>/backend/node_modules python run_e2e_prod_browser.py
결과: results_prod_browser.json, screenshots_prod/*.png
"""

import json
import re
import subprocess
import uuid
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
BACKEND_DIR = HERE.parent / "backend"
SHOT_DIR = HERE / "screenshots_prod"
SHOT_DIR.mkdir(exist_ok=True)


def load_env(path):
    env = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()
    return env


ENV = load_env(HERE / ".env")
FE = ENV.get("FRONTEND_URL", "https://b2b-promo-pfey.vercel.app")
BE = ENV["PROD_BASE_URL"]
DATABASE_URL = ENV["DATABASE_URL"]

RUN_ID = uuid.uuid4().hex[:8]
ADMIN_EMAIL = f"e2e-prod-web-admin-{RUN_ID}@b2b-promo.test"
ADMIN_PASSWORD = "e2eProdWebAdmin123"
BUYER_EMAIL = f"e2e-prod-web-buyer-{RUN_ID}@b2b-promo.test"
BUYER_PASSWORD = "e2eProdWebBuyer123"
BUYER_NEW_PASSWORD = "e2eProdWebBuyerNew123"
BUYER_NAME = "E2E웹테스터"
BUYER_COMPANY = "E2E웹상사"
ONGOING_NAME = f"E2E웹 진행 샘플 {RUN_ID}"
SCHEDULED_NAME = f"E2E웹 예정 샘플 {RUN_ID}"
ENDED_NAME = f"E2E웹 종료 샘플 {RUN_ID}"

results = []

_DB_SCRIPT = BACKEND_DIR / "_e2e_db_query.js"
_DB_SCRIPT.write_text(
    "const { Pool } = require('pg');\n"
    f"const pool = new Pool({{ connectionString: {json.dumps(DATABASE_URL)}, ssl: {{ rejectUnauthorized: false }} }});\n"
    "const [sql, params] = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));\n"
    "(async () => {\n"
    "  const r = await pool.query(sql, params);\n"
    "  require('fs').writeFileSync(process.argv[3], JSON.stringify(r.rows), 'utf8');\n"
    "  await pool.end();\n"
    "})().catch(e => { console.error(e.message); process.exit(1); });\n",
    encoding="utf-8",
)


def db_query(sql, params=None):
    params = params or []
    in_path = HERE / f"_db_in_{uuid.uuid4().hex}.json"
    out_path = HERE / f"_db_out_{uuid.uuid4().hex}.json"
    in_path.write_text(json.dumps([sql, params], ensure_ascii=False), encoding="utf-8")
    try:
        result = subprocess.run(
            ["node", str(_DB_SCRIPT), str(in_path), str(out_path)],
            cwd=str(BACKEND_DIR),
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        if result.returncode != 0:
            raise RuntimeError(f"db_query failed: {result.stderr}")
        return json.loads(out_path.read_text(encoding="utf-8"))
    finally:
        in_path.unlink(missing_ok=True)
        out_path.unlink(missing_ok=True)


def bcrypt_hash(password):
    script = (
        "const bcrypt = require('bcrypt');\n"
        f"bcrypt.hash({json.dumps(password)}, 10).then(h => process.stdout.write(h));\n"
    )
    result = subprocess.run(["node", "-e", script], cwd=str(BACKEND_DIR), capture_output=True, text=True, encoding="utf-8")
    if result.returncode != 0:
        raise RuntimeError(f"bcrypt_hash failed: {result.stderr}")
    return result.stdout.strip()


def wait_for_text_in_body(page, needle, timeout=8000):
    page.wait_for_function("needle => document.body.innerText.includes(needle)", arg=needle, timeout=timeout)
    return page.inner_text("body")


def wait_for_any_text_in_body(page, needles, timeout=8000):
    page.wait_for_function(
        "needles => needles.some(n => document.body.innerText.includes(n))", arg=needles, timeout=timeout
    )
    return page.inner_text("body")


def record(n, scenario, title, status, screenshot=None, detail=""):
    results.append(
        {"n": n, "scenario": scenario, "title": title, "status": status, "screenshot": screenshot, "detail": detail}
    )
    print(f"[{status}] {n}. ({scenario}) {title} - {detail}")


def shot(page, name):
    path = SHOT_DIR / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    return f"screenshots_prod/{name}.png"


def step(n, scenario, title, page, name, fn):
    try:
        detail = fn() or ""
        shot_path = shot(page, name)
        record(n, scenario, title, "PASS", shot_path, detail)
    except Exception as e:  # noqa: BLE001
        try:
            shot_path = shot(page, name + "_FAIL")
        except Exception:
            shot_path = None
        record(n, scenario, title, "FAIL", shot_path, f"{type(e).__name__}: {e}")


def fetch_token(page):
    return page.evaluate("() => JSON.parse(localStorage.getItem('auth-storage')).state.accessToken")


def api_post(page, path, body):
    token = fetch_token(page)
    return page.evaluate(
        """
        async ({ base, path, body, token }) => {
          const res = await fetch(base + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify(body),
          });
          return { status: res.status, body: await res.json() };
        }
        """,
        {"base": BE, "path": path, "body": body, "token": token},
    )


def main():
    # ---------- ADMIN 테스트 계정 준비 (자가 회원가입 없음, DB 직접 삽입) ----------
    admin_hash = bcrypt_hash(ADMIN_PASSWORD)
    db_query(
        "INSERT INTO users (account_type, email, password_hash, name, company_name) VALUES ('ADMIN', $1, $2, 'E2E웹관리자', NULL)",
        [ADMIN_EMAIL, admin_hash],
    )

    ONGOING_ID = SCHEDULED_ID = ENDED_ID = None

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})

        # ---------- 4.2 미인증 접근 처리 ----------
        def s01():
            page.context.clear_cookies()
            page.goto(f"{FE}/")
            page.evaluate("() => localStorage.clear()")
            page.goto(f"{FE}/samples")
            page.wait_for_load_state("networkidle")
            assert page.url.rstrip("/").endswith("/login"), f"expected redirect to /login, got {page.url}"
            return "비로그인 상태로 /samples 접근 시 /login으로 리다이렉트됨"

        step(1, "4.2", "미인증 접근 시 로그인 화면으로 리다이렉트", page, "01_unauthenticated_redirect", s01)

        # ---------- 3.1 회원가입/로그인 ----------
        def s02():
            page.goto(f"{FE}/signup")
            page.wait_for_load_state("networkidle")
            return "회원가입 화면 진입"

        step(2, "3.1", "회원가입 화면", page, "02_signup_page", s02)

        def s03():
            page.fill("#email", BUYER_EMAIL)
            page.fill("#password", BUYER_PASSWORD)
            page.fill("#name", BUYER_NAME)
            page.fill("#company_name", BUYER_COMPANY)
            page.click("button[type=submit]")
            page.wait_for_url(lambda u: u.rstrip("/").endswith("/login"), timeout=15000)
            page.wait_for_load_state("networkidle")
            return f"회원가입 성공({BUYER_EMAIL}) 후 로그인 화면으로 이동"

        step(3, "3.1", "회원가입 성공 -> 로그인 화면 이동", page, "03_signup_success", s03)

        def s03b_safe():
            page.fill("#email", BUYER_EMAIL)
            page.fill("#password", "wrong-password")
            page.click("button[type=submit]")
            wait_for_any_text_in_body(page, ["올바르지", "일치", "실패", "틀렸"])
            return "잘못된 비밀번호로 로그인 시 에러 메시지 표시 확인"

        step(4, "3.1(예외)", "잘못된 비밀번호로 로그인 시 에러 표시", page, "04_login_wrong_password", s03b_safe)

        def s03c():
            page.fill("#email", BUYER_EMAIL)
            page.fill("#password", BUYER_PASSWORD)
            page.click("button[type=submit]")
            page.wait_for_url(lambda u: u.rstrip("/").endswith("/samples"), timeout=15000)
            page.wait_for_load_state("networkidle")
            return "로그인 성공 시 샘플 목록 화면으로 이동"

        step(5, "3.1", "로그인 성공 -> 샘플 목록 화면 이동", page, "05_login_success_samples", s03c)

        def s03d():
            page.goto(f"{FE}/signup")
            page.wait_for_load_state("networkidle")
            page.fill("#email", BUYER_EMAIL)
            page.fill("#password", BUYER_PASSWORD)
            page.fill("#name", BUYER_NAME)
            page.fill("#company_name", BUYER_COMPANY)
            page.click("button[type=submit]")
            wait_for_any_text_in_body(page, ["이미", "사용", "중복"])
            return "이미 가입된 이메일로 재가입 시 에러 메시지 표시"

        step(6, "3.1(예외)", "중복 이메일 회원가입 시 에러 표시", page, "06_signup_duplicate_email", s03d)

        page.goto(f"{FE}/login")
        page.wait_for_load_state("networkidle")
        page.fill("#email", BUYER_EMAIL)
        page.fill("#password", BUYER_PASSWORD)
        page.click("button[type=submit]")
        page.wait_for_url(lambda u: u.rstrip("/").endswith("/samples"), timeout=15000)
        page.wait_for_load_state("networkidle")

        # ---------- 관리자 로그인 및 E2E용 샘플 준비 ----------
        admin_page = browser.new_page(viewport={"width": 1280, "height": 900})

        def s_admin_login():
            admin_page.goto(f"{FE}/login")
            admin_page.wait_for_load_state("networkidle")
            admin_page.fill("#email", ADMIN_EMAIL)
            admin_page.fill("#password", ADMIN_PASSWORD)
            admin_page.click("button[type=submit]")
            admin_page.wait_for_url(lambda u: u.rstrip("/").endswith("/admin/samples"), timeout=15000)
            admin_page.wait_for_load_state("networkidle")
            return "관리자 로그인 성공 -> 샘플 관리 화면으로 이동"

        step(7, "2.1", "관리자 로그인 -> 샘플 관리 화면", admin_page, "07_admin_login", s_admin_login)

        def make_register(name, start_date, end_date):
            def _run():
                admin_page.goto(f"{FE}/admin/samples/new")
                admin_page.wait_for_load_state("networkidle")
                admin_page.fill("#sample-name", name)
                admin_page.fill("#sample-description", "E2E 웹 테스트용 샘플입니다.")
                admin_page.fill("#sample-start-date", start_date)
                admin_page.fill("#sample-end-date", end_date)
                with admin_page.expect_response(lambda r: r.url.endswith("/samples") and r.request.method == "POST"):
                    admin_page.click("text=저장하기")
                admin_page.wait_for_url(lambda u: u.rstrip("/").endswith("/admin/samples"), timeout=15000)
                admin_page.wait_for_load_state("networkidle")
                return f"샘플 등록: {name} ({start_date} ~ {end_date})"

            return _run

        step(8, "2.1", "관리자 샘플 등록(진행중 샘플)", admin_page, "08_admin_register_ongoing", make_register(ONGOING_NAME, "2026-08-15", "2026-08-28"))
        step(9, "2.1", "관리자 샘플 등록(예정 샘플)", admin_page, "09_admin_register_scheduled", make_register(SCHEDULED_NAME, "2026-09-10", "2026-09-20"))
        step(10, "2.1", "관리자 샘플 등록(종료 샘플)", admin_page, "10_admin_register_ended", make_register(ENDED_NAME, "2026-07-01", "2026-07-10"))

        def s_admin_edit():
            admin_page.goto(f"{FE}/admin/samples")
            admin_page.wait_for_load_state("networkidle")
            row = admin_page.locator(f"text={ONGOING_NAME}").locator("xpath=ancestor::*[contains(@class,'admin-table-row')]")
            # 상세조회 GET이 끝나기 전에 입력/제출하면 폼이 아직 비어 있어(필수 필드) 브라우저가
            # 조용히 제출을 막는다 - 실제 프로덕션 응답 지연에서 재현된 경쟁 상태. GET 응답을 기다린다.
            with admin_page.expect_response(lambda r: "/samples/" in r.url and r.request.method == "GET"):
                row.get_by_text("수정").click()
            admin_page.wait_for_load_state("networkidle")
            admin_page.get_by_label("샘플명").wait_for(timeout=8000)
            admin_page.fill("#sample-description", "E2E 웹 테스트: 수정된 설명입니다.")
            with admin_page.expect_response(lambda r: "/samples/" in r.url and r.request.method == "PUT"):
                admin_page.click("text=저장하기")
            admin_page.wait_for_url(lambda u: u.rstrip("/").endswith("/admin/samples"), timeout=15000)
            return "샘플 수정 저장 성공"

        step(11, "2.1", "관리자 샘플 수정", admin_page, "11_admin_edit_sample", s_admin_edit)

        samples_rows = db_query(
            "SELECT id, name FROM samples WHERE name = ANY($1)", [[ONGOING_NAME, SCHEDULED_NAME, ENDED_NAME]]
        )
        ONGOING_ID = next(r["id"] for r in samples_rows if r["name"] == ONGOING_NAME)
        SCHEDULED_ID = next(r["id"] for r in samples_rows if r["name"] == SCHEDULED_NAME)
        ENDED_ID = next(r["id"] for r in samples_rows if r["name"] == ENDED_NAME)

        # 픽스처: 종료된 샘플에 대한 '취소' 상태 신청 1건 (기간 검증 때문에 UI/API로는 도달 불가능한 상태)
        buyer_rows = db_query("SELECT id FROM users WHERE email = $1", [BUYER_EMAIL])
        buyer_id = buyer_rows[0]["id"]
        db_query(
            "INSERT INTO applications (sample_id, user_id, status) VALUES ($1, $2, 'CANCELLED') "
            "ON CONFLICT (sample_id, user_id) DO UPDATE SET status = 'CANCELLED'",
            [ENDED_ID, buyer_id],
        )

        # ---------- 3.2 샘플 목록/상세 조회 ----------
        def s_list():
            page.goto(f"{FE}/samples")
            wait_for_text_in_body(page, ONGOING_NAME)
            return "샘플 목록에 신청 가능한 샘플들이 표시됨(신규 등록 샘플 포함)"

        step(12, "3.2", "샘플 목록 조회", page, "12_sample_list", s_list)

        def s_detail_scheduled():
            page.goto(f"{FE}/samples/{SCHEDULED_ID}")
            page.wait_for_load_state("networkidle")
            assert page.get_by_role("button", name=re.compile("신청")).count() == 0, "예정 샘플에 신청 버튼이 보이면 안 됨"
            return "신청 시작 전(SCHEDULED) 샘플 상세: 조회는 가능하나 신청 버튼 없음"

        step(13, "3.2 / 3.3(예외: 시작 전)", "예정 샘플 상세 조회 및 신청 버튼 미노출", page, "13_sample_detail_scheduled", s_detail_scheduled)

        def s_detail_ongoing():
            page.goto(f"{FE}/samples/{ONGOING_ID}")
            page.wait_for_load_state("networkidle")
            page.get_by_role("button", name="신청하기").wait_for(timeout=8000)
            return "진행중(ONGOING) 샘플 상세: 신청하기 버튼 노출"

        step(14, "3.2", "진행중 샘플 상세 조회", page, "14_sample_detail_ongoing", s_detail_ongoing)

        # ---------- 3.3 샘플 신청 ----------
        def s_apply():
            with page.expect_response(lambda r: r.url.endswith("/applications") and r.request.method == "POST"):
                page.get_by_role("button", name="신청하기").click()
            page.get_by_role("button", name="신청 취소").wait_for(timeout=8000)
            return "신청하기 클릭 -> 신청 취소 버튼으로 전환 확인"

        step(15, "3.3", "샘플 신청", page, "15_sample_apply", s_apply)

        def s_duplicate():
            result = api_post(page, "/applications", {"sample_id": ONGOING_ID})
            assert result["status"] == 409, result
            assert "이미 신청한 샘플입니다" in result["body"]["message"], result
            page.reload()
            page.wait_for_load_state("networkidle")
            return f"이미 APPLIED 상태에서 재신청 시도 -> 409 '{result['body']['message']}'"

        step(16, "3.3(예외: 중복 신청)", "중복 신청 시 409 및 안내 문구", page, "16_duplicate_apply", s_duplicate)

        def s_apply_after_end():
            page.goto(f"{FE}/samples/{ENDED_ID}")
            page.wait_for_load_state("networkidle")
            btn_count = page.get_by_role("button", name=re.compile("신청")).count()
            result = api_post(page, "/applications", {"sample_id": ENDED_ID})
            assert btn_count == 0, "종료된 샘플에 신청 버튼이 보이면 안 됨"
            assert result["status"] == 400, result
            return f"UI는 신청 버튼을 노출하지 않음(정상), 백엔드도 신규 신청 시 400 '{result['body']['message']}' 반환 확인"

        step(17, "3.3(예외: 종료 후)", "종료된 샘플 신규 신청 차단", page, "17_apply_after_end", s_apply_after_end)

        # ---------- 3.4 신청 취소 및 재신청 ----------
        def s_cancel():
            page.goto(f"{FE}/samples/{ONGOING_ID}")
            page.wait_for_load_state("networkidle")
            with page.expect_response(lambda r: "/applications/" in r.url and r.request.method == "PATCH"):
                page.get_by_role("button", name="신청 취소").click()
            page.get_by_role("button", name="신청하기").wait_for(timeout=8000)
            return "신청 취소 클릭 -> 신청하기 버튼으로 전환(신청 가능 상태로 복귀)"

        step(18, "3.4", "샘플 신청 취소", page, "18_sample_cancel", s_cancel)

        def s_reapply_detail():
            with page.expect_response(lambda r: r.url.endswith("/applications") and r.request.method == "POST"):
                page.get_by_role("button", name="신청하기").click()
            page.get_by_role("button", name="신청 취소").wait_for(timeout=8000)
            return "취소 후 동일 샘플 재신청 성공(신청 취소 버튼 재노출)"

        step(19, "3.4", "취소 후 재신청(샘플 상세에서)", page, "19_reapply_from_detail", s_reapply_detail)

        # ---------- 3.5 내 신청 내역 조회 ----------
        def s_my_apps():
            page.goto(f"{FE}/applications/me")
            wait_for_text_in_body(page, ONGOING_NAME)
            return "내 신청 내역에 신청/취소 상태가 표시됨(종료 샘플의 취소 이력 포함)"

        step(20, "3.5", "내 신청 내역 조회", page, "20_my_applications", s_my_apps)

        def s_reapply_disabled():
            row = page.locator(f"text={ENDED_NAME}").locator("xpath=ancestor::*[contains(@class,'sample-card')]")
            btn = row.get_by_role("button", name="재신청")
            assert btn.is_disabled(), "종료된 샘플의 재신청 버튼이 비활성 상태가 아님"
            return "종료된 샘플의 취소 이력에 대해 재신청 버튼이 비활성 상태로 표시됨"

        step(21, "3.4(예외: 종료 후 재신청)", "종료된 샘플의 취소 상태 - 재신청 버튼 비활성", page, "21_reapply_disabled_for_ended", s_reapply_disabled)

        def s_reapply_from_list():
            row = page.locator(f"text={ONGOING_NAME}").locator("xpath=ancestor::*[contains(@class,'sample-card')]")
            row.get_by_role("button", name="취소").click()
            page.wait_for_timeout(500)
            row2 = page.locator(f"text={ONGOING_NAME}").locator("xpath=ancestor::*[contains(@class,'sample-card')]")
            row2.get_by_role("button", name="재신청").wait_for(timeout=8000)
            return "내 신청 내역에서 취소 -> 재신청 버튼 노출 확인"

        step(22, "3.4", "내 신청 내역에서 취소 후 재신청 버튼 노출", page, "22_my_applications_cancel", s_reapply_from_list)

        # ---------- 4.1 마이페이지 ----------
        def s_mypage_view():
            page.goto(f"{FE}/mypage")
            page.wait_for_load_state("networkidle")
            page.get_by_label("이름").wait_for(timeout=8000)
            actual = page.get_by_label("이름").input_value()
            assert actual == BUYER_NAME, f"expected {BUYER_NAME}, got {actual}"
            return "마이페이지 내 정보 프리필 확인"

        step(23, "4.1", "마이페이지 진입 및 내 정보 조회", page, "23_mypage_view", s_mypage_view)

        def s_mypage_update():
            new_company = f"{BUYER_COMPANY}(수정)"
            page.fill("#companyName", new_company)
            with page.expect_response(lambda r: r.url.endswith("/users/me") and r.request.method == "PUT"):
                page.get_by_role("button", name="내 정보 저장").click()
            page.wait_for_timeout(500)
            return f"소속 거래처명을 '{new_company}'로 수정 후 저장 성공"

        step(24, "4.1", "마이페이지 내 정보 수정", page, "24_mypage_update_profile", s_mypage_update)

        def s_mypage_password():
            page.fill("#currentPassword", BUYER_PASSWORD)
            page.fill("#newPassword", BUYER_NEW_PASSWORD)
            with page.expect_response(lambda r: r.url.endswith("/users/me/password") and r.request.method == "PUT"):
                page.get_by_role("button", name="비밀번호 변경").click()
            page.wait_for_timeout(500)
            return "비밀번호 변경 요청 성공"

        step(25, "4.1", "마이페이지 비밀번호 변경", page, "25_mypage_change_password", s_mypage_password)

        def s_relogin_new_password():
            page.evaluate("() => localStorage.clear()")
            page.goto(f"{FE}/login")
            page.wait_for_load_state("networkidle")
            page.fill("#email", BUYER_EMAIL)
            page.fill("#password", BUYER_NEW_PASSWORD)
            page.click("button[type=submit]")
            page.wait_for_url(lambda u: u.rstrip("/").endswith("/samples"), timeout=15000)
            return "변경된 새 비밀번호로 재로그인 성공"

        step(26, "4.1", "비밀번호 변경 후 재로그인", page, "26_relogin_new_password", s_relogin_new_password)

        def s_logout():
            page.get_by_role("button", name="로그아웃").click()
            page.wait_for_url(lambda u: u.rstrip("/").endswith("/login"), timeout=15000)
            return "로그아웃 클릭 -> 로그인 화면으로 이동"

        step(27, "공통", "로그아웃", page, "27_logout", s_logout)

        def s_after_logout_blocked():
            page.goto(f"{FE}/admin/samples")
            page.wait_for_load_state("networkidle")
            assert page.url.rstrip("/").endswith("/login"), page.url
            return "로그아웃 후 관리자 화면 직접 접근 시 로그인 화면으로 리다이렉트"

        step(28, "4.2", "로그아웃 후 보호된 화면 접근 차단", page, "28_after_logout_blocked", s_after_logout_blocked)

        def s_buyer_blocked_admin():
            page.goto(f"{FE}/login")
            page.wait_for_load_state("networkidle")
            page.fill("#email", BUYER_EMAIL)
            page.fill("#password", BUYER_NEW_PASSWORD)
            page.click("button[type=submit]")
            page.wait_for_url(lambda u: u.rstrip("/").endswith("/samples"), timeout=15000)
            page.goto(f"{FE}/admin/samples")
            page.wait_for_load_state("networkidle")
            assert page.url.rstrip("/") == FE.rstrip("/"), page.url
            return "BUYER 계정으로 /admin/samples 접근 시 '/'로 리다이렉트(관리자 전용 화면 차단)"

        step(29, "4.2(역할 기반)", "거래처 담당자의 관리자 화면 접근 차단", page, "29_buyer_blocked_from_admin", s_buyer_blocked_admin)

        def s_404():
            page.goto(f"{FE}/login")
            page.wait_for_load_state("networkidle")
            page.fill("#email", BUYER_EMAIL)
            page.fill("#password", BUYER_NEW_PASSWORD)
            page.click("button[type=submit]")
            page.wait_for_url(lambda u: u.rstrip("/").endswith("/samples"), timeout=15000)
            fake_id = str(uuid.uuid4())
            page.goto(f"{FE}/samples/{fake_id}")
            wait_for_text_in_body(page, "찾을 수 없습니다")
            return "존재하지 않는 샘플 id 조회 시 404 안내 문구 표시"

        step(30, "예외 케이스", "존재하지 않는 샘플 상세 조회(404)", page, "30_sample_not_found", s_404)

        # ---------- 2.2 신청 현황 조회 (관리자) ----------
        def s_admin_status():
            admin_page.goto(f"{FE}/admin/samples")
            admin_page.wait_for_load_state("networkidle")
            row = admin_page.locator(f"text={ONGOING_NAME}").locator("xpath=ancestor::*[contains(@class,'admin-table-row')]")
            row.get_by_text("신청현황").click()
            wait_for_text_in_body(admin_page, BUYER_COMPANY)
            return "관리자가 신청 현황에서 거래처명/담당자명/상태를 조회함"

        step(31, "2.2", "관리자 신청 현황 조회", admin_page, "31_admin_application_status", s_admin_status)

        def s_admin_mypage():
            admin_page.goto(f"{FE}/mypage")
            admin_page.wait_for_load_state("networkidle")
            admin_page.fill("#name", "E2E웹관리자(확인)")
            with admin_page.expect_response(lambda r: r.url.endswith("/users/me") and r.request.method == "PUT"):
                admin_page.get_by_role("button", name="내 정보 저장").click()
            admin_page.wait_for_timeout(500)
            return "관리자 계정도 동일한 마이페이지에서 정보 수정 가능함을 확인"

        step(32, "4.1", "관리자 마이페이지 접근 및 수정", admin_page, "32_admin_mypage", s_admin_mypage)

        browser.close()

    # ---------- 테스트 데이터 정리 ----------
    cleanup_notes = []
    try:
        ids = [i for i in [ONGOING_ID, SCHEDULED_ID, ENDED_ID] if i]
        if ids:
            db_query("DELETE FROM applications WHERE sample_id = ANY($1)", [ids])
            db_query("DELETE FROM samples WHERE id = ANY($1)", [ids])
        db_query("DELETE FROM users WHERE email = ANY($1)", [[ADMIN_EMAIL, BUYER_EMAIL]])
        cleanup_notes.append("E2E 테스트 샘플/신청/계정 정리 완료")
    except Exception as e:  # noqa: BLE001
        cleanup_notes.append(f"정리 중 오류: {e}")

    (HERE / "results_prod_browser.json").write_text(
        json.dumps(
            {
                "run_id": RUN_ID,
                "frontend_url": FE,
                "backend_url": BE,
                "buyer_email": BUYER_EMAIL,
                "admin_email": ADMIN_EMAIL,
                "cleanup": cleanup_notes,
                "results": results,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print("\n\nDONE. results_prod_browser.json written.")
    for n in cleanup_notes:
        print(n)


if __name__ == "__main__":
    main()
