import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Heart, Users, Utensils } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  event_date: string;
}

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
  const [events, setEvents] = useState<Event[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, RSVP>>({});
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (eventsData) {
        setEvents(eventsData);

        const { data: rsvpsData } = await supabase
          .from('rsvps')
          .select('*')
          .eq('user_id', user.id);

        if (rsvpsData) {
          const rsvpMap: Record<string, RSVP> = {};
          const formMap: Record<string, any> = {};

          rsvpsData.forEach((rsvp) => {
            rsvpMap[rsvp.event_id] = rsvp;
            formMap[rsvp.event_id] = {
              status: rsvp.status,
              guest_count: rsvp.guest_count,
              dietary_restrictions: rsvp.dietary_restrictions || '',
              notes: rsvp.notes || '',
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
      status: data.status || 'pending',
      guest_count: parseInt(data.guest_count) || 1,
      dietary_restrictions: data.dietary_restrictions || null,
      notes: data.notes || null,
    };

    const existing = rsvps[eventId];

    if (existing) {
      const { error } = await supabase
        .from('rsvps')
        .update(rsvpData)
        .eq('id', existing.id);

      if (error) {
        toast.error('Failed to update RSVP');
      } else {
        toast.success('RSVP updated successfully!');
      }
    } else {
      const { error } = await supabase.from('rsvps').insert(rsvpData);

      if (error) {
        toast.error('Failed to submit RSVP');
      } else {
        toast.success('RSVP submitted successfully!');
      }
    }

    setLoading(false);

    // Refresh RSVPs
    const { data: rsvpsData } = await supabase
      .from('rsvps')
      .select('*')
      .eq('user_id', user.id);

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
          <p className="text-xl text-muted-foreground">
            We can't wait to celebrate with you!
          </p>
        </div>

        <div className="space-y-8">
          {events.map((event) => {
            const eventData = formData[event.id] || {
              status: 'pending',
              guest_count: 1,
              dietary_restrictions: '',
              notes: '',
            };

            return (
              <Card key={event.id}>
                <CardHeader>
                  <CardTitle className="font-serif">{event.title}</CardTitle>
                  <CardDescription>
                    {new Date(event.event_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Will you attend?</Label>
                    <RadioGroup
                      value={eventData.status}
                      onValueChange={(value) => updateFormData(event.id, 'status', value)}
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

                  {eventData.status === 'accepted' && (
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
                          onChange={(e) =>
                            updateFormData(event.id, 'guest_count', e.target.value)
                          }
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
                            updateFormData(event.id, 'dietary_restrictions', e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`notes-${event.id}`}>Additional Notes</Label>
                        <Textarea
                          id={`notes-${event.id}`}
                          placeholder="Anything else we should know?"
                          value={eventData.notes}
                          onChange={(e) => updateFormData(event.id, 'notes', e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  <Button
                    onClick={() => handleSubmit(event.id)}
                    disabled={loading}
                    className="w-full"
                  >
                    {rsvps[event.id] ? 'Update RSVP' : 'Submit RSVP'}
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
