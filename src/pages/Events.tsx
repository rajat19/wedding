import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  venue_name: string;
  venue_address: string;
  venue_lat: number | null;
  venue_lng: number | null;
  dress_code: string | null;
}

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (data && !error) {
        setEvents(data);
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  const openMaps = (address: string) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(mapsUrl, '_blank');
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
          <p className="text-xl text-muted-foreground">
            Join us for these special celebrations
          </p>
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
                    {format(new Date(event.event_date), 'EEEE, MMMM dd, yyyy')}
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
                      {format(new Date(event.event_date), 'h:mm a')}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">{event.venue_name}</p>
                      <p className="text-sm text-muted-foreground">{event.venue_address}</p>
                      <Button
                        variant="link"
                        className="px-0 h-auto"
                        onClick={() => openMaps(event.venue_address)}
                      >
                        Open in Maps
                      </Button>
                    </div>
                  </div>

                  {event.dress_code && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium text-muted-foreground">DRESS CODE</p>
                      <p className="mt-1">{event.dress_code}</p>
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
