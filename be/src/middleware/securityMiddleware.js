const isProduction = process.env.NODE_ENV === 'production';

const sensitiveKeys = new Set([
  'password',
  'token',
  'signature',
  'privatekey',
  'adminprivatekey',
  'jwt',
]);

const maskSensitiveData = (value) => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(maskSensitiveData);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => {
      if (sensitiveKeys.has(key.toLowerCase())) {
        return [key, '[REDACTED]'];
      }

      return [key, maskSensitiveData(nestedValue)];
    })
  );
};

export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
};

export const requestLogger = (req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.log(
      `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`
    );

    if (!isProduction && process.env.DEBUG_REQUEST_BODY === 'true') {
      console.log('[HTTP BODY]', JSON.stringify(maskSensitiveData(req.body)));
    }
  });

  next();
};

export const createRateLimiter = ({
  windowMs,
  max,
  message = 'Quá nhiều yêu cầu, vui lòng thử lại sau',
  keyGenerator = (req) => req.ip,
}) => {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req);
    const bucket = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    hits.set(key, bucket);

    for (const [entryKey, entry] of hits.entries()) {
      if (entry.resetAt <= now) {
        hits.delete(entryKey);
      }
    }

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(max - bucket.count, 0)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      return res.status(429).json({ error: message });
    }

    return next();
  };
};

export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX || 300),
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  message: 'Đăng nhập quá nhiều lần, vui lòng thử lại sau',
});

export const verifyRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.VERIFY_RATE_LIMIT_MAX || 60),
  message: 'Xác minh quá nhiều lần, vui lòng thử lại sau',
});
