// Vercel serverless entry point. The Express application handles all /api/*
// requests through the rewrite defined in vercel.json.
module.exports = require('../backend/server');
