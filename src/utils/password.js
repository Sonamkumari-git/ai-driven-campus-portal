const crypto = require('crypto');

const PREFIX = 'pbkdf2_sha256';
const ITERATIONS = 120000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

function isHashedPassword(value) {
  return typeof value === 'string' && value.startsWith(`${PREFIX}$`);
}

function hashPassword(password) {
  const plain = String(password || '');
  if (isHashedPassword(plain)) return plain;
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(plain, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `${PREFIX}$${ITERATIONS}$${salt}$${hash}`;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'hex');
  const right = Buffer.from(String(b || ''), 'hex');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function verifyPassword(password, stored) {
  const plain = String(password || '');
  const saved = String(stored || '');
  if (!saved) return false;

  if (!isHashedPassword(saved)) {
    return plain === saved;
  }

  const parts = saved.split('$');
  if (parts.length !== 4) return false;
  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expected = parts[3];
  const actual = crypto.pbkdf2Sync(plain, salt, iterations, KEY_LENGTH, DIGEST).toString('hex');
  return safeEqual(actual, expected);
}

async function upgradePlainPassword(doc, password) {
  if (!doc || isHashedPassword(doc.password)) return;
  doc.password = hashPassword(password);
  await doc.save();
}

module.exports = { hashPassword, verifyPassword, isHashedPassword, upgradePlainPassword };
