export function apiKeyAuth(req, res, next) {
  const apiKey = process.env.API_KEY;

  if (!apiKey) return next();

  const provided = req.headers['x-api-key'];

  if (!provided || provided !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized: invalid API key' });
  }

  next();
}