import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  mfaEnabled?: boolean;
  mfaSecret?: string | null;
  lastLogin?: Date | null;
  securityQuestion?: string;
}

interface MfaResponse {
  requireMfa: boolean;
  userId: number;
  username: string;
}

interface SecurityQuestionResponse {
  success: boolean;
  token?: string;
  question?: string;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, remember?: boolean) => Promise<MfaResponse | any>;
  register: (username: string, email: string, password: string, securityQuestion: string, securityAnswer: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  token: string | null;
  updateAuthState: (token: string | null) => Promise<boolean>;
  forgotPassword: (username: string, email: string) => Promise<void>;
  verifySecurityAnswer: (username: string, answer: string) => Promise<SecurityQuestionResponse>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  getSecurityQuestion: (username: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  // Add a function to update auth state
  const updateAuthState = async (token: string | null) => {
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const response = await apiRequest("GET", "/api/auth/me");
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return true;
      } else {
        localStorage.removeItem("token");
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("token");
      setUser(null);
      return false;
    }
  };

  // Watch for token changes
  useEffect(() => {
    const token = localStorage.getItem("token");
    updateAuthState(token);
    setLoading(false);
  }, []);

  const login = async (username: string, password: string, remember = false) => {
    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });

      const data = await response.json();

      // Check if MFA is required
      if (data.requireMfa) {
        return {
          requireMfa: true,
          userId: data.userId,
          username: data.username
        };
      }

      // Store token and update auth state
      localStorage.setItem("token", data.token);
      const success = await updateAuthState(data.token);
      
      if (!success) {
        throw new Error("Failed to authenticate user");
      }

      return data;
    } catch (error) {
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string, securityQuestion: string, securityAnswer: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/register", {
        username,
        email,
        password,
        role: "user",
        securityQuestion,
        securityAnswer
      });

      const data = await response.json();
      
      // Store token and update auth state
      localStorage.setItem("token", data.token);
      const success = await updateAuthState(data.token);
      
      if (!success) {
        throw new Error("Failed to authenticate user");
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  };

  const forgotPassword = async (username: string, email: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/forgot-password", {
        username,
        email
      });

      if (!response.ok) {
        throw new Error("Failed to process forgot password request");
      }
    } catch (error) {
      throw error;
    }
  };

  const verifySecurityAnswer = async (username: string, answer: string): Promise<SecurityQuestionResponse> => {
    try {
      const response = await apiRequest("POST", "/api/auth/verify-security-answer", {
        username,
        answer
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to verify security answer");
      }

      const data = await response.json();
      return {
        success: data.success,
        token: data.token,
        message: data.message
      };
    } catch (error) {
      console.error("Security answer verification error:", error);
      throw error;
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/reset-password", {
        token,
        newPassword
      });

      if (!response.ok) {
        throw new Error("Failed to reset password");
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  const getSecurityQuestion = async (username: string): Promise<string> => {
    try {
      const response = await apiRequest("POST", "/api/auth/get-security-question", {
        username
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch security question");
      }

      const data = await response.json();
      return data.securityQuestion;
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    token: localStorage.getItem("token"),
    updateAuthState,
    forgotPassword,
    verifySecurityAnswer,
    resetPassword,
    getSecurityQuestion,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return user && user.role === "admin" ? <>{children}</> : null;
}