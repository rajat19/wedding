import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, Heart, Users } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { format } from "date-fns";
import { GROOM_NAME, BRIDE_NAME } from "@/lib/constant";

type RawEvent = {
  id: string;
  title?: string;
  // legacy
  event_date?: string;
  venue_name?: string;
  venue_address?: string;
  // new
  starts_at?: string;
  location?: string;
};

type DisplayEvent = {
  id: string;
  title: string;
  datetimeISO: string;
  locationLabel?: string;
};

const Home = () => {
  const [nextEvent, setNextEvent] = useState<DisplayEvent | null>(null);

  useEffect(() => {
    const fetchNextEvent = async () => {
      const snap = await getDocs(collection(db, "events"));
      const raw: RawEvent[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Record<string, unknown>),
      }));
      const normalized: DisplayEvent[] = raw
        .map((ev) => {
          const datetimeISO = (ev.event_date as string) || (ev.starts_at as string) || "";
          if (!datetimeISO) return null;
          const title = ev.title ?? "Untitled Event";
          const locationLabel =
            ev.venue_name ||
            ev.venue_address ||
            ev.location ||
            undefined;
          return { id: ev.id, title, datetimeISO, locationLabel };
        })
        .filter(Boolean) as DisplayEvent[];

      const now = Date.now();
      const future = normalized
        .filter((e) => new Date(e.datetimeISO).getTime() >= now)
        .sort((a, b) => new Date(a.datetimeISO).getTime() - new Date(b.datetimeISO).getTime());
      setNextEvent(future[0] ?? null);
    };

    fetchNextEvent();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center bg-gradient-hero">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519741497674-611481863552?w=1200')] bg-cover bg-center opacity-20" />

        <div className="relative z-10 text-center px-4 space-y-6">
          <Heart className="w-16 h-16 mx-auto text-primary fill-primary animate-pulse" />

          <h1 className="text-4xl md:text-6xl p-2 font-serif font-bold text-gradient-primary">
            {GROOM_NAME} & {BRIDE_NAME}
          </h1>

          <p className="text-2xl md:text-3xl text-foreground/80">We're Getting Married!</p>

          {nextEvent && (
            <div className="flex flex-col items-center gap-2 pt-4">
              <div className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="font-medium">
                  {format(new Date(nextEvent.datetimeISO), "MMMM dd, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-primary" />
                <span>{nextEvent.locationLabel || "TBA"}</span>
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-center pt-6">
            <Link to="/rsvp">
              <Button size="lg" className="shadow-glow">
                RSVP Now
              </Button>
            </Link>
            <Link to="/events">
              <Button size="lg" variant="outline">
                View Schedule
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-smooth">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-primary/10 rounded-full">
                    <Calendar className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-serif font-bold">Schedule</h3>
                <p className="text-muted-foreground">
                  View our wedding events and ceremony details
                </p>
                <Link to="/events">
                  <Button variant="ghost">View Events</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-smooth">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-secondary/20 rounded-full">
                    <Users className="w-8 h-8 text-secondary-dark" />
                  </div>
                </div>
                <h3 className="text-xl font-serif font-bold">RSVP</h3>
                <p className="text-muted-foreground">
                  Let us know if you can join us on our special day
                </p>
                <Link to="/rsvp">
                  <Button variant="ghost">RSVP Now</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-smooth">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-accent/20 rounded-full">
                    <MapPin className="w-8 h-8 text-accent-foreground" />
                  </div>
                </div>
                <h3 className="text-xl font-serif font-bold">Travel</h3>
                <p className="text-muted-foreground">Find accommodation and travel information</p>
                <Link to="/travel">
                  <Button variant="ghost">Get Details</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Story Section */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-4xl font-serif font-bold">Our Love Story</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We met on a sunny afternoon in a small coffee shop downtown. What started as a chance
              encounter turned into countless conversations, adventures, and memories that we'll
              cherish forever. Now, we're excited to begin this new chapter together and celebrate
              with all of you!
            </p>
            <Link to="/guestbook">
              <Button variant="outline" size="lg">
                Leave Us a Message
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
