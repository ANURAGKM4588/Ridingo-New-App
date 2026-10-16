-- ==============================================================================
-- RIDINGO — COMPLETE PRODUCTION DATABASE SETUP & HEALTH MIGRATION
-- Project: https://supabase.com/dashboard/project/xxmcjgonsxpjrgdxchwl
-- Compatible with: User App (Android/iOS) + Driver App (Android/iOS)
-- ==============================================================================
-- Instructions:
-- 1. Open Supabase Dashboard -> "SQL Editor"
-- 2. Paste this entire script into a "New Query" and click "Run".
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: public.profiles (Users & Riders)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    phone text PRIMARY KEY,
    name text,
    email text,
    car jsonb,
    preferences jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. TABLE: public.trips (Bookings, Dispatches & Live Trips)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trips (
    id text PRIMARY KEY,
    cat text NOT NULL,
    qty numeric DEFAULT 1,
    pickup text NOT NULL,
    drop_loc text,
    when_ts bigint NOT NULL,
    done_ts bigint DEFAULT 0,
    fare numeric NOT NULL,
    advance numeric NOT NULL,
    status text DEFAULT 'requested',
    driver jsonb,
    car jsonb,
    rider jsonb,
    cashback numeric DEFAULT 0,
    by_who text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Ensure all optional & extended columns exist on trips
DO $$
BEGIN
    ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS distance_km numeric;
    ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS distance_text text;
    ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS duration_text text;
    ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS eta text;
    ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS otp text;
    ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS vehicle_brand text;
    ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS vehicle_model text;
    ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS vehicle_number text;
    ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS car_photos jsonb DEFAULT '[]'::jsonb;
END $$;

-- ------------------------------------------------------------------------------
-- 3. TABLE: public.drivers (Driver Partners Registry)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drivers (
    id text PRIMARY KEY,
    name text,
    first_name text,
    last_name text,
    phone text,
    email text,
    home_address text,
    street text,
    city text DEFAULT 'Kochi',
    pincode text,
    state text DEFAULT 'Kerala',
    nationality text DEFAULT 'India',
    dl_number text,
    dl_photo text,
    aadhar_number text,
    aadhar_photo text,
    avatar text,
    category text DEFAULT 'new_registration',
    status text DEFAULT 'pending',
    rating numeric DEFAULT 5.0,
    trips_completed integer DEFAULT 0,
    total_earnings numeric DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4. TABLE: public.notifications (Push & In-App Notifications)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id text PRIMARY KEY,
    user_id text,
    driver_id text,
    title text,
    message text,
    type text DEFAULT 'info',
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures Android & iOS mobile apps have seamless read/write access via Anon key
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Profiles RLS
    DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
    DROP POLICY IF EXISTS "Public profiles insert" ON public.profiles;
    DROP POLICY IF EXISTS "Public profiles update" ON public.profiles;
    DROP POLICY IF EXISTS "Public profiles delete" ON public.profiles;
    CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);
    CREATE POLICY "Public profiles insert" ON public.profiles FOR INSERT WITH CHECK (true);
    CREATE POLICY "Public profiles update" ON public.profiles FOR UPDATE USING (true);
    CREATE POLICY "Public profiles delete" ON public.profiles FOR DELETE USING (true);

    -- Trips RLS
    DROP POLICY IF EXISTS "Public trips read" ON public.trips;
    DROP POLICY IF EXISTS "Public trips insert" ON public.trips;
    DROP POLICY IF EXISTS "Public trips update" ON public.trips;
    DROP POLICY IF EXISTS "Public trips delete" ON public.trips;
    CREATE POLICY "Public trips read" ON public.trips FOR SELECT USING (true);
    CREATE POLICY "Public trips insert" ON public.trips FOR INSERT WITH CHECK (true);
    CREATE POLICY "Public trips update" ON public.trips FOR UPDATE USING (true);
    CREATE POLICY "Public trips delete" ON public.trips FOR DELETE USING (true);

    -- Drivers RLS
    DROP POLICY IF EXISTS "Public drivers read" ON public.drivers;
    DROP POLICY IF EXISTS "Public drivers insert" ON public.drivers;
    DROP POLICY IF EXISTS "Public drivers update" ON public.drivers;
    DROP POLICY IF EXISTS "Public drivers delete" ON public.drivers;
    CREATE POLICY "Public drivers read" ON public.drivers FOR SELECT USING (true);
    CREATE POLICY "Public drivers insert" ON public.drivers FOR INSERT WITH CHECK (true);
    CREATE POLICY "Public drivers update" ON public.drivers FOR UPDATE USING (true);
    CREATE POLICY "Public drivers delete" ON public.drivers FOR DELETE USING (true);

    -- Notifications RLS
    DROP POLICY IF EXISTS "Public notifications read" ON public.notifications;
    DROP POLICY IF EXISTS "Public notifications insert" ON public.notifications;
    DROP POLICY IF EXISTS "Public notifications update" ON public.notifications;
    DROP POLICY IF EXISTS "Public notifications delete" ON public.notifications;
    CREATE POLICY "Public notifications read" ON public.notifications FOR SELECT USING (true);
    CREATE POLICY "Public notifications insert" ON public.notifications FOR INSERT WITH CHECK (true);
    CREATE POLICY "Public notifications update" ON public.notifications FOR UPDATE USING (true);
    CREATE POLICY "Public notifications delete" ON public.notifications FOR DELETE USING (true);
END $$;

-- ------------------------------------------------------------------------------
-- 6. ENABLE SUPABASE REALTIME REPLICATION
-- Realtime streaming for trips, drivers, and notifications across apps
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

-- ------------------------------------------------------------------------------
-- 7. STORAGE BUCKETS (Vehicle Photos & Driver Documents)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('vehicle-inspections', 'vehicle-inspections', true),
    ('driver-documents', 'driver-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage bucket access policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access vehicle-inspections" ON storage.objects;
    CREATE POLICY "Public Access vehicle-inspections" ON storage.objects
        FOR ALL USING (bucket_id IN ('vehicle-inspections', 'driver-documents'))
        WITH CHECK (bucket_id IN ('vehicle-inspections', 'driver-documents'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
