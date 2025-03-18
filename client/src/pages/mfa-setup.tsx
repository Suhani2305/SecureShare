import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/utils/auth";
import { Shield, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const verifyFormSchema = z.object({
  token: z.string().min(6, "Verification code must be 6 digits").max(6, "Verification code must be 6 digits"),
});

type VerifyFormValues = z.infer<typeof verifyFormSchema>;

export default function MfaSetup() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingQR, setIsFetchingQR] = useState(false);
  const { toast } = useToast();

  const form = useForm<VerifyFormValues>({
    resolver: zodResolver(verifyFormSchema),
    defaultValues: {
      token: "",
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  // Function to fetch the QR code
  const fetchQrCode = async () => {
    setIsFetchingQR(true);
    setError(null);
    
    try {
      const response = await apiRequest("POST", "/api/mfa/setup");
      const data = await response.json();
      setQrCodeUrl(data.qrCodeUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set up MFA");
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to set up MFA",
        variant: "destructive"
      });
    } finally {
      setIsFetchingQR(false);
    }
  };

  // Load QR code when component mounts
  useEffect(() => {
    if (isAuthenticated && !qrCodeUrl && !success) {
      fetchQrCode();
    }
  }, [isAuthenticated, qrCodeUrl, success]);

  // Handle form submission
  const onSubmit = async (data: VerifyFormValues) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/mfa/verify", {
        token: data.token
      });
      
      setSuccess(true);
      toast({
        title: "Success",
        description: "MFA has been successfully enabled for your account",
        variant: "default"
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Verification failed. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest("POST", "/api/mfa/disable");
      
      toast({
        title: "Success",
        description: "MFA has been successfully disabled for your account",
        variant: "default"
      });
      
      // Reset the state and fetch a new QR code
      setSuccess(false);
      setQrCodeUrl(null);
      fetchQrCode();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable MFA");
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to disable MFA",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center mb-2">
            <Shield className="h-6 w-6 text-primary mr-2" />
            <CardTitle>Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Enhance your account security by enabling two-factor authentication
          </CardDescription>
        </CardHeader>
        
        <Tabs defaultValue="setup" className="w-full">
          <TabsList className="mx-6">
            <TabsTrigger value="setup">Setup MFA</TabsTrigger>
            <TabsTrigger value="manage">Manage MFA</TabsTrigger>
          </TabsList>
          
          <TabsContent value="setup">
            <CardContent>
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              {success ? (
                <div className="bg-green-50 text-green-600 p-4 rounded-md mb-4 flex items-center">
                  <CheckCircle className="h-6 w-6 mr-2 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium">MFA Enabled Successfully</h3>
                    <p className="text-sm">Your account is now protected with two-factor authentication.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">Step 1: Scan QR Code</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Scan this QR code with your authenticator app (like Google Authenticator, Authy, or Microsoft Authenticator).
                    </p>
                    
                    <div className="flex justify-center mb-4">
                      {isFetchingQR ? (
                        <div className="w-48 h-48 flex items-center justify-center border rounded">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : qrCodeUrl ? (
                        <img 
                          src={qrCodeUrl} 
                          alt="QR Code for MFA Setup" 
                          className="border p-2 rounded"
                          width={200}
                          height={200}
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center border rounded bg-gray-50">
                          <p className="text-sm text-gray-400">Failed to load QR code</p>
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      variant="outline" 
                      onClick={fetchQrCode} 
                      disabled={isFetchingQR}
                      className="w-full"
                    >
                      {isFetchingQR ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating QR Code...
                        </>
                      ) : (
                        "Regenerate QR Code"
                      )}
                    </Button>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-2">Step 2: Verify Code</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Enter the 6-digit verification code from your authenticator app to enable MFA.
                    </p>
                    
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="token"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Verification Code</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter 6-digit code" 
                                  {...field} 
                                  maxLength={6} 
                                  inputMode="numeric" 
                                  pattern="[0-9]*"
                                  autoComplete="one-time-code"
                                  className="text-center text-xl tracking-widest"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button type="submit" className="w-full" disabled={isLoading || !qrCodeUrl}>
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            "Enable Two-Factor Authentication"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </div>
                </>
              )}
            </CardContent>
          </TabsContent>
          
          <TabsContent value="manage">
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-md">
                  <h3 className="font-medium flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-blue-600" />
                    MFA Status
                  </h3>
                  <div className="mt-2">
                    <p className="flex items-center">
                      {success || user?.mfaEnabled ? (
                        <>
                          <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                          <span className="text-green-600 font-medium">MFA is enabled</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-5 w-5 mr-2 text-amber-600" />
                          <span className="text-amber-600 font-medium">MFA is not enabled</span>
                        </>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {success || user?.mfaEnabled
                        ? "Your account is protected with two-factor authentication."
                        : "We recommend enabling two-factor authentication for enhanced security."}
                    </p>
                  </div>
                </div>
                
                {(success || user?.mfaEnabled) && (
                  <div>
                    <h3 className="font-medium mb-2">Disable MFA</h3>
                    <p className="text-sm text-gray-500 mb-3">
                      If you want to disable two-factor authentication for your account, click the button below.
                    </p>
                    <Button 
                      variant="destructive" 
                      onClick={handleDisableMfa}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Disabling MFA...
                        </>
                      ) : (
                        "Disable Two-Factor Authentication"
                      )}
                    </Button>
                  </div>
                )}
                
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Security Tips</h3>
                  <ul className="text-sm text-gray-500 space-y-1 list-disc pl-5">
                    <li>Always use a strong, unique password with your MFA.</li>
                    <li>Keep your recovery codes in a safe place, separate from your authenticator app.</li>
                    <li>Update your authenticator app regularly.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </TabsContent>
        </Tabs>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}