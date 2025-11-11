-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'guest');

-- Create enum for RSVP status
CREATE TYPE public.rsvp_status AS ENUM ('pending', 'accepted', 'declined');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  venue_name TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  venue_lat DECIMAL(10, 8),
  venue_lng DECIMAL(11, 8),
  dress_code TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage events"
  ON public.events FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create RSVPs table
CREATE TABLE public.rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  status rsvp_status NOT NULL DEFAULT 'pending',
  guest_count INTEGER NOT NULL DEFAULT 1,
  dietary_restrictions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own RSVPs"
  ON public.rsvps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own RSVPs"
  ON public.rsvps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own RSVPs"
  ON public.rsvps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all RSVPs"
  ON public.rsvps FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create photos table
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  original_filename TEXT NOT NULL,
  album_name TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photos are viewable by authenticated users"
  ON public.photos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload photos"
  ON public.photos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = uploader_id);

CREATE POLICY "Admins can manage all photos"
  ON public.photos FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create guestbook table
CREATE TABLE public.guestbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.guestbook_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guestbook entries are viewable by everyone"
  ON public.guestbook_entries FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create entries"
  ON public.guestbook_entries FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON public.guestbook_entries FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all entries"
  ON public.guestbook_entries FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create gift registry table
CREATE TABLE public.gift_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  store_name TEXT,
  store_url TEXT,
  image_url TEXT,
  reserved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gift registry is viewable by everyone"
  ON public.gift_registry FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can reserve gifts"
  ON public.gift_registry FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage gift registry"
  ON public.gift_registry FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create site config table
CREATE TABLE public.site_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site config is viewable by everyone"
  ON public.site_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage site config"
  ON public.site_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rsvps_updated_at
  BEFORE UPDATE ON public.rsvps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gift_registry_updated_at
  BEFORE UPDATE ON public.gift_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_config_updated_at
  BEFORE UPDATE ON public.site_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Guest'),
    NEW.email
  );
  
  -- Assign guest role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'guest');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wedding-photos', 'wedding-photos', false);

-- Storage policies for wedding photos
CREATE POLICY "Authenticated users can view photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wedding-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wedding-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'wedding-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can delete photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'wedding-photos' AND public.has_role(auth.uid(), 'admin'));