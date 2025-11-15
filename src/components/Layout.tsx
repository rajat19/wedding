import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  Heart,
  Calendar,
  Image,
  MessageSquare,
  Plane,
  Gift,
  User,
  LogOut,
  Shield,
} from "lucide-react";
import { BRIDE_NAME, GROOM_NAME } from "@/lib/constant";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, session, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [needsProfile, setNeedsProfile] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!user) {
        if (active) setNeedsProfile(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "profiles", user.id));
        const d = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
        if (active) setNeedsProfile(!d || !d.side || !d.relationship);
      } catch {
        if (active) setNeedsProfile(false);
      }
    };
    check();
    return () => {
      active = false;
    };
  }, [user]);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/", label: "Home", icon: Heart },
    { path: "/events", label: "Events", icon: Calendar },
    { path: "/rsvp", label: "RSVP", icon: Heart },
    { path: "/gallery", label: "Gallery", icon: Image },
    { path: "/guestbook", label: "Guestbook", icon: MessageSquare },
    { path: "/travel", label: "Travel", icon: Plane },
    { path: "/registry", label: "Registry", icon: Gift },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-2xl font-serif font-bold text-gradient-primary">
              {GROOM_NAME.charAt(0)} & {BRIDE_NAME.charAt(0)}
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={isActive(item.path) ? "bg-primary/10 text-primary" : ""}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session?.photoURL ?? undefined} alt={session?.displayName ?? ""} />
                    <AvatarFallback>
                      {(session?.displayName?.charAt(0)?.toUpperCase() ??
                        user.email?.charAt(0)?.toUpperCase() ??
                        "U")}
                    </AvatarFallback>
                  </Avatar>
                  {needsProfile && (
                    <Link to="/profile">
                      <Button variant="secondary" size="sm">
                        Complete profile
                      </Button>
                    </Link>
                  )}
                  {isAdmin && (
                    <Link to="/admin">
                      <Button variant="outline" size="sm">
                        <Shield className="w-4 h-4 mr-2" />
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Button variant="ghost" size="sm" onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Link to="/auth">
                  <Button variant="default" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile nav */}
          <div className="md:hidden flex overflow-x-auto gap-1 pb-2 scrollbar-hide">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={isActive(item.path) ? "bg-primary/10 text-primary" : ""}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main>{children}</main>

      <footer className="bg-card border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">
              Made with <Heart className="inline w-4 h-4 text-primary fill-primary" /> for our
              special day
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
