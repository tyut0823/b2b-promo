const { test } = require('node:test');
const assert = require('node:assert');
const express = require('express');
const request = require('supertest');
const AppError = require('../src/utils/AppError');
const asyncHandler = require('../src/utils/asyncHandler');
const errorHandler = require('../src/middlewares/errorHandler');

const testApp = express();
testApp.get(
  '/__throw-app-error',
  asyncHandler(async () => {
    throw new AppError(400, '테스트 에러 메시지');
  })
);
testApp.get(
  '/__throw-unknown-error',
  asyncHandler(async () => {
    throw new Error('예상치 못한 에러');
  })
);
testApp.get(
  '/__throw-sync-error',
  asyncHandler(() => {
    throw new Error('동기 에러');
  })
);
testApp.use(errorHandler);

test('AppError를 던지면 해당 statusCode와 message를 그대로 응답한다', async () => {
  const res = await request(testApp).get('/__throw-app-error');

  assert.strictEqual(res.status, 400);
  assert.deepStrictEqual(res.body, { message: '테스트 에러 메시지' });
});

test('일반 Error를 던지면 500과 고정 메시지로 응답하고 원본 내용을 노출하지 않는다', async () => {
  const res = await request(testApp).get('/__throw-unknown-error');

  assert.strictEqual(res.status, 500);
  assert.deepStrictEqual(res.body, { message: '서버 오류가 발생했습니다.' });
  const bodyText = JSON.stringify(res.body);
  assert.ok(!bodyText.includes('예상치 못한 에러'));
  assert.ok(!bodyText.includes('at '));
});

test('asyncHandler는 동기 함수 내부에서 던진 에러도 next로 전달한다', async () => {
  const res = await request(testApp).get('/__throw-sync-error');

  assert.strictEqual(res.status, 500);
  assert.deepStrictEqual(res.body, { message: '서버 오류가 발생했습니다.' });
});
