import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signInWithGoogle, getProfile } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Heart } from "lucide-react";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Signed in with Google!");
        // If profile missing side/relationship, route to profile page
        setTimeout(async () => {
          const authUser = window?.localStorage ? null : null; // placeholder to avoid TS strip
          // Fetch current user profile via auth state in provider
          // Small delay allows AuthProvider to update state
          const profileUser = await new Promise<ReturnType<typeof getProfile>>(async (resolve) => {
            // We don't have direct access to auth user here; rely on provider state soon after
            setTimeout(async () => {
              // Try reading from Firebase auth directly
              const u = (await import("firebase/auth")).getAuth().currentUser;
              if (u?.uid) {
                resolve(getProfile(u.uid));
              } else {
                resolve(null as any);
              }
            }, 50);
          });
          const prof = (await profileUser) as any;
          if (!prof || !prof.side || !prof.relationship) {
            navigate("/profile");
          } else {
            navigate("/");
          }
        }, 50);
      }
    } catch {
      toast.error("Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Heart className="w-8 h-8 text-primary fill-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-serif">Welcome</CardTitle>
          <CardDescription>Sign in to view our wedding details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={handleGoogle} className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Continue with Google"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
