/**
 * b2b-promo 배포된 백엔드(운영) API E2E 테스트.
 *
 * docs/4-user-scenario.md의 시나리오를 기준으로, 배포된 백엔드(https://b2b-promo.vercel.app)에
 * 실제 HTTP 요청을 보내 검증한다. 프론트엔드가 아직 배포되지 않았거나 별도 확인 대상이 아니므로
 * 브라우저 대신 API 레벨로 직접 테스트한다(회원가입/로그인/샘플/신청/마이페이지 등).
 *
 * ADMIN 계정은 자가 회원가입이 없으므로, 운영 DB(Supabase)에 직접 접속해 테스트용 ADMIN 계정을
 * bcrypt로 생성하고 끝나면 테스트 데이터(샘플/신청/두 계정)를 전부 정리한다.
 *
 * 실행: node run_e2e_prod.js  (backend/node_modules의 bcrypt, pg를 사용하므로 backend에서 실행)
 * 결과: results_prod.json, report_prod.md (이 스크립트가 report는 별도로 사람이 작성)
 */

const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const BASE = 'https://b2b-promo.vercel.app';
const HERE = __dirname;

const pool = new Pool({
  connectionString:
    'postgresql://postgres.dmtovfjybxhmydmopyeu:hxJkGq8jZvZTWF3o@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

const RUN_ID = Math.random().toString(16).slice(2, 10);
const ADMIN_EMAIL = `e2e-prod-admin-${RUN_ID}@b2b-promo.test`;
const ADMIN_PASSWORD = 'e2eProdAdmin123';
const BUYER_EMAIL = `e2e-prod-buyer-${RUN_ID}@b2b-promo.test`;
const BUYER_PASSWORD = 'e2eProdBuyer123';

const results = [];

function record(n, scenario, title, status, detail, evidence) {
  results.push({ n, scenario, title, status, detail, evidence: evidence ?? null });
  console.log(`[${status}] ${n}. (${scenario}) ${title} - ${detail}`);
}

async function step(n, scenario, title, fn) {
  try {
    const { detail, evidence } = await fn();
    record(n, scenario, title, 'PASS', detail || '', evidence);
  } catch (e) {
    record(n, scenario, title, 'FAIL', `${e.message}`, e.evidence ?? null);
  }
}

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, body: json };
}

function assert(cond, message, evidence) {
  if (!cond) {
    const err = new Error(message);
    err.evidence = evidence;
    throw err;
  }
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}
function daysFromToday(diff) {
  const d = new Date();
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

async function main() {
  // ---------- ADMIN 테스트 계정 준비 (DB 직접 삽입, 자가 회원가입 없음) ----------
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (account_type, email, password_hash, name, company_name)
     VALUES ('ADMIN', $1, $2, 'E2E운영관리자', NULL)`,
    [ADMIN_EMAIL, adminHash]
  );

  // ---------- 4.2 미인증 접근 ----------
  await step(1, '4.2', '미인증 접근 시 401', async () => {
    const r = await api('GET', '/samples');
    assert(r.status === 401, `expected 401, got ${r.status}`, r);
    return { detail: `GET /samples (토큰 없음) -> ${r.status} ${r.body?.message ?? ''}` };
  });

  // ---------- 3.1 회원가입/로그인 ----------
  await step(2, '3.1', '거래처 담당자 회원가입', async () => {
    const r = await api('POST', '/auth/signup', {
      body: { email: BUYER_EMAIL, password: BUYER_PASSWORD, name: 'E2E운영구매자', company_name: 'E2E운영상사' },
    });
    assert(r.status === 201, `expected 201, got ${r.status}`, r);
    return { detail: `POST /auth/signup -> 201 (${BUYER_EMAIL})` };
  });

  await step(3, '3.1(예외)', '중복 이메일 회원가입 시 400', async () => {
    const r = await api('POST', '/auth/signup', {
      body: { email: BUYER_EMAIL, password: BUYER_PASSWORD, name: 'E2E운영구매자', company_name: 'E2E운영상사' },
    });
    assert(r.status === 400, `expected 400, got ${r.status}`, r);
    assert(r.body?.message?.includes('이미'), `unexpected message: ${r.body?.message}`, r);
    return { detail: `POST /auth/signup(중복) -> 400 '${r.body.message}'` };
  });

  await step(4, '3.1(예외)', '잘못된 비밀번호 로그인 시 401', async () => {
    const r = await api('POST', '/auth/login', { body: { email: BUYER_EMAIL, password: 'wrong-password' } });
    assert(r.status === 401, `expected 401, got ${r.status}`, r);
    return { detail: `POST /auth/login(오답) -> 401 '${r.body?.message}'` };
  });

  let buyerAccess, buyerRefresh;
  await step(5, '3.1', '거래처 담당자 로그인 성공', async () => {
    const r = await api('POST', '/auth/login', { body: { email: BUYER_EMAIL, password: BUYER_PASSWORD } });
    assert(r.status === 200, `expected 200, got ${r.status}`, r);
    assert(r.body?.access_token && r.body?.refresh_token, 'missing tokens', r);
    buyerAccess = r.body.access_token;
    buyerRefresh = r.body.refresh_token;
    return { detail: 'POST /auth/login -> 200, access_token/refresh_token 발급' };
  });

  await step(6, '공통', 'refresh token으로 access token 재발급', async () => {
    const r = await api('POST', '/auth/refresh', { body: { refresh_token: buyerRefresh } });
    assert(r.status === 200, `expected 200, got ${r.status}`, r);
    assert(r.body?.access_token, 'missing access_token', r);
    return { detail: 'POST /auth/refresh -> 200, 새 access_token 발급' };
  });

  let adminAccess;
  await step(7, '2.1', '관리자 로그인', async () => {
    const r = await api('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
    assert(r.status === 200, `expected 200, got ${r.status}`, r);
    adminAccess = r.body.access_token;
    return { detail: 'POST /auth/login(admin) -> 200' };
  });

  // ---------- 2.1 샘플 등록/수정 ----------
  let ongoingId, scheduledId, endedId;

  await step(8, '2.1', '관리자 샘플 등록(진행중)', async () => {
    const r = await api('POST', '/samples', {
      token: adminAccess,
      body: {
        name: `E2E운영-진행중-${RUN_ID}`,
        description: '운영 E2E 테스트',
        image_url: null,
        start_date: daysFromToday(-3),
        end_date: daysFromToday(5),
      },
    });
    assert(r.status === 201, `expected 201, got ${r.status}`, r);
    assert(r.body.status === 'ONGOING', `expected ONGOING, got ${r.body.status}`, r);
    ongoingId = r.body.id;
    return { detail: `POST /samples -> 201, status=${r.body.status}` };
  });

  await step(9, '2.1', '관리자 샘플 등록(예정)', async () => {
    const r = await api('POST', '/samples', {
      token: adminAccess,
      body: {
        name: `E2E운영-예정-${RUN_ID}`,
        description: '운영 E2E 테스트',
        image_url: null,
        start_date: daysFromToday(10),
        end_date: daysFromToday(20),
      },
    });
    assert(r.status === 201, `expected 201, got ${r.status}`, r);
    assert(r.body.status === 'SCHEDULED', `expected SCHEDULED, got ${r.body.status}`, r);
    scheduledId = r.body.id;
    return { detail: `POST /samples -> 201, status=${r.body.status}` };
  });

  await step(10, '2.1', '관리자 샘플 등록(종료됨)', async () => {
    const r = await api('POST', '/samples', {
      token: adminAccess,
      body: {
        name: `E2E운영-종료-${RUN_ID}`,
        description: '운영 E2E 테스트',
        image_url: null,
        start_date: daysFromToday(-20),
        end_date: daysFromToday(-10),
      },
    });
    assert(r.status === 201, `expected 201, got ${r.status}`, r);
    endedId = r.body.id;
    // /samples/:id detail은 종료 샘플도 조회 가능해야 함
    const detailRes = await api('GET', `/samples/${endedId}`, { token: adminAccess });
    assert(detailRes.body.status === 'ENDED', `expected ENDED, got ${detailRes.body.status}`, detailRes);
    return { detail: `POST /samples -> 201, 상세조회 status=${detailRes.body.status}` };
  });

  await step(11, '2.1', '관리자 샘플 수정', async () => {
    const r = await api('PUT', `/samples/${ongoingId}`, {
      token: adminAccess,
      body: {
        name: `E2E운영-진행중-${RUN_ID}(수정)`,
        description: '수정된 설명',
        image_url: null,
        start_date: daysFromToday(-3),
        end_date: daysFromToday(5),
      },
    });
    assert(r.status === 200, `expected 200, got ${r.status}`, r);
    assert(r.body.name.includes('수정'), 'name not updated', r);
    return { detail: 'PUT /samples/:id -> 200, 수정 반영 확인' };
  });

  await step(12, '4.2(역할 기반)', '거래처 담당자의 샘플 등록 시도 시 403', async () => {
    const r = await api('POST', '/samples', {
      token: buyerAccess,
      body: { name: '권한없음', start_date: daysFromToday(0), end_date: daysFromToday(1) },
    });
    assert(r.status === 403, `expected 403, got ${r.status}`, r);
    return { detail: `POST /samples(BUYER 토큰) -> 403 '${r.body?.message}'` };
  });

  // ---------- 3.2 샘플 목록/상세 조회 ----------
  await step(13, '3.2', '샘플 목록 조회(종료 샘플 제외)', async () => {
    const r = await api('GET', '/samples', { token: buyerAccess });
    assert(r.status === 200, `expected 200, got ${r.status}`, r);
    const names = r.body.map((s) => s.name);
    assert(names.some((n) => n.includes('진행중')), 'ongoing sample missing from list', r);
    assert(names.some((n) => n.includes('예정')), 'scheduled sample missing from list', r);
    assert(!names.some((n) => n.includes('종료')), 'ended sample should be excluded from list', r);
    return { detail: `GET /samples -> 200, ${r.body.length}건, 종료 샘플은 목록에서 제외됨` };
  });

  await step(14, '3.2', '예정 샘플 상세 조회(신청 시작 전)', async () => {
    const r = await api('GET', `/samples/${scheduledId}`, { token: buyerAccess });
    assert(r.status === 200 && r.body.status === 'SCHEDULED', `unexpected: ${JSON.stringify(r.body)}`, r);
    return { detail: `GET /samples/:id -> 200, status=SCHEDULED` };
  });

  await step(15, '404 예외', '존재하지 않는 샘플 조회 시 404', async () => {
    const r = await api('GET', '/samples/00000000-0000-0000-0000-000000000000', { token: buyerAccess });
    assert(r.status === 404, `expected 404, got ${r.status}`, r);
    return { detail: `GET /samples/<없는id> -> 404 '${r.body?.message}'` };
  });

  // ---------- 3.3 샘플 신청 ----------
  let applicationId;
  await step(16, '3.3', '샘플 신청', async () => {
    const r = await api('POST', '/applications', { token: buyerAccess, body: { sample_id: ongoingId } });
    assert(r.status === 201, `expected 201, got ${r.status}`, r);
    assert(r.body.status === 'APPLIED', `expected APPLIED, got ${r.body.status}`, r);
    applicationId = r.body.id;
    return { detail: 'POST /applications -> 201, status=APPLIED' };
  });

  await step(17, '3.3(예외: 중복 신청)', '동일 샘플 중복 신청 시 409', async () => {
    const r = await api('POST', '/applications', { token: buyerAccess, body: { sample_id: ongoingId } });
    assert(r.status === 409, `expected 409, got ${r.status}`, r);
    assert(r.body.message.includes('이미'), `unexpected message: ${r.body.message}`, r);
    return { detail: `POST /applications(중복) -> 409 '${r.body.message}'` };
  });

  await step(18, '3.3(예외: 시작 전)', '신청 시작 전 샘플 신청 시 400', async () => {
    const r = await api('POST', '/applications', { token: buyerAccess, body: { sample_id: scheduledId } });
    assert(r.status === 400, `expected 400, got ${r.status}`, r);
    return { detail: `POST /applications(예정 샘플) -> 400 '${r.body.message}'` };
  });

  await step(19, '3.3(예외: 종료 후)', '신청 종료 후 샘플 신청 시 400', async () => {
    const r = await api('POST', '/applications', { token: buyerAccess, body: { sample_id: endedId } });
    assert(r.status === 400, `expected 400, got ${r.status}`, r);
    return { detail: `POST /applications(종료 샘플) -> 400 '${r.body.message}'` };
  });

  // ---------- 3.4 신청 취소 및 재신청 ----------
  await step(20, '3.4', '신청 취소', async () => {
    const r = await api('PATCH', `/applications/${applicationId}`, { token: buyerAccess, body: { status: 'CANCELLED' } });
    assert(r.status === 200 && r.body.status === 'CANCELLED', `unexpected: ${JSON.stringify(r.body)}`, r);
    return { detail: 'PATCH /applications/:id -> 200, status=CANCELLED' };
  });

  await step(21, '3.4', '취소 후 재신청(동일 레코드 상태 전환)', async () => {
    const r = await api('POST', '/applications', { token: buyerAccess, body: { sample_id: ongoingId } });
    assert(r.status === 201, `expected 201, got ${r.status}`, r);
    assert(r.body.id === applicationId, '새 레코드가 생성됨(재사용되지 않음)', r);
    assert(r.body.status === 'APPLIED', `expected APPLIED, got ${r.body.status}`, r);
    return { detail: 'POST /applications(재신청) -> 201, 동일 레코드 id 유지, status=APPLIED' };
  });

  await step(22, '3.4(예외: 종료 후 재신청)', '종료 샘플에 대한 취소 이력의 재신청 차단', async () => {
    // 먼저 종료 샘플에 대한 신청/취소 이력을 DB로 준비(기간 검증 때문에 API로는 애초에 신청 자체가 불가능)
    const buyerRows = await pool.query('SELECT id FROM users WHERE email = $1', [BUYER_EMAIL]);
    const buyerId = buyerRows.rows[0].id;
    await pool.query(
      `INSERT INTO applications (sample_id, user_id, status) VALUES ($1, $2, 'CANCELLED')
       ON CONFLICT (sample_id, user_id) DO UPDATE SET status = 'CANCELLED'`,
      [endedId, buyerId]
    );
    const r = await api('POST', '/applications', { token: buyerAccess, body: { sample_id: endedId } });
    assert(r.status === 400, `expected 400, got ${r.status}`, r);
    return { detail: `종료 샘플의 취소 이력에 재신청 시도 -> 400 '${r.body.message}' (기간 검증이 취소 이력 여부보다 먼저 적용됨)` };
  });

  // ---------- 3.5 내 신청 내역 ----------
  await step(23, '3.5', '내 신청 내역 조회', async () => {
    const r = await api('GET', '/applications/me', { token: buyerAccess });
    assert(r.status === 200, `expected 200, got ${r.status}`, r);
    assert(r.body.some((a) => a.sample_id === ongoingId && a.status === 'APPLIED'), 'ongoing application not found', r);
    assert(r.body.some((a) => a.sample_id === endedId && a.status === 'CANCELLED'), 'ended application not found', r);
    return { detail: `GET /applications/me -> 200, ${r.body.length}건 (진행중 신청 + 종료 샘플 취소 이력 포함)` };
  });

  // ---------- 2.2 관리자 신청 현황 조회 ----------
  await step(24, '2.2', '관리자 신청 현황 조회', async () => {
    const r = await api('GET', `/samples/${ongoingId}/applications`, { token: adminAccess });
    assert(r.status === 200, `expected 200, got ${r.status}`, r);
    assert(r.body.some((a) => a.user.email === BUYER_EMAIL), 'buyer application not found', r);
    return { detail: `GET /samples/:id/applications -> 200, 거래처 담당자 정보 포함 확인` };
  });

  await step(25, '4.2(역할 기반)', '거래처 담당자의 신청 현황 조회 시도 시 403', async () => {
    const r = await api('GET', `/samples/${ongoingId}/applications`, { token: buyerAccess });
    assert(r.status === 403, `expected 403, got ${r.status}`, r);
    return { detail: `GET /samples/:id/applications(BUYER 토큰) -> 403 '${r.body?.message}'` };
  });

  // ---------- 4.1 마이페이지 ----------
  await step(26, '4.1', '마이페이지 내 정보 조회', async () => {
    const r = await api('GET', '/users/me', { token: buyerAccess });
    assert(r.status === 200 && r.body.name === 'E2E운영구매자', `unexpected: ${JSON.stringify(r.body)}`, r);
    assert(r.body.password_hash === undefined, 'password_hash leaked in response', r);
    return { detail: 'GET /users/me -> 200, 민감 필드 없음 확인' };
  });

  await step(27, '4.1', '마이페이지 내 정보 수정', async () => {
    const r = await api('PUT', '/users/me', {
      token: buyerAccess,
      body: { name: 'E2E운영구매자(수정)', company_name: 'E2E운영상사(수정)' },
    });
    assert(r.status === 200 && r.body.name === 'E2E운영구매자(수정)', `unexpected: ${JSON.stringify(r.body)}`, r);
    return { detail: 'PUT /users/me -> 200, 수정 반영 확인' };
  });

  await step(28, '4.1(예외)', '현재 비밀번호 불일치 시 400', async () => {
    const r = await api('PUT', '/users/me/password', {
      token: buyerAccess,
      body: { current_password: 'wrong-current', new_password: 'newPass123' },
    });
    assert(r.status === 400, `expected 400, got ${r.status}`, r);
    return { detail: `PUT /users/me/password(현재비번 틀림) -> 400 '${r.body.message}'` };
  });

  await step(29, '4.1', '비밀번호 변경 및 재로그인', async () => {
    const r = await api('PUT', '/users/me/password', {
      token: buyerAccess,
      body: { current_password: BUYER_PASSWORD, new_password: 'newProdPass123' },
    });
    assert(r.status === 200, `expected 200, got ${r.status}`, r);
    const login = await api('POST', '/auth/login', { body: { email: BUYER_EMAIL, password: 'newProdPass123' } });
    assert(login.status === 200, `relogin failed: ${login.status}`, login);
    return { detail: 'PUT /users/me/password -> 200, 새 비밀번호로 재로그인 성공' };
  });

  // ---------- 이미지 업로드 (서버리스 환경 검증) ----------
  await step(30, 'FE-7 사후 기능', '샘플 이미지 업로드(서버리스 환경)', async () => {
    const form = new FormData();
    form.append('file', new Blob(['fake-image-bytes'], { type: 'image/png' }), 'test.png');
    const res = await fetch(`${BASE}/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccess}` },
      body: form,
    });
    const body = await res.json().catch(() => null);
    if (res.status === 201) {
      // 업로드된 파일이 실제로 서빙되는지도 확인
      const fileRes = await fetch(`${BASE}${body.url}`);
      return {
        detail: `POST /uploads -> 201 '${body.url}', 파일 서빙 확인: ${fileRes.status}`,
        evidence: { uploadStatus: res.status, fileServeStatus: fileRes.status },
      };
    }
    throw Object.assign(new Error(`POST /uploads -> ${res.status} ${JSON.stringify(body)}`), { evidence: { status: res.status, body } });
  });

  // ---------- 정리 ----------
  try {
    await pool.query('DELETE FROM applications WHERE sample_id = ANY($1)', [[ongoingId, scheduledId, endedId]]);
    await pool.query('DELETE FROM samples WHERE id = ANY($1)', [[ongoingId, scheduledId, endedId]]);
    await pool.query('DELETE FROM users WHERE email = ANY($1)', [[ADMIN_EMAIL, BUYER_EMAIL]]);
    console.log('CLEANUP OK');
  } catch (e) {
    console.error('CLEANUP FAILED:', e.message);
  } finally {
    await pool.end();
  }

  fs.writeFileSync(
    path.join(HERE, 'results_prod.json'),
    JSON.stringify({ run_id: RUN_ID, base_url: BASE, admin_email: ADMIN_EMAIL, buyer_email: BUYER_EMAIL, results }, null, 2),
    'utf8'
  );

  const failCount = results.filter((r) => r.status !== 'PASS').length;
  console.log(`\nDONE. ${results.length - failCount}/${results.length} PASS.`);
}

main().catch(async (e) => {
  console.error('FATAL:', e);
  await pool.end().catch(() => {});
  process.exit(1);
});
