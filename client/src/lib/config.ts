export const API_BASE_URL = "http://localhost:3000";

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