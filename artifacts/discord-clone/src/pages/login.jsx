import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe, useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: isCheckingAuth, isError } = useGetMe();
  const loginMutation = useLogin();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (user) {
      setLocation("/app");
    }
  }, [user, setLocation]);

  if (isCheckingAuth && !isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !displayName) return;

    loginMutation.mutate(
      { data: { username, displayName } },
      {
        onSuccess: () => {
          setLocation("/app");
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md z-10 border border-border bg-card shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Welcome back!</CardTitle>
          <CardDescription className="text-muted-foreground">
            We're so excited to see you again!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs uppercase font-bold text-muted-foreground">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-input border-0 focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-xs uppercase font-bold text-muted-foreground">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-input border-0 focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={loginMutation.isPending || !username || !displayName}
            >
              {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Log In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
