const crypto = require('crypto');
const { env } = require('../config/env');

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function decodeBase64url(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function sign(payload, options = {}) {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = options.expiresIn || env.jwt.expiresInSeconds;
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
    iss: 'zhi-college'
  };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', env.jwt.secret).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${signature}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') throw Object.assign(new Error('Token missing'), { statusCode: 401 });
  const parts = token.split('.');
  if (parts.length !== 3) throw Object.assign(new Error('Invalid token'), { statusCode: 401 });

  const [encodedHeader, encodedPayload, signature] = parts;
  const expected = crypto.createHmac('sha256', env.jwt.secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    throw Object.assign(new Error('Invalid token signature'), { statusCode: 401 });
  }

  const payload = JSON.parse(decodeBase64url(encodedPayload));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw Object.assign(new Error('Token expired'), { statusCode: 401 });
  }
  return payload;
}

module.exports = { sign, verify };
