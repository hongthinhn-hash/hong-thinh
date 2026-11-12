const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'ht_admin_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ

function getSessionSecret() {
  return process.env.SESSION_SECRET || 'hong-thinh-dev-secret-change-in-production';
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || 'HongThinh@2026';
}

function sha256Buffer(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function verifyAdminPassword(input) {
  if (!input || typeof input !== 'string') return false;
  const expected = sha256Buffer(getAdminPassword());
  const actual = sha256Buffer(input);
  return crypto.timingSafeEqual(expected, actual);
}

function signSession(username = 'admin') {
  const payload = {
    sub: username,
    exp: Date.now() + SESSION_TTL_MS,
    nonce: crypto.randomBytes(8).toString('hex')
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySession(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(val);
  });
  return cookies;
}

function requireAdmin(req, res, next) {
  const cookies = parseCookies(req);
  const session = verifySession(cookies[SESSION_COOKIE_NAME]);
  if (!session) {
    return res.status(401).json({
      error: 'Phiên đăng nhập quản trị đã hết hạn hoặc chưa đăng nhập.',
      code: 'UNAUTHORIZED'
    });
  }
  req.admin = session;
  return next();
}

function createRateLimiter({ windowMs = 60 * 1000, max = 20, message = 'Bạn gửi yêu cầu quá nhanh, vui lòng thử lại sau ít phút.' } = {}) {
  const hits = new Map();

  // Dọn dẹp định kỳ để tránh rò rỉ bộ nhớ
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of hits.entries()) {
      const fresh = timestamps.filter((t) => now - t < windowMs);
      if (fresh.length === 0) hits.delete(ip);
      else hits.set(ip, fresh);
    }
  }, Math.max(windowMs, 60 * 1000));
  if (timer.unref) timer.unref();

  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      return res.status(429).json({ error: message, code: 'RATE_LIMITED' });
    }
    recent.push(now);
    hits.set(ip, recent);
    return next();
  };
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  verifyAdminPassword,
  signSession,
  verifySession,
  parseCookies,
  requireAdmin,
  createRateLimiter
};
