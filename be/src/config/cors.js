const parseOrigins = (value) =>
  value
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) || [];

const defaultDevOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const configuredOrigins = parseOrigins(
  process.env.CORS_ORIGINS || process.env.FRONTEND_URL
);

const allowedOrigins =
  configuredOrigins.length > 0 ? configuredOrigins : defaultDevOrigins;

export const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const error = new Error('Origin is not allowed by CORS');
    error.statusCode = 403;
    return callback(error);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
