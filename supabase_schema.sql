-- SUPABASE COMPLETE RESET SCRIPT
-- WARNING: This will delete ALL data in your tables.

-- 1. Drop existing objects in reverse order of dependencies
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.payment_definitions;
DROP TABLE if EXISTS public.categories;
DROP TABLE IF EXISTS public.profiles;

-- 2. Profiles Table (User roles)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Categories Table
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 4. Payment Definitions Table
create table public.payment_definitions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  amount numeric,
  category text,
  recurrence_type text not null,
  recurrence_day integer,
  last_generated_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
ALTER TABLE public.payment_definitions ENABLE ROW LEVEL SECURITY;

-- 5. Transactions Table
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  definition_id uuid references public.payment_definitions,
  title text not null,
  amount numeric not null,
  due_date date not null,
  status text check (status in ('bekliyor', 'odendi', 'ertelendi', 'iptal')) default 'bekliyor',
  category text,
  is_installment boolean default false,
  installment_number integer,
  total_installments integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Categories
CREATE POLICY "Everyone can handle categories" ON public.categories FOR ALL USING (true);

-- Definitions
CREATE POLICY "Everyone can handle definitions" ON public.payment_definitions FOR ALL USING (true);

-- Transactions
CREATE POLICY "Everyone can handle transactions" ON public.transactions FOR ALL USING (true);

-- 7. Trigger to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      -- Buraya admin yapmak istediğiniz e-postayı yazın (Username kullanıyorsanız arkada @takip.com olacaktır)
      WHEN NEW.email = 'admin.edm@takip.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
