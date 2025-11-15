import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { toast } from "sonner";
import { MessageSquare, Heart, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface GuestbookEntry {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
}

const Guestbook = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    const entriesRef = collection(db, "guestbook_entries");
    const q = query(entriesRef, orderBy("created_at", "desc"));
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Omit<
      GuestbookEntry,
      "profiles"
    >[];

    // Fetch profile names separately
    const entriesWithProfiles = await Promise.all(
      data.map(async (entry) => {
        const profileSnap = await getDoc(doc(db, "profiles", entry.user_id));
        const profile = profileSnap.exists()
          ? { full_name: (profileSnap.data() as any).full_name }
          : null;
        return { ...(entry as any), profiles: profile } as GuestbookEntry;
      }),
    );
    setEntries(entriesWithProfiles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      navigate("/auth");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, "guestbook_entries"), {
        user_id: user.id,
        message: message.trim(),
        created_at: new Date().toISOString(),
      });

      toast.success("Message posted!");
      setMessage("");
      fetchEntries();
    } catch {
      toast.error("Failed to post message");
    }

    setSubmitting(false);
  };

  const handleDelete = async (entryId: string) => {
    try {
      await deleteDoc(doc(db, "guestbook_entries", entryId));

      toast.success("Message deleted");
      fetchEntries();
    } catch {
      toast.error("Failed to delete message");
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Guestbook</h1>
          <p className="text-xl text-muted-foreground">Leave us a message and share your love</p>
        </div>

        {/* Post Message Form */}
        {user ? (
          <Card className="mb-12">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                  placeholder="Share your wishes, memories, or advice..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <Button type="submit" disabled={submitting} className="w-full">
                  <Heart className="w-4 h-4 mr-2 fill-current" />
                  {submitting ? "Posting..." : "Post Message"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-12">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">Sign in to leave a message</p>
              <Button onClick={() => navigate("/auth")}>Sign In</Button>
            </CardContent>
          </Card>
        )}

        {/* Entries List */}
        <div className="space-y-6">
          {entries.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                No messages yet. Be the first to sign the guestbook!
              </CardContent>
            </Card>
          ) : (
            entries.map((entry) => (
              <Card key={entry.id} className="relative">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium">{entry.profiles?.full_name || "Guest"}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(entry.created_at), "MMM dd, yyyy")}
                      </p>
                    </div>
                    {user?.id === entry.user_id && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{entry.message}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Guestbook;
