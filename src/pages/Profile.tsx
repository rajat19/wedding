import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { getProfile, upsertProfile, Profile } from "@/lib/firebase";
import { toast } from "sonner";

const ProfilePage = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [side, setSide] = useState<"bride" | "groom" | "">("");
  const [relationship, setRelationship] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const load = async () => {
      const prof = await getProfile(user.id);
      setFullName((prof?.full_name ?? session?.displayName ?? "") || "");
      setEmail((prof?.email ?? session?.email ?? "") || "");
      setPhone(prof?.phone ?? "");
      setSide(((prof?.side as "bride" | "groom" | null) ?? "") || "");
      setRelationship(prof?.relationship ?? "");
      setLoading(false);
    };
    load();
  }, [user, session, navigate]);

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!side) {
      toast.error("Please select bride or groom side");
      return;
    }
    if (!relationship.trim()) {
      toast.error("Please enter your relationship");
      return;
    }
    setSaving(true);
    const updates: Partial<Profile> = {
      full_name: fullName.trim(),
      email: email || session?.email || null,
      phone: phone || null,
      side,
      relationship: relationship.trim(),
    };
    const { error } = await upsertProfile(user.id, updates);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated");
      navigate("/");
    }
  };

  if (!user || loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-serif">Your Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 555 555 5555"
              />
            </div>

            <div className="space-y-2">
              <Label>Which side are you from?</Label>
              <RadioGroup value={side} onValueChange={(v) => setSide(v as "bride" | "groom")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bride" id="side-bride" />
                  <Label htmlFor="side-bride" className="cursor-pointer">
                    Bride's side
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="groom" id="side-groom" />
                  <Label htmlFor="side-groom" className="cursor-pointer">
                    Groom's side
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship">Your relationship</Label>
              <Input
                id="relationship"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g., cousin, friend, colleague"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;


