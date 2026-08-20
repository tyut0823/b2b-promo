// docs/4-user-scenario.md의 시나리오를 하나의 흐름으로 검증하는 E2E 테스트.
// 이미 떠 있는 개발 서버(http://localhost:3000)를 대상으로 실제 HTTP 요청을 보낸다.
const { test, after } = require('node:test');
const assert = require('node:assert');
const { randomUUID } = require('node:crypto');
const pool = require('../src/db/pool');

const BASE = 'http://localhost:3000';

function isoDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, body: json };
}

async function signupAndLogin(password = 'test1234') {
  const email = `e2e-${randomUUID()}@example.com`;
  await api('/auth/signup', { method: 'POST', body: { email, password, name: 'E2E 담당자', company_name: 'E2E거래처' } });
  const login = await api('/auth/login', { method: 'POST', body: { email, password } });
  return { email, accessToken: login.body.access_token };
}

const createdSampleIds = [];
const createdUserEmails = [];
let adminEmail, adminToken, buyerEmail, buyerToken;

test('사전 준비: 관리자 계정 승격 + 거래처 담당자 회원가입/로그인 (3.1)', async () => {
  const adminSeed = await signupAndLogin();
  adminEmail = adminSeed.email;
  createdUserEmails.push(adminEmail);
  await pool.query("UPDATE users SET account_type = 'ADMIN' WHERE email = $1", [adminEmail]);
  const adminLogin = await api('/auth/login', { method: 'POST', body: { email: adminEmail, password: 'test1234' } });
  adminToken = adminLogin.body.access_token;
  assert.ok(adminToken, '관리자 access_token 발급 확인');

  const buyer = await signupAndLogin();
  buyerEmail = buyer.email;
  buyerToken = buyer.accessToken;
  createdUserEmails.push(buyerEmail);
  assert.ok(buyerToken, '거래처 담당자 access_token 발급 확인 (3.1 회원가입/로그인)');
});

test('4.2 미인증 접근 처리: 토큰 없이 보호된 엔드포인트 호출 시 거부', async () => {
  const r1 = await api('/samples');
  assert.strictEqual(r1.status, 401, 'GET /samples 미인증 401');
  const r2 = await api('/users/me');
  assert.strictEqual(r2.status, 401, 'GET /users/me 미인증 401');
  const r3 = await api('/applications', { method: 'POST', body: { sample_id: randomUUID() } });
  assert.strictEqual(r3.status, 401, 'POST /applications 미인증 401');
});

test('2.1 관리자 - 샘플 등록/수정', async () => {
  const create = await api('/samples', {
    method: 'POST', token: adminToken,
    body: { name: `E2E샘플-${randomUUID()}`, description: '설명', start_date: isoDate(-1), end_date: isoDate(7) },
  });
  assert.strictEqual(create.status, 201, '샘플 등록 201');
  createdSampleIds.push(create.body.id);

  const list = await api('/samples', { token: buyerToken });
  assert.ok(list.body.some((s) => s.id === create.body.id), '등록한 샘플이 목록에 반영됨');

  const update = await api(`/samples/${create.body.id}`, {
    method: 'PUT', token: adminToken,
    body: { name: '수정된 샘플명', description: '수정된 설명', start_date: isoDate(-1), end_date: isoDate(7) },
  });
  assert.strictEqual(update.status, 200, '샘플 수정 200');
  assert.strictEqual(update.body.name, '수정된 샘플명', '수정 내용 반영 확인');
});

let mainSampleId;
test('3.2 거래처 담당자 - 샘플 목록/상세 조회', async () => {
  const create = await api('/samples', {
    method: 'POST', token: adminToken,
    body: { name: `E2E조회용샘플-${randomUUID()}`, description: '상세설명', start_date: isoDate(-1), end_date: isoDate(7) },
  });
  mainSampleId = create.body.id;
  createdSampleIds.push(mainSampleId);

  const detail = await api(`/samples/${mainSampleId}`, { token: buyerToken });
  assert.strictEqual(detail.status, 200, '상세 조회 200');
  assert.strictEqual(detail.body.description, '상세설명', '상세 정보 확인');
  assert.strictEqual(detail.body.status, 'ONGOING', '신청 가능 상태 계산 확인');
});

let mainApplicationId;
test('3.3 거래처 담당자 - 샘플 신청 (+예외: 중복 신청, 신청 시작 전, 신청 종료 후)', async () => {
  const apply = await api('/applications', { method: 'POST', token: buyerToken, body: { sample_id: mainSampleId } });
  assert.strictEqual(apply.status, 201, '신청 성공 201');
  assert.strictEqual(apply.body.status, 'APPLIED');
  mainApplicationId = apply.body.id;

  const dup = await api('/applications', { method: 'POST', token: buyerToken, body: { sample_id: mainSampleId } });
  assert.strictEqual(dup.status, 409, '중복 신청 409');
  assert.strictEqual(dup.body.message, '이미 신청한 샘플입니다.', '중복 신청 안내 문구 일치 (3.3 예외 흐름)');

  const scheduled = await api('/samples', {
    method: 'POST', token: adminToken,
    body: { name: `E2E시작전샘플-${randomUUID()}`, start_date: isoDate(3), end_date: isoDate(10) },
  });
  createdSampleIds.push(scheduled.body.id);
  const beforeStart = await api('/applications', { method: 'POST', token: buyerToken, body: { sample_id: scheduled.body.id } });
  assert.strictEqual(beforeStart.status, 400, '신청 시작 전 신청 거부 400');

  const ended = await api('/samples', {
    method: 'POST', token: adminToken,
    body: { name: `E2E종료후샘플-${randomUUID()}`, start_date: isoDate(-10), end_date: isoDate(-1) },
  });
  createdSampleIds.push(ended.body.id);
  const afterEnd = await api('/applications', { method: 'POST', token: buyerToken, body: { sample_id: ended.body.id } });
  assert.strictEqual(afterEnd.status, 400, '신청 종료 후 신규 신청 거부 400');
});

test('3.4 신청 취소 및 재신청 (+예외: 신청 종료 후 재신청 불가)', async () => {
  const cancel = await api(`/applications/${mainApplicationId}`, { method: 'PATCH', token: buyerToken, body: { status: 'CANCELLED' } });
  assert.strictEqual(cancel.status, 200, '취소 200');
  assert.strictEqual(cancel.body.status, 'CANCELLED');

  const { rows } = await pool.query('SELECT id FROM applications WHERE id = $1', [mainApplicationId]);
  assert.strictEqual(rows.length, 1, '취소 후에도 레코드가 삭제되지 않고 존재함');

  const reapply = await api('/applications', { method: 'POST', token: buyerToken, body: { sample_id: mainSampleId } });
  assert.strictEqual(reapply.status, 201, '재신청 성공 201');
  assert.strictEqual(reapply.body.id, mainApplicationId, '재신청 시 동일 레코드 id로 되돌아감');
  assert.strictEqual(reapply.body.status, 'APPLIED');

  // 신청 종료 후 재신청 불가: 취소 후 기간이 지난 샘플에 재신청 시도
  const endedSample = await api('/samples', {
    method: 'POST', token: adminToken,
    body: { name: `E2E취소후종료샘플-${randomUUID()}`, start_date: isoDate(-5), end_date: isoDate(0) },
  });
  createdSampleIds.push(endedSample.body.id);
  const tempApply = await api('/applications', { method: 'POST', token: buyerToken, body: { sample_id: endedSample.body.id } });
  assert.strictEqual(tempApply.status, 201);
  await api(`/applications/${tempApply.body.id}`, { method: 'PATCH', token: buyerToken, body: { status: 'CANCELLED' } });
  await pool.query('UPDATE samples SET end_date = $1 WHERE id = $2', [isoDate(-1), endedSample.body.id]);
  const reapplyAfterEnd = await api('/applications', { method: 'POST', token: buyerToken, body: { sample_id: endedSample.body.id } });
  assert.strictEqual(reapplyAfterEnd.status, 400, '신청 종료 후 재신청 거부 400');
});

test('3.5 내 신청 내역 조회', async () => {
  const mine = await api('/applications/me', { token: buyerToken });
  assert.strictEqual(mine.status, 200);
  const found = mine.body.find((a) => a.id === mainApplicationId);
  assert.ok(found, '내 신청 내역에 포함됨');
  assert.strictEqual(found.sample.id, mainSampleId, '신청 내역에 샘플 정보 포함 확인');
});

test('2.2 관리자 - 신청 현황 조회', async () => {
  const statusList = await api(`/samples/${mainSampleId}/applications`, { token: adminToken });
  assert.strictEqual(statusList.status, 200);
  const found = statusList.body.find((a) => a.id === mainApplicationId);
  assert.ok(found, '관리자 신청 현황에 포함됨');
  assert.strictEqual(found.user.email, buyerEmail, '신청한 거래처 담당자 정보 확인');
  assert.strictEqual(found.status, 'APPLIED');

  const forbidden = await api(`/samples/${mainSampleId}/applications`, { token: buyerToken });
  assert.strictEqual(forbidden.status, 403, 'BUYER 토큰으로 신청 현황 조회 시도 403');
});

test('4.1 마이페이지 (내 정보 수정/비밀번호 변경) - 거래처 담당자, 관리자 공통', async () => {
  for (const [role, token, email] of [['BUYER', buyerToken, buyerEmail], ['ADMIN', adminToken, adminEmail]]) {
    const me = await api('/users/me', { token });
    assert.strictEqual(me.status, 200, `${role} 내 정보 조회 200`);
    assert.strictEqual(me.body.password, undefined);
    assert.strictEqual(me.body.password_hash, undefined);

    const update = await api('/users/me', { method: 'PUT', token, body: { name: `${role}-수정된이름` } });
    assert.strictEqual(update.status, 200, `${role} 내 정보 수정 200`);
    assert.strictEqual(update.body.name, `${role}-수정된이름`);

    const pwChange = await api('/users/me/password', {
      method: 'PUT', token, body: { current_password: 'test1234', new_password: 'newpass1234' },
    });
    assert.strictEqual(pwChange.status, 200, `${role} 비밀번호 변경 200`);

    const oldLogin = await api('/auth/login', { method: 'POST', body: { email, password: 'test1234' } });
    assert.strictEqual(oldLogin.status, 401, `${role} 기존 비밀번호로 로그인 거부`);
    const newLogin = await api('/auth/login', { method: 'POST', body: { email, password: 'newpass1234' } });
    assert.strictEqual(newLogin.status, 200, `${role} 새 비밀번호로 로그인 성공`);
  }
});

after(async () => {
  await pool.query('DELETE FROM applications WHERE sample_id = ANY($1)', [createdSampleIds]);
  await pool.query('DELETE FROM samples WHERE id = ANY($1)', [createdSampleIds]);
  await pool.query('DELETE FROM users WHERE email = ANY($1)', [createdUserEmails]);
});
