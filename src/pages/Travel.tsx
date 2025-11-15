import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Hotel, Plane, Car, Info } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { format } from "date-fns";

type StayLocation = {
  name: string;
  address: string;
  distance_from_venue?: string;
  rate_info?: string | null;
  booking_url?: string | null;
};

type RawEvent = {
  id: string;
  title?: string;
  description?: string | null;
  // Legacy
  event_date?: string;
  venue_name?: string;
  venue_address?: string;
  // New
  starts_at?: string;
  location?: string;
  show_map?: boolean;
  stay_locations?: StayLocation[];
};

type TravelEvent = {
  id: string;
  title: string;
  datetimeISO: string;
  locationTitle?: string;
  locationAddress?: string;
  showMap: boolean;
  stayLocations: StayLocation[];
  description?: string | null;
};

const Travel = () => {
  const [events, setEvents] = useState<TravelEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const snap = await getDocs(collection(db, "events"));
      const raw: RawEvent[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const normalized: TravelEvent[] = raw
        .map((e) => {
          const datetimeISO = (e.event_date as string) || (e.starts_at as string) || "";
          if (!datetimeISO) return null;
          const locationTitle = e.venue_name || e.location || undefined;
          const locationAddress = e.venue_address || (e.location && !e.venue_name ? e.location : undefined);
          return {
            id: e.id,
            title: e.title ?? "Untitled Event",
            description: (e.description ?? null) as string | null,
            datetimeISO,
            locationTitle,
            locationAddress,
            showMap: e.show_map ?? true,
            stayLocations: Array.isArray(e.stay_locations) ? (e.stay_locations as StayLocation[]) : [],
          } as TravelEvent;
        })
        .filter(Boolean) as TravelEvent[];

      normalized.sort((a, b) => new Date(a.datetimeISO).getTime() - new Date(b.datetimeISO).getTime());
      setEvents(normalized);
      setLoading(false);
    };

    fetchEvents();
  }, []);

  const openMaps = (address: string) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(mapsUrl, "_blank");
  };

  const getEmbedUrl = (query: string) =>
    `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Plane className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Travel & Stay</h1>
          <p className="text-xl text-muted-foreground">Everything you need to know about getting here</p>
        </div>

        {loading ? (
          <div className="text-center">Loading travel details...</div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              No events found yet. Check back soon!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {events.map((event) => {
              const mapQuery = event.locationAddress || event.locationTitle;
              return (
                <Card key={event.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-primary text-primary-foreground">
                    <CardTitle className="flex items-center gap-2 font-serif">
                      <MapPin className="w-5 h-5" />
                      {event.title}
                    </CardTitle>
                    <CardDescription className="text-primary-foreground/90">
                      {format(new Date(event.datetimeISO), "EEEE, MMMM dd, yyyy")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {event.description && (
                      <p className="text-muted-foreground">{event.description}</p>
                    )}

                    {(event.locationTitle || event.locationAddress) && (
                      <div className="space-y-2">
                        {event.locationTitle && <p className="font-medium">{event.locationTitle}</p>}
                        {event.locationAddress && (
                          <p className="text-sm text-muted-foreground">{event.locationAddress}</p>
                        )}
                        {mapQuery && (
                          <Button variant="outline" onClick={() => openMaps(mapQuery)}>
                            Open in Maps
                          </Button>
                        )}
                      </div>
                    )}

                    {event.showMap && mapQuery && (
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                        <iframe
                          src={getEmbedUrl(mapQuery)}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title={`${event.title} map`}
                        />
                      </div>
                    )}

                    <div>
                      <div className="mb-3">
                        <h3 className="flex items-center gap-2 text-lg font-serif font-bold">
                          <Hotel className="w-5 h-5 text-primary" />
                          Where to Stay
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Suggested places near the venue
                        </p>
                      </div>
                      {event.stayLocations.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Stay details will be shared soon.
                        </p>
                      ) : (
                        <div className="space-y-6">
                          {event.stayLocations.map((loc, idx) => (
                            <div key={idx} className="space-y-2 pb-4 border-b last:border-b-0 last:pb-0">
                              <h4 className="font-medium">{loc.name}</h4>
                              {loc.address && (
                                <p className="text-sm text-muted-foreground">{loc.address}</p>
                              )}
                              {(loc.distance_from_venue || loc.rate_info) && (
                                <div className="text-sm space-y-1">
                                  {loc.distance_from_venue && (
                                    <p>
                                      <span className="font-medium">Distance:</span>{" "}
                                      {loc.distance_from_venue}
                                    </p>
                                  )}
                                  {loc.rate_info && <p className="text-muted-foreground">{loc.rate_info}</p>}
                                </div>
                              )}
                              <div className="flex gap-2">
                                {loc.address && (
                                  <Button variant="outline" size="sm" onClick={() => openMaps(loc.address!)}>
                                    Open in Maps
                                  </Button>
                                )}
                                {loc.booking_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(loc.booking_url as string, "_blank")}
                                  >
                                    Book Now
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Getting There (generic) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-serif">
                  <Car className="w-5 h-5 text-primary" />
                  Getting There
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">By Air</h4>
                  <p className="text-sm text-muted-foreground">
                    The closest airport has rental cars and rideshares available.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">By Car</h4>
                  <p className="text-sm text-muted-foreground">
                    Parking information will be shared closer to the event.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Rideshare</h4>
                  <p className="text-sm text-muted-foreground">
                    Uber and Lyft are readily available in the area.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Local Info (generic) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-serif">
                  <Info className="w-5 h-5 text-primary" />
                  Things to Do
                </CardTitle>
                <CardDescription>Arriving early or staying late? Explore local favorites</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium">Parks & Trails</h4>
                  <p className="text-sm text-muted-foreground">
                    Great options for a morning walk or sunset viewing.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Downtown District</h4>
                  <p className="text-sm text-muted-foreground">
                    Restaurants, shops, and galleries within walking distance.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Travel;
