import { useAuth } from "../contexts/AuthContext";

const MfaSetup: React.FC = () => {
  const [qrCode, setQrCode] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { user, updateUser } = useAuth();

  useEffect(() => {
    const setupMfa = async () => {
      try {
        const response = await mfaService.setupMfa();
        setQrCode(response.qrCode);
      } catch (error) {
        setError("Failed to setup MFA");
        console.error(error);
      }
    };

    if (!user?.mfaEnabled) {
      setupMfa();
    }
  }, [user?.mfaEnabled]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await mfaService.verifyMfa(verificationCode);
      setSuccess(response.message);
      // Update user context to reflect MFA status
      updateUser({ ...user!, mfaEnabled: true });
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to verify MFA code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await mfaService.disableMfa();
      setSuccess(response.message);
      // Update user context to reflect MFA status
      updateUser({ ...user!, mfaEnabled: false });
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to disable MFA");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default MfaSetup; 