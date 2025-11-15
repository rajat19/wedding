import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  orderBy,
  query,
  addDoc,
  updateDoc,
  where,
  deleteDoc,
  setDoc,
  limit as qlimit,
} from "firebase/firestore";
import { Shield, Users, Calendar, Image, MessageSquare, Gift, Map, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface Stats {
  totalGuests: number;
  totalRsvps: number;
  acceptedRsvps: number;
  declinedRsvps: number;
  totalPhotos: number;
  totalGuestbookEntries: number;
}

type RsvpRecord = {
  id: string;
  user_id: string;
  event_id: string;
  status: "accepted" | "declined" | "pending" | string;
  guest_count?: number;
  dietary_restrictions?: string;
  notes?: string;
  profiles?: { full_name: string; email: string } | null;
  events?: { title: string } | null;
};

type EventRecord = {
  id: string;
  title: string;
  location?: string;
  description?: string | null;
  starts_at?: string;
  created_at?: string;
  created_by?: string | null;
  show_map?: boolean;
  stay_locations?: StayLocation[];
};

type StayLocation = {
  name: string;
  address: string;
  distance_from_venue?: string;
  rate_info?: string | null;
  booking_url?: string | null;
};
type PhotoRecord = {
  id: string;
  url: string;
  caption?: string | null;
  approved: boolean;
  created_at?: string;
  approved_at?: string | null;
  uploader_id?: string | null;
};

type ProfileRecord = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  side?: "bride" | "groom" | null;
  relationship?: string | null;
  created_at?: string;
  updated_at?: string;
};

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
  const [rsvps, setRsvps] = useState<RsvpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<PhotoRecord[]>([]);

  // Event form
  const [eventTitle, setEventTitle] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventWhen, setEventWhen] = useState(""); // datetime-local string
  const [eventDescription, setEventDescription] = useState("");

  // Admin add photo form
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit Travel & Stay state
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [editShowMap, setEditShowMap] = useState<boolean>(true);
  const [editStayLocations, setEditStayLocations] = useState<StayLocation[]>([]);

  // Edit Event Details state
  const [detailsEditEventId, setDetailsEditEventId] = useState<string | null>(null);
  const [detailsTitle, setDetailsTitle] = useState("");
  const [detailsLocation, setDetailsLocation] = useState("");
  const [detailsWhenLocal, setDetailsWhenLocal] = useState("");
  const [detailsDescription, setDetailsDescription] = useState("");

  // Admin guests
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestSide, setGuestSide] = useState<"bride" | "groom" | "">("");
  const [guestRelationship, setGuestRelationship] = useState("");
  const [profiles, setProfiles] = useState<
    { id: string; full_name?: string | null; email?: string | null; side?: string | null; relationship?: string | null }[]
  >([]);

  // RSVP Manager
  const [rsvpMgrEventId, setRsvpMgrEventId] = useState<string>("");
  const [rsvpMgrProfiles, setRsvpMgrProfiles] = useState<ProfileRecord[]>([]);
  const [rsvpMgrForm, setRsvpMgrForm] = useState<
    Record<
      string,
      {
        status: "accepted" | "declined" | "pending";
        guest_count: number;
        dietary_restrictions: string;
        notes: string;
        rsvpId?: string;
      }
    >
  >({});
  const [rsvpMgrLoading, setRsvpMgrLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!isAdmin) {
      toast.error("Access denied: Admin only");
      navigate("/");
      return;
    }

    fetchData();
  }, [user, isAdmin, navigate]);

  const fetchData = async () => {
    // Fetch profiles count
    const profilesAgg = await getCountFromServer(collection(db, "profiles"));
    const guestCount = profilesAgg.data().count || 0;

    // Fetch RSVPs
    const rsvpsRef = collection(db, "rsvps");
    const qRsvps = query(rsvpsRef, orderBy("created_at", "desc"));
    const rsvpsSnap = await getDocs(qRsvps);
    const baseRsvps: RsvpRecord[] = rsvpsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<RsvpRecord, "id">),
    }));
    const rsvpCount = baseRsvps.length;

    const rsvpData = await Promise.all(
      baseRsvps.map(async (r) => {
        const [profileSnap, eventSnap] = await Promise.all([
          getDoc(doc(db, "profiles", r.user_id)),
          getDoc(doc(db, "events", r.event_id)),
        ]);
        const profiles = profileSnap.exists()
          ? (() => {
              const pdata = profileSnap.data() as { full_name?: string; email?: string };
              return {
                full_name: pdata?.full_name || "N/A",
                email: pdata?.email || "N/A",
              };
            })()
          : null;
        const events = eventSnap.exists()
          ? (() => {
              const edata = eventSnap.data() as { title?: string };
              return {
                title: edata?.title || "N/A",
              };
            })()
          : null;
        return { ...(r as RsvpRecord), profiles, events };
      }),
    );

    const acceptedCount = rsvpData?.filter((r) => r.status === "accepted").length || 0;
    const declinedCount = rsvpData?.filter((r) => r.status === "declined").length || 0;

    // Fetch photos count
    const photosAgg = await getCountFromServer(collection(db, "photos"));
    const photoCount = photosAgg.data().count || 0;

    // Fetch guestbook entries count
    const guestbookAgg = await getCountFromServer(collection(db, "guestbook_entries"));
    const guestbookCount = guestbookAgg.data().count || 0;

    // Fetch events
    const eventsSnap = await getDocs(query(collection(db, "events"), orderBy("starts_at")));
    const eventsList: EventRecord[] = eventsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<EventRecord, "id">),
    }));

    // Fetch pending photos (to approve)
    const pendingSnap = await getDocs(
      query(collection(db, "photos"), where("approved", "==", false)),
    );
    const pendingList: PhotoRecord[] = pendingSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<PhotoRecord, "id">),
    }));

    // Fetch recent profiles
    const profilesSnap = await getDocs(
      query(collection(db, "profiles"), orderBy("created_at", "desc"), qlimit(10)),
    );
    const profilesList = profilesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    setStats({
      totalGuests: guestCount || 0,
      totalRsvps: rsvpCount || 0,
      acceptedRsvps: acceptedCount,
      declinedRsvps: declinedCount,
      totalPhotos: photoCount || 0,
      totalGuestbookEntries: guestbookCount || 0,
    });

    setRsvps(rsvpData || []);
    setEvents(eventsList || []);
    setPendingPhotos(pendingList || []);
    setProfiles(profilesList || []);
    setLoading(false);
  };

  const toLocalDateTimeInputValue = (iso?: string) => {
    if (!iso) return "";
    const dt = new Date(iso);
    // convert to local without timezone shift for input[type=datetime-local]
    const tzOffset = dt.getTimezoneOffset() * 60000;
    const local = new Date(dt.getTime() - tzOffset);
    return local.toISOString().slice(0, 16);
  };

  const beginEditDetails = (ev: EventRecord) => {
    setDetailsEditEventId(ev.id);
    setDetailsTitle(ev.title || "");
    setDetailsLocation(ev.location || "");
    setDetailsWhenLocal(toLocalDateTimeInputValue(ev.starts_at));
    setDetailsDescription(ev.description || "");
  };

  const cancelEditDetails = () => {
    setDetailsEditEventId(null);
    setDetailsTitle("");
    setDetailsLocation("");
    setDetailsWhenLocal("");
    setDetailsDescription("");
  };

  const saveEditDetails = async () => {
    if (!detailsEditEventId) return;
    if (!detailsTitle.trim() || !detailsLocation.trim() || !detailsWhenLocal.trim()) {
      toast.error("Please fill title, date/time and location");
      return;
    }
    try {
      setSubmitting(true);
      const payload: Partial<EventRecord> = {
        title: detailsTitle.trim(),
        location: detailsLocation.trim(),
        description: detailsDescription.trim() || null,
        starts_at: new Date(detailsWhenLocal).toISOString(),
      };
      await updateDoc(doc(db, "events", detailsEditEventId), payload as any);
      toast.success("Event updated");
      cancelEditDetails();
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this event? Related RSVPs (if any) will also be removed.",
    );
    if (!confirmed) return;
    try {
      setSubmitting(true);
      // Delete related RSVPs
      const rsvpsRef = collection(db, "rsvps");
      const qRsvps = query(rsvpsRef, where("event_id", "==", eventId));
      const rsvpsSnap = await getDocs(qRsvps);
      await Promise.all(rsvpsSnap.docs.map((d) => deleteDoc(doc(db, "rsvps", d.id))));
      // Delete the event
      await deleteDoc(doc(db, "events", eventId));
      toast.success("Event deleted");
      // If we were editing this event, reset edit states
      if (detailsEditEventId === eventId) cancelEditDetails();
      if (editEventId === eventId) cancelEditTravelStay();
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete event");
    } finally {
      setSubmitting(false);
    }
  };

  const beginEditTravelStay = (ev: EventRecord) => {
    setEditEventId(ev.id);
    setEditShowMap(ev.show_map ?? true);
    setEditStayLocations([...(ev.stay_locations ?? [])]);
  };

  const cancelEditTravelStay = () => {
    setEditEventId(null);
    setEditStayLocations([]);
  };

  const updateStayLocation = (idx: number, field: keyof StayLocation, value: string) => {
    setEditStayLocations((prev) => {
      const next = [...prev];
      const current = { ...(next[idx] || {}) } as StayLocation;
      (current as any)[field] = value;
      next[idx] = current;
      return next;
    });
  };

  const addStayLocation = () => {
    setEditStayLocations((prev) => [
      ...prev,
      { name: "", address: "", distance_from_venue: "", rate_info: "", booking_url: "" },
    ]);
  };

  const removeStayLocation = (idx: number) => {
    setEditStayLocations((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveTravelStay = async () => {
    if (!editEventId) return;
    try {
      setSubmitting(true);
      const payload: Partial<EventRecord> = {
        show_map: editShowMap,
        stay_locations: editStayLocations.map((s) => ({
          name: (s.name || "").trim(),
          address: (s.address || "").trim(),
          distance_from_venue: (s.distance_from_venue || "").trim() || undefined,
          rate_info: (s.rate_info || "").trim() || null,
          booking_url: (s.booking_url || "").trim() || null,
        })),
      };
      await updateDoc(doc(db, "events", editEventId), payload as any);
      toast.success("Travel & Stay updated");
      setEditEventId(null);
      setEditStayLocations([]);
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update Travel & Stay");
    } finally {
      setSubmitting(false);
    }
  };
  const downloadRsvpData = () => {
    const csv = [
      ["Guest Name", "Email", "Event", "Status", "Guest Count", "Dietary Restrictions", "Notes"],
      ...rsvps.map((rsvp) => [
        rsvp.profiles?.full_name || "N/A",
        rsvp.profiles?.email || "N/A",
        rsvp.events?.title || "N/A",
        rsvp.status,
        rsvp.guest_count,
        rsvp.dietary_restrictions || "",
        rsvp.notes || "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rsvp-data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("RSVP data downloaded");
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !eventLocation.trim() || !eventWhen.trim()) {
      toast.error("Please fill title, date/time and location");
      return;
    }
    try {
      setSubmitting(true);
      const startsAtIso = new Date(eventWhen).toISOString();
      await addDoc(collection(db, "events"), {
        title: eventTitle.trim(),
        location: eventLocation.trim(),
        description: eventDescription.trim() || null,
        starts_at: startsAtIso,
        show_map: true,
        stay_locations: [],
        created_at: new Date().toISOString(),
        created_by: user?.id ?? null,
      });
      setEventTitle("");
      setEventLocation("");
      setEventWhen("");
      setEventDescription("");
      toast.success("Event created");
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovePhoto = async (photoId: string) => {
    try {
      await updateDoc(doc(db, "photos", photoId), {
        approved: true,
        approved_at: new Date().toISOString(),
        approved_by: user?.id ?? null,
      });
      toast.success("Photo approved");
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Failed to approve photo");
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await deleteDoc(doc(db, "photos", photoId));
      toast.success("Photo removed");
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Failed to remove photo");
    }
  };

  const handleAddAdminPhoto = async () => {
    if (!photoUrl.trim()) {
      toast.error("Please provide a photo URL");
      return;
    }
    try {
      setSubmitting(true);
      await addDoc(collection(db, "photos"), {
        url: photoUrl.trim(),
        caption: photoCaption.trim() || null,
        uploader_id: user?.id ?? null,
        approved: true,
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
      setPhotoUrl("");
      setPhotoCaption("");
      toast.success("Photo added");
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Failed to add photo");
    } finally {
      setSubmitting(false);
    }
  };

  const loadRsvpManagerForEvent = async (eventId: string) => {
    setRsvpMgrLoading(true);
    try {
      // Load all profiles for visibility of logged-in guests and manually added guests
      const profSnap = await getDocs(collection(db, "profiles"));
      const allProfiles: ProfileRecord[] = profSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ProfileRecord, "id">),
      }));
      setRsvpMgrProfiles(allProfiles);

      // Load RSVPs for this event
      const rsvpsRef = collection(db, "rsvps");
      const qR = query(rsvpsRef, where("event_id", "==", eventId));
      const snap = await getDocs(qR);
      const existing = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Record<string, unknown>),
      }));

      const map: typeof rsvpMgrForm = {};
      for (const prof of allProfiles) {
        const found = existing.find((e) => (e.user_id as string | undefined) === prof.id);
        const status =
          (found?.status as "accepted" | "declined" | "pending" | undefined) ?? "pending";
        const guestCountRaw = found?.guest_count as number | undefined;
        const dietary = (found?.dietary_restrictions as string | undefined) ?? "";
        const notes = (found?.notes as string | undefined) ?? "";
        map[prof.id] = {
          status,
          guest_count: typeof guestCountRaw === "number" ? guestCountRaw : 1,
          dietary_restrictions: dietary,
          notes,
          rsvpId: found?.id as string | undefined,
        };
      }
      setRsvpMgrForm(map);
    } finally {
      setRsvpMgrLoading(false);
    }
  };

  const updateRsvpMgrField = (profileId: string, field: string, value: string | number) => {
    setRsvpMgrForm((prev) => ({
      ...prev,
      [profileId]: {
        ...prev[profileId],
        [field]: field === "guest_count" ? Number(value) : value,
      },
    }));
  };

  const saveRsvpForProfile = async (profileId: string) => {
    if (!rsvpMgrEventId) return;
    const data = rsvpMgrForm[profileId];
    if (!data) return;
    try {
      const payload = {
        user_id: profileId,
        event_id: rsvpMgrEventId,
        status: data.status,
        guest_count: data.guest_count || 1,
        dietary_restrictions: data.dietary_restrictions || null,
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      };
      if (data.rsvpId) {
        await updateDoc(doc(db, "rsvps", data.rsvpId), payload);
      } else {
        const docId = `${profileId}_${rsvpMgrEventId}`;
        await setDoc(doc(db, "rsvps", docId), { ...payload, created_at: new Date().toISOString() });
      }
      toast.success("RSVP saved");
      await loadRsvpManagerForEvent(rsvpMgrEventId);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save RSVP");
    }
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="rsvps">RSVPs</TabsTrigger>
            <TabsTrigger value="overview">Site Overview</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="guests">Guests</TabsTrigger>
            <TabsTrigger value="rsvp-manager">Manage RSVPs</TabsTrigger>
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
                        <p className="font-medium">{rsvp.profiles?.full_name || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">
                          {rsvp.profiles?.email || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Event</p>
                        <p className="font-medium">{rsvp.events?.title || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p
                          className={`font-medium ${
                            rsvp.status === "accepted"
                              ? "text-green-600"
                              : rsvp.status === "declined"
                                ? "text-red-600"
                                : "text-yellow-600"
                          }`}
                        >
                          {rsvp.status}
                        </p>
                        <p className="text-xs">Guests: {rsvp.guest_count}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Dietary</p>
                        <p className="text-sm">{rsvp.dietary_restrictions || "None"}</p>
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

          <TabsContent value="rsvp-manager" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Manage RSVPs by Event
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-1">
                    <Label>Select Event</Label>
                    <Select
                      value={rsvpMgrEventId}
                      onValueChange={(v) => {
                        setRsvpMgrEventId(v);
                        loadRsvpManagerForEvent(v);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose event" />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map((ev) => (
                          <SelectItem key={ev.id} value={ev.id}>
                            {ev.title} {ev.starts_at ? `• ${new Date(ev.starts_at).toLocaleString()}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {rsvpMgrEventId ? (
                  rsvpMgrLoading ? (
                    <p className="text-sm text-muted-foreground">Loading RSVPs…</p>
                  ) : (
                    <div className="space-y-3">
                      {rsvpMgrProfiles.map((p) => {
                        const row =
                          rsvpMgrForm[p.id] || {
                            status: "pending" as const,
                            guest_count: 1,
                            dietary_restrictions: "",
                            notes: "",
                          };
                        return (
                          <div key={p.id} className="border rounded-md p-3">
                            <div className="grid md:grid-cols-4 gap-4">
                              <div>
                                <p className="font-medium">{p.full_name || "Unnamed"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {p.email || "no email"} {p.side ? `• ${p.side}` : ""}{" "}
                                  {p.relationship ? `• ${p.relationship}` : ""}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label>Status</Label>
                                <RadioGroup
                                  value={row.status}
                                  onValueChange={(v) =>
                                    updateRsvpMgrField(p.id, "status", v as "accepted" | "declined" | "pending")
                                  }
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="accepted" id={`${p.id}-accept`} />
                                    <Label htmlFor={`${p.id}-accept`} className="cursor-pointer">
                                      Accept
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="declined" id={`${p.id}-decline`} />
                                    <Label htmlFor={`${p.id}-decline`} className="cursor-pointer">
                                      Decline
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="pending" id={`${p.id}-pending`} />
                                    <Label htmlFor={`${p.id}-pending`} className="cursor-pointer">
                                      Pending
                                    </Label>
                                  </div>
                                </RadioGroup>
                              </div>
                              <div className="space-y-2">
                                <Label>Guests</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={row.guest_count}
                                  onChange={(e) => updateRsvpMgrField(p.id, "guest_count", Number(e.target.value))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Dietary</Label>
                                <Input
                                  placeholder="optional"
                                  value={row.dietary_restrictions}
                                  onChange={(e) =>
                                    updateRsvpMgrField(p.id, "dietary_restrictions", e.target.value)
                                  }
                                />
                                <Label className="mt-2">Notes</Label>
                                <Input
                                  placeholder="optional"
                                  value={row.notes}
                                  onChange={(e) => updateRsvpMgrField(p.id, "notes", e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="mt-3 flex justify-end">
                              <Button size="sm" onClick={() => saveRsvpForProfile(p.id)}>
                                Save
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">Select an event to manage RSVPs.</p>
                )}
              </CardContent>
            </Card>
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

          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Create Event
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-title">Title</Label>
                    <Input
                      id="event-title"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="Main Ceremony"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-when">Date & Time</Label>
                    <Input
                      id="event-when"
                      type="datetime-local"
                      value={eventWhen}
                      onChange={(e) => setEventWhen(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-location">Location</Label>
                    <Input
                      id="event-location"
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      placeholder="Venue name, city"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="event-description">Description</Label>
                    <Textarea
                      id="event-description"
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                      placeholder="Optional details"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleCreateEvent} disabled={submitting}>
                    {submitting ? "Creating..." : "Create Event"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {events.map((ev) => (
                <Card key={ev.id}>
                  <CardContent className="pt-6">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Title</p>
                        <p className="font-medium">{ev.title}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">When</p>
                        <p className="font-medium">
                          {ev.starts_at ? new Date(ev.starts_at).toLocaleString() : "TBD"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium">{ev.location || "TBD"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Created</p>
                        <p className="text-sm">{ev.created_at ? new Date(ev.created_at).toLocaleString() : "-"}</p>
                      </div>
                    </div>
                    {ev.description && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm">{ev.description}</p>
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t space-y-6">
                      {/* Edit Event Details */}
                      {detailsEditEventId === ev.id ? (
                        <div className="space-y-4">
                          <p className="text-sm font-medium">Edit Event Details</p>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input value={detailsTitle} onChange={(e) => setDetailsTitle(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>Date & Time</Label>
                              <Input
                                type="datetime-local"
                                value={detailsWhenLocal}
                                onChange={(e) => setDetailsWhenLocal(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Location</Label>
                              <Input
                                value={detailsLocation}
                                onChange={(e) => setDetailsLocation(e.target.value)}
                                placeholder="Venue name, city"
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Description</Label>
                              <Textarea
                                value={detailsDescription}
                                onChange={(e) => setDetailsDescription(e.target.value)}
                                placeholder="Optional details"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={cancelEditDetails} disabled={submitting}>
                              Cancel
                            </Button>
                            <Button onClick={saveEditDetails} disabled={submitting}>
                              {submitting ? "Saving..." : "Save Changes"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <Button variant="outline" onClick={() => beginEditDetails(ev)}>
                            Edit Event Details
                          </Button>
                          <Button
                            variant="outline"
                            className="text-red-600 border-red-200"
                            onClick={() => handleDeleteEvent(ev.id)}
                            disabled={submitting}
                          >
                            Delete Event
                          </Button>
                        </div>
                      )}

                      {/* Edit Travel & Stay */}
                      {editEventId === ev.id ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Map className="w-4 h-4 text-primary" />
                              <Label>Show map on Travel & Stay page</Label>
                            </div>
                            <Switch checked={editShowMap} onCheckedChange={setEditShowMap} />
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">Stay Locations</p>
                              <Button size="sm" variant="outline" onClick={addStayLocation}>
                                <Plus className="w-4 h-4 mr-1" />
                                Add Location
                              </Button>
                            </div>
                            {editStayLocations.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No locations added yet.</p>
                            ) : (
                              <div className="space-y-4">
                                {editStayLocations.map((loc, idx) => (
                                  <div key={idx} className="p-3 border rounded-md space-y-3">
                                    <div className="grid md:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <Label>Name</Label>
                                        <Input
                                          value={loc.name}
                                          onChange={(e) => updateStayLocation(idx, "name", e.target.value)}
                                          placeholder="Hotel name"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label>Distance (optional)</Label>
                                        <Input
                                          value={loc.distance_from_venue || ""}
                                          onChange={(e) =>
                                            updateStayLocation(idx, "distance_from_venue", e.target.value)
                                          }
                                          placeholder="e.g., 0.5 miles from venue"
                                        />
                                      </div>
                                      <div className="space-y-1 md:col-span-2">
                                        <Label>Address</Label>
                                        <Input
                                          value={loc.address}
                                          onChange={(e) => updateStayLocation(idx, "address", e.target.value)}
                                          placeholder="Street, City, State"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label>Rate Info (optional)</Label>
                                        <Input
                                          value={loc.rate_info || ""}
                                          onChange={(e) => updateStayLocation(idx, "rate_info", e.target.value)}
                                          placeholder="e.g., $179/night, mention code"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label>Booking URL (optional)</Label>
                                        <Input
                                          value={loc.booking_url || ""}
                                          onChange={(e) => updateStayLocation(idx, "booking_url", e.target.value)}
                                          placeholder="https://..."
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-600"
                                        onClick={() => removeStayLocation(idx)}
                                      >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Remove
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={cancelEditTravelStay} disabled={submitting}>
                              Cancel
                            </Button>
                            <Button onClick={saveTravelStay} disabled={submitting}>
                              {submitting ? "Saving..." : "Save Changes"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <Button variant="outline" onClick={() => beginEditTravelStay(ev)}>
                            Edit Travel & Stay
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="photos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-primary" />
                  Add Photo (Admin)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="photo-url">Photo URL</Label>
                    <Input
                      id="photo-url"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="photo-caption">Caption (optional)</Label>
                    <Input
                      id="photo-caption"
                      value={photoCaption}
                      onChange={(e) => setPhotoCaption(e.target.value)}
                      placeholder="A beautiful moment"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleAddAdminPhoto} disabled={submitting}>
                    {submitting ? "Adding..." : "Add Photo"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-primary" />
                  Pending Photo Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingPhotos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No photos pending approval.</p>
                ) : (
                  <div className="grid md:grid-cols-3 gap-4">
                    {pendingPhotos.map((p) => (
                      <div key={p.id} className="border rounded-md overflow-hidden">
                        <img src={p.url} alt={p.caption || "Pending photo"} className="w-full h-48 object-cover" />
                        <div className="p-3 space-y-2">
                          {p.caption && <p className="text-sm">{p.caption}</p>}
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleApprovePhoto(p.id)}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeletePhoto(p.id)}>
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Add Guest
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guest-name">Full Name</Label>
                    <Input
                      id="guest-name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guest-email">Email (optional)</Label>
                    <Input
                      id="guest-email"
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guest-phone">Phone (optional)</Label>
                    <Input
                      id="guest-phone"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+1 555 555 5555"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Side</Label>
                    <Select value={guestSide} onValueChange={(v) => setGuestSide(v as "bride" | "groom")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select side" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bride">Bride</SelectItem>
                        <SelectItem value="groom">Groom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="guest-relationship">Relationship</Label>
                    <Input
                      id="guest-relationship"
                      value={guestRelationship}
                      onChange={(e) => setGuestRelationship(e.target.value)}
                      placeholder="e.g., aunt, best friend, colleague"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={async () => {
                      if (!guestName.trim() || !guestSide || !guestRelationship.trim()) {
                        toast.error("Please fill name, side and relationship");
                        return;
                      }
                      try {
                        const ref = doc(collection(db, "profiles"));
                        await setDoc(ref, {
                          id: ref.id,
                          full_name: guestName.trim(),
                          email: guestEmail || null,
                          phone: guestPhone || null,
                          side: guestSide,
                          relationship: guestRelationship.trim(),
                          is_admin: false,
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                        });
                        setGuestName("");
                        setGuestEmail("");
                        setGuestPhone("");
                        setGuestSide("");
                        setGuestRelationship("");
                        toast.success("Guest added");
                        fetchData();
                      } catch (e) {
                        console.error(e);
                        toast.error("Failed to add guest");
                      }
                    }}
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : "Add Guest"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Recent Guests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No guests yet.</p>
                ) : (
                  <div className="space-y-3">
                    {profiles.map((p) => (
                      <div key={p.id} className="flex items-center justify-between border rounded-md p-3">
                        <div>
                          <p className="font-medium">{p.full_name || "Unnamed"}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.email || "no email"} • {p.side || "side?"} • {p.relationship || "relationship?"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
