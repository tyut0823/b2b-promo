const { test, after } = require('node:test');
const assert = require('node:assert');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');

const BASE_URL = 'http://localhost:3000';
const uploadedUrls = [];

after(() => {
  for (const url of uploadedUrls) {
    fs.rmSync(path.join(__dirname, '..', url), { force: true });
  }
});

function makeToken(role) {
  return jwt.sign({ sub: randomUUID(), role }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
}
const adminToken = makeToken('ADMIN');
const buyerToken = makeToken('BUYER');

function makeForm() {
  const form = new FormData();
  form.append('file', new Blob(['fake-image-bytes'], { type: 'image/png' }), 'test.png');
  return form;
}

test('ADMIN이 파일을 업로드하면 201과 url을 반환한다', async () => {
  const res = await fetch(`${BASE_URL}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: makeForm(),
  });
  const body = await res.json();
  assert.strictEqual(res.status, 201);
  assert.match(body.url, /^\/uploads\/.+\.png$/);
  uploadedUrls.push(body.url);
});

test('BUYER가 업로드하면 403을 반환한다', async () => {
  const res = await fetch(`${BASE_URL}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerToken}` },
    body: makeForm(),
  });
  assert.strictEqual(res.status, 403);
});

test('토큰 없이 업로드하면 401을 반환한다', async () => {
  const res = await fetch(`${BASE_URL}/uploads`, { method: 'POST', body: makeForm() });
  assert.strictEqual(res.status, 401);
});

test('파일 없이 업로드하면 400을 반환한다', async () => {
  const res = await fetch(`${BASE_URL}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: new FormData(),
  });
  assert.strictEqual(res.status, 400);
});

test('업로드된 파일은 /uploads/<filename>으로 접근할 수 있다', async () => {
  const uploadRes = await fetch(`${BASE_URL}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: makeForm(),
  });
  const { url } = await uploadRes.json();
  uploadedUrls.push(url);
  const fileRes = await fetch(`${BASE_URL}${url}`);
  assert.strictEqual(fileRes.status, 200);
});
