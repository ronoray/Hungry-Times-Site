// src/config/api.js
// Returns the full API base URL including /api path
// Development: http://localhost:5173/api
// Production: https://ops.hungrytimes.in/api

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ops.hungrytimes.in/api';

export default API_BASE;