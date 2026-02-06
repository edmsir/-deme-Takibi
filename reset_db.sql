-- Tüm tabloları temizle (Sıralama önemli: Foreign key bağımlılıkları)
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.payment_definitions;
DROP TABLE IF EXISTS public.categories;

-- Categories tablosunu oluştur
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID DEFAULT auth.uid()
);

-- RLS (Row Level Security) - Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own categories" ON public.categories FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert their own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- Payment Definitions tablosunu oluştur
CREATE TABLE public.payment_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID DEFAULT auth.uid(),
    title TEXT NOT NULL,
    amount NUMERIC,
    category TEXT,
    due_date DATE, -- İlk ödeme tarihi
    recurrence_day INTEGER, -- Ayın/Yılın hangi günü
    recurrence_type TEXT DEFAULT 'monthly', -- 'monthly' veya 'yearly'
    last_generated_date DATE,
    description TEXT,
    document_no TEXT, -- Yeni: Belge No
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS - Payment Definitions
ALTER TABLE public.payment_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own definitions" ON public.payment_definitions USING (auth.uid() = user_id);

-- Transactions tablosunu oluştur
CREATE TABLE public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID DEFAULT auth.uid(),
    definition_id UUID REFERENCES public.payment_definitions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    due_date DATE NOT NULL,
    status TEXT CHECK (status IN ('bekliyor', 'odendi', 'ertelendi', 'iptal')) DEFAULT 'bekliyor',
    category TEXT,
    is_installment BOOLEAN DEFAULT FALSE,
    installment_number INTEGER,
    total_installments INTEGER,
    document_no TEXT, -- Yeni: Belge No
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS - Transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own transactions" ON public.transactions USING (auth.uid() = user_id);

-- Profiles tablosunu oluştur (Auth ile senkronize)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS - Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger: Yeni kullanıcı oluştuğunda profile ekle
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Varsayılan Kategorileri Ekle
INSERT INTO public.categories (name) VALUES
  ('Kira'),
  ('Fatura'),
  ('Çek'),
  ('Senet'),
  ('Aidat'),
  ('Kredi'),
  ('Market'),
  ('Diğer')
ON CONFLICT (name) DO NOTHING;
