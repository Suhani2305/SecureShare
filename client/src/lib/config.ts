// Dynamically determine the API URL based on environment
const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3000';
  
  // Check if we're in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  
  // In production, use the current domain
  return `${window.location.protocol}//${window.location.host}`;
};

export const API_BASE_URL = getApiUrl();

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