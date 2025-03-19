export const verifyMfa = async (token: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.post("/mfa/verify", { token });
    const { token: newToken } = response.data;
    
    // Update the stored token
    if (newToken) {
      localStorage.setItem("token", newToken);
    }
    
    return {
      success: true,
      message: response.data.message
    };
  } catch (error) {
    console.error("Error verifying MFA:", error);
    throw error;
  }
};

export const disableMfa = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.post("/mfa/disable");
    const { token: newToken } = response.data;
    
    // Update the stored token
    if (newToken) {
      localStorage.setItem("token", newToken);
    }
    
    return {
      success: true,
      message: response.data.message
    };
  } catch (error) {
    console.error("Error disabling MFA:", error);
    throw error;
  }
}; 