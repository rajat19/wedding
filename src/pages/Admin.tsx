import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Shield, Users, Calendar, Image, MessageSquare, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Stats {
  totalGuests: number;
  totalRsvps: number;
  acceptedRsvps: number;
  declinedRsvps: number;
  totalPhotos: number;
  totalGuestbookEntries: number;
}

const Admin = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalGuests: 0,
    totalRsvps: 0,
    acceptedRsvps: 0,
    declinedRsvps: 0,
    totalPhotos: 0,
    totalGuestbookEntries: 0,
  });
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!isAdmin) {
      toast.error('Access denied: Admin only');
      navigate('/');
      return;
    }

    fetchData();
  }, [user, isAdmin, navigate]);

  const fetchData = async () => {
    // Fetch profiles count
    const { count: guestCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Fetch RSVPs
    const { data: rsvpData, count: rsvpCount } = await supabase
      .from('rsvps')
      .select(`
        *,
        profiles (
          full_name,
          email
        ),
        events (
          title
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    const acceptedCount = rsvpData?.filter((r) => r.status === 'accepted').length || 0;
    const declinedCount = rsvpData?.filter((r) => r.status === 'declined').length || 0;

    // Fetch photos count
    const { count: photoCount } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true });

    // Fetch guestbook entries count
    const { count: guestbookCount } = await supabase
      .from('guestbook_entries')
      .select('*', { count: 'exact', head: true });

    setStats({
      totalGuests: guestCount || 0,
      totalRsvps: rsvpCount || 0,
      acceptedRsvps: acceptedCount,
      declinedRsvps: declinedCount,
      totalPhotos: photoCount || 0,
      totalGuestbookEntries: guestbookCount || 0,
    });

    setRsvps(rsvpData || []);
    setLoading(false);
  };

  const downloadRsvpData = () => {
    const csv = [
      ['Guest Name', 'Email', 'Event', 'Status', 'Guest Count', 'Dietary Restrictions', 'Notes'],
      ...rsvps.map((rsvp) => [
        rsvp.profiles?.full_name || 'N/A',
        rsvp.profiles?.email || 'N/A',
        rsvp.events?.title || 'N/A',
        rsvp.status,
        rsvp.guest_count,
        rsvp.dietary_restrictions || '',
        rsvp.notes || '',
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rsvp-data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('RSVP data downloaded');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-12">
          <Shield className="w-10 h-10 text-primary" />
          <h1 className="text-4xl font-serif font-bold">Admin Dashboard</h1>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Guests</p>
                  <p className="text-3xl font-bold">{stats.totalGuests}</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">RSVPs</p>
                  <p className="text-3xl font-bold">{stats.totalRsvps}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.acceptedRsvps} accepted, {stats.declinedRsvps} declined
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-secondary-dark" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Photos</p>
                  <p className="text-3xl font-bold">{stats.totalPhotos}</p>
                </div>
                <Image className="w-8 h-8 text-accent-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="rsvps" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rsvps">RSVPs</TabsTrigger>
            <TabsTrigger value="overview">Site Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="rsvps" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-serif font-bold">RSVP Responses</h2>
              <Button onClick={downloadRsvpData} variant="outline">
                Download CSV
              </Button>
            </div>

            <div className="space-y-3">
              {rsvps.map((rsvp) => (
                <Card key={rsvp.id}>
                  <CardContent className="pt-6">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Guest</p>
                        <p className="font-medium">{rsvp.profiles?.full_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">
                          {rsvp.profiles?.email || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Event</p>
                        <p className="font-medium">{rsvp.events?.title || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p
                          className={`font-medium ${
                            rsvp.status === 'accepted'
                              ? 'text-green-600'
                              : rsvp.status === 'declined'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                          }`}
                        >
                          {rsvp.status}
                        </p>
                        <p className="text-xs">Guests: {rsvp.guest_count}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Dietary</p>
                        <p className="text-sm">{rsvp.dietary_restrictions || 'None'}</p>
                      </div>
                    </div>
                    {rsvp.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-muted-foreground">Notes: {rsvp.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Guestbook
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.totalGuestbookEntries}</p>
                  <p className="text-sm text-muted-foreground">Total messages</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-primary" />
                    Registry Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Manage registry items in the Cloud backend
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
