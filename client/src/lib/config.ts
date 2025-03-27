// Use Render URL in production, localhost in development
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://secureshare-hy52.onrender.com' // Render deployment URL
  : "http://localhost:3000";

export const API_ENDPOINTS = {
  FILES: "/api/files",
  TEAM_FILES: "/api/files/team",
  SHARED_FILES: "/api/shared-files",
  AUTH: "/api/auth",
  MFA: "/api/mfa",
  ADMIN: "/api/admin",
  TEAM: {
    MEMBERS: "/api/team/members",
    UPDATE_ACCESS: (userId: number) => `/api/team/members/${userId}/access`,
    REMOVE_MEMBER: (userId: number) => `/api/team/members/${userId}`,
  }
} as const; 