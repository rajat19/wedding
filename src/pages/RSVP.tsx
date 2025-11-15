import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, setDoc, updateDoc, where } from "firebase/firestore";
import { toast } from "sonner";
import { Heart, Users, Utensils } from "lucide-react";

type RawEvent = {
  id: string;
  title?: string;
  event_date?: string; // legacy
  starts_at?: string; // new
};

type EventDisplay = {
  id: string;
  title: string;
  datetimeISO: string;
};

interface RSVP {
  id: string;
  event_id: string;
  status: string;
  guest_count: number;
  dietary_restrictions: string | null;
  notes: string | null;
}

const RSVP = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventDisplay[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, RSVP>>({});
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchData = async () => {
      const eventsSnap = await getDocs(collection(db, "events"));
      const rawEvents: RawEvent[] = eventsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Record<string, unknown>),
      }));
      const normalized: EventDisplay[] = rawEvents
        .map((e) => {
          const datetimeISO = (e.event_date as string) || (e.starts_at as string) || "";
          if (!datetimeISO) return null;
          return { id: e.id, title: e.title ?? "Untitled Event", datetimeISO };
        })
        .filter(Boolean) as EventDisplay[];
      normalized.sort(
        (a, b) => new Date(a.datetimeISO).getTime() - new Date(b.datetimeISO).getTime(),
      );
      if (normalized) {
        setEvents(normalized);

        const rsvpsRef = collection(db, "rsvps");
        const qRsvps = query(rsvpsRef, where("user_id", "==", user.id));
        const rsvpsSnap = await getDocs(qRsvps);
        const rsvpsData = rsvpsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as RSVP[];

        if (rsvpsData) {
          const rsvpMap: Record<string, RSVP> = {};
          const formMap: Record<string, any> = {};

          rsvpsData.forEach((rsvp) => {
            rsvpMap[rsvp.event_id] = rsvp;
            formMap[rsvp.event_id] = {
              status: rsvp.status,
              guest_count: rsvp.guest_count,
              dietary_restrictions: rsvp.dietary_restrictions || "",
              notes: rsvp.notes || "",
            };
          });

          setRsvps(rsvpMap);
          setFormData(formMap);
        }
      }
    };

    fetchData();
  }, [user, navigate]);

  const handleSubmit = async (eventId: string) => {
    if (!user) return;

    setLoading(true);
    const data = formData[eventId] || {};

    const rsvpData = {
      user_id: user.id,
      event_id: eventId,
      status: data.status || "pending",
      guest_count: parseInt(data.guest_count) || 1,
      dietary_restrictions: data.dietary_restrictions || null,
      notes: data.notes || null,
    };

    const existing = rsvps[eventId];

    if (existing) {
      try {
        await updateDoc(doc(db, "rsvps", existing.id), {
          ...rsvpData,
          updated_at: new Date().toISOString(),
        });
        toast.success("RSVP updated successfully!");
      } catch {
        toast.error("Failed to update RSVP");
      }
    } else {
      try {
        const newId = `${user.id}_${eventId}`;
        await setDoc(doc(db, "rsvps", newId), {
          ...rsvpData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        toast.success("RSVP submitted successfully!");
      } catch {
        toast.error("Failed to submit RSVP");
      }
    }

    setLoading(false);

    // Refresh RSVPs
    const rsvpsRef = collection(db, "rsvps");
    const qRsvps = query(rsvpsRef, where("user_id", "==", user.id));
    const rsvpsSnap = await getDocs(qRsvps);
    const rsvpsData = rsvpsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as RSVP[];

    if (rsvpsData) {
      const rsvpMap: Record<string, RSVP> = {};
      rsvpsData.forEach((rsvp) => {
        rsvpMap[rsvp.event_id] = rsvp;
      });
      setRsvps(rsvpMap);
    }
  };

  const updateFormData = (eventId: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        [field]: value,
      },
    }));
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <Heart className="w-16 h-16 mx-auto mb-4 text-primary fill-primary" />
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">RSVP</h1>
          <p className="text-xl text-muted-foreground">We can't wait to celebrate with you!</p>
        </div>

        <div className="space-y-8">
          {events.map((event) => {
            const eventData = formData[event.id] || {
              status: "pending",
              guest_count: 1,
              dietary_restrictions: "",
              notes: "",
            };

            return (
              <Card key={event.id}>
                <CardHeader>
                  <CardTitle className="font-serif">{event.title}</CardTitle>
                  <CardDescription>
                    {new Date(event.datetimeISO).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Will you attend?</Label>
                    <RadioGroup
                      value={eventData.status}
                      onValueChange={(value) => updateFormData(event.id, "status", value)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="accepted" id={`${event.id}-yes`} />
                        <Label htmlFor={`${event.id}-yes`} className="cursor-pointer">
                          Joyfully accept
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="declined" id={`${event.id}-no`} />
                        <Label htmlFor={`${event.id}-no`} className="cursor-pointer">
                          Regretfully decline
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {eventData.status === "accepted" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor={`guests-${event.id}`}>
                          <Users className="inline w-4 h-4 mr-2" />
                          Number of Guests
                        </Label>
                        <Input
                          id={`guests-${event.id}`}
                          type="number"
                          min="1"
                          value={eventData.guest_count}
                          onChange={(e) => updateFormData(event.id, "guest_count", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`dietary-${event.id}`}>
                          <Utensils className="inline w-4 h-4 mr-2" />
                          Dietary Restrictions
                        </Label>
                        <Input
                          id={`dietary-${event.id}`}
                          placeholder="e.g., vegetarian, gluten-free, allergies"
                          value={eventData.dietary_restrictions}
                          onChange={(e) =>
                            updateFormData(event.id, "dietary_restrictions", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`notes-${event.id}`}>Additional Notes</Label>
                        <Textarea
                          id={`notes-${event.id}`}
                          placeholder="Anything else we should know?"
                          value={eventData.notes}
                          onChange={(e) => updateFormData(event.id, "notes", e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  <Button
                    onClick={() => handleSubmit(event.id)}
                    disabled={loading}
                    className="w-full"
                  >
                    {rsvps[event.id] ? "Update RSVP" : "Submit RSVP"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RSVP;
