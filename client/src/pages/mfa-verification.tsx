import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2, Shield } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  token: z.string().min(6, "Verification code must be 6 digits").max(6, "Verification code must be 6 digits"),
});

type FormValues = z.infer<typeof formSchema>;

export default function MfaVerification() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const userId = params.get("userId");
  const username = params.get("username");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      token: "",
    },
  });

  useEffect(() => {
    // If userId or username is missing, redirect to login
    if (!userId || !username) {
      navigate("/login");
    }
  }, [userId, username, navigate]);

  const onSubmit = async (data: FormValues) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/auth/verify-mfa", {
        userId: Number(userId),
        token: data.token
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Verification failed");
      }
      
      const responseData = await response.json();
      
      // Store token and redirect to dashboard
      localStorage.setItem("token", responseData.token);
      
      toast({
        title: "Success",
        description: "MFA verification successful",
        variant: "default"
      });
      
      navigate("/");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center mb-2">
            <Shield className="h-6 w-6 text-primary mr-2" />
            <CardTitle>Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Please enter the verification code from your authenticator app to continue
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              Logging in as <span className="font-medium">{username}</span>
            </p>
          </div>
          
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
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify and Login"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Button variant="ghost" onClick={() => navigate("/login")} disabled={isLoading}>
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}