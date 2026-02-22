/**
 * LedgerX transfer load test (k6).
 *
 * Run:
 *   1) Start LedgerX on localhost:8080
 *   2) Run: k6 run scripts/load_test.js
 *
 * Optional:
 *   BASE_URL=http://localhost:8080 k6 run scripts/load_test.js
 */

import http from 'k6/http';
import crypto from 'k6/crypto';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
  vus: 50,
  duration: '30s',
};

function uuidV4() {
  const bytes = new Uint8Array(crypto.randomBytes(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export default function () {
  const payload = JSON.stringify({
    fromAccount: 'ACC-A-001',
    toAccount: 'ACC-B-001',
    amount: 1.0,
    currency: 'USD',
  });

  const response = http.post(`${BASE_URL}/api/v1/transfers`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': uuidV4(),
    },
  });

  check(response, {
    'status is 200, 409, or 422': (r) => r.status === 200 || r.status === 409 || r.status === 422,
    'status is not 500': (r) => r.status !== 500,
  });
}
