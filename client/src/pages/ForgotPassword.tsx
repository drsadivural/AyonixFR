import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ScanFace, Loader2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [resetInfo, setResetInfo] = useState<{ resetToken: string; resetUrl: string } | null>(null);

  const requestResetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      // Store reset info for testing (in production, this would be sent via email)
      if (data.resetToken && data.resetUrl) {
        setResetInfo({ resetToken: data.resetToken, resetUrl: data.resetUrl });
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    requestResetMutation.mutate({ email });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <ScanFace className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!resetInfo ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={requestResetMutation.isPending}
              >
                {requestResetMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setLocation("/login")}
                  className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to login
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 mb-2">
                  ✅ Reset link generated successfully!
                </p>
                <p className="text-xs text-green-700 mb-3">
                  In production, this would be sent to your email. For testing, use the link below:
                </p>
                <Button
                  onClick={() => setLocation(resetInfo.resetUrl)}
                  className="w-full"
                  size="sm"
                >
                  Go to Reset Password Page
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setLocation("/login")}
                  className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to login
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
