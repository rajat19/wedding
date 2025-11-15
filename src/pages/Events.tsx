import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, Info } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { format } from "date-fns";

type RawEvent = {
  id: string;
  title?: string;
  description?: string | null;
  // Legacy shape
  event_date?: string;
  venue_name?: string;
  venue_address?: string;
  dress_code?: string | null;
  // New shape from Admin page
  starts_at?: string;
  location?: string;
};

type DisplayEvent = {
  id: string;
  title: string;
  description: string | null;
  datetimeISO: string;
  locationTitle?: string;
  locationAddress?: string;
  dressCode?: string | null;
};

const Events = () => {
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const snap = await getDocs(collection(db, "events"));
      const rawList: RawEvent[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));

      const normalized: DisplayEvent[] = rawList
        .map((ev) => {
          const datetimeISO = (ev.event_date as string) || (ev.starts_at as string) || "";
          // locationTitle prefers explicit venue name; otherwise use the single-line location string
          const locationTitle = ev.venue_name || ev.location || undefined;
          // locationAddress prefers explicit venue address; fallback to same as title if only one string provided
          const locationAddress = ev.venue_address || (ev.location && !ev.venue_name ? ev.location : undefined);
          const title = ev.title ?? "Untitled Event";
          const description = (ev.description ?? null) as string | null;
          const dressCode = (ev.dress_code ?? null) as string | null;
          return {
            id: ev.id,
            title,
            description,
            datetimeISO,
            locationTitle,
            locationAddress,
            dressCode,
          } as DisplayEvent;
        })
        .filter((e) => !!e.datetimeISO);

      normalized.sort((a, b) => {
        const da = new Date(a.datetimeISO).getTime();
        const db = new Date(b.datetimeISO).getTime();
        return da - db;
      });

      setEvents(normalized);
      setLoading(false);
    };

    fetchEvents();
  }, []);

  const openMaps = (address: string) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(mapsUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Wedding Events</h1>
          <p className="text-xl text-muted-foreground">Join us for these special celebrations</p>
        </div>

        {events.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              No events scheduled yet. Check back soon!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {events.map((event) => (
              <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-smooth">
                <CardHeader className="bg-gradient-primary text-primary-foreground">
                  <CardTitle className="text-2xl font-serif">{event.title}</CardTitle>
                  <CardDescription className="text-primary-foreground/90">
                    {format(new Date(event.datetimeISO), "EEEE, MMMM dd, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {event.description && (
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">{event.description}</p>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="font-medium">
                      {format(new Date(event.datetimeISO), "h:mm a")}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      {event.locationTitle && <p className="font-medium">{event.locationTitle}</p>}
                      {event.locationAddress && (
                        <>
                          <p className="text-sm text-muted-foreground">{event.locationAddress}</p>
                          <Button
                            variant="link"
                            className="px-0 h-auto"
                            onClick={() => openMaps(event.locationAddress!)}
                          >
                            Open in Maps
                          </Button>
                        </>
                      )}
                      {!event.locationAddress && event.locationTitle && (
                        <Button
                          variant="link"
                          className="px-0 h-auto"
                          onClick={() => openMaps(event.locationTitle!)}
                        >
                          Open in Maps
                        </Button>
                      )}
                    </div>
                  </div>

                  {event.dressCode && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium text-muted-foreground">DRESS CODE</p>
                      <p className="mt-1">{event.dressCode}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
