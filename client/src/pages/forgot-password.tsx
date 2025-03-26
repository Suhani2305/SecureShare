import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/utils/auth";
import { Shield, AlertCircle, Mail, HelpCircle } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
});

const securityQuestionSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  securityAnswer: z.string().min(1, "Please provide your security answer"),
});

type FormValues = z.infer<typeof formSchema>;
type SecurityQuestionValues = z.infer<typeof securityQuestionSchema>;

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { forgotPassword, verifySecurityAnswer, getSecurityQuestion } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState<string | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);

  const emailForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  });

  const securityForm = useForm<SecurityQuestionValues>({
    resolver: zodResolver(securityQuestionSchema),
    defaultValues: {
      username: "",
      securityAnswer: "",
    },
  });

  const fetchSecurityQuestion = async (username: string) => {
    if (!username) return;
    
    setIsLoadingQuestion(true);
    setError(null);
    try {
      const question = await getSecurityQuestion(username);
      setSecurityQuestion(question);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch security question");
      setSecurityQuestion(null);
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  // Watch username changes in security form
  const securityUsername = securityForm.watch("username");

  const onEmailSubmit = async (data: FormValues) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    
    try {
      await forgotPassword(data.username, data.email);
      setSuccess("Password reset instructions have been sent to your email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSecurityQuestionSubmit = async (data: SecurityQuestionValues) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    
    try {
      const result = await verifySecurityAnswer(data.username, data.securityAnswer);
      
      if (result.success && result.token) {
        // Navigate to reset password page with the token
        navigate(`/reset-password?token=${result.token}`);
      } else {
        setError(result.message || "Incorrect security answer. Please try again.");
      }
    } catch (err) {
      console.error("Security answer verification error:", err);
      setError(err instanceof Error ? err.message : "Failed to verify security answer. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
          <p className="text-sm text-gray-500 text-center">
            Choose a method to reset your password
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4">
              {success}
            </div>
          )}

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Security Question
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter your email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send Reset Instructions"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="security">
              <Form {...securityForm}>
                <form onSubmit={securityForm.handleSubmit(onSecurityQuestionSubmit)} className="space-y-4">
                  <FormField
                    control={securityForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your username" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              if (e.target.value.length >= 3) {
                                fetchSecurityQuestion(e.target.value);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isLoadingQuestion && (
                    <div className="text-sm text-gray-500">Loading security question...</div>
                  )}

                  {securityQuestion && (
                    <div className="bg-blue-50 text-blue-700 p-3 rounded-md">
                      <p className="font-medium">Your Security Question:</p>
                      <p>{securityQuestion}</p>
                    </div>
                  )}

                  <FormField
                    control={securityForm.control}
                    name="securityAnswer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security Answer</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your security answer" 
                            {...field}
                            disabled={!securityQuestion} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || !securityQuestion}
                  >
                    {isLoading ? "Verifying..." : "Verify Answer"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            Remember your password?{" "}
            <a 
              href="/login"
              className="text-primary hover:underline"
              onClick={(e) => {
                e.preventDefault();
                navigate("/login");
              }}
            >
              Login
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 