-- 1. Önce eski verilere temizlik yapalım
DELETE FROM public.categories;

-- 2. Eski kısıtlamaları ve indeksleri kaldıralım
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_key;
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_user_id_name_key;
DROP INDEX IF EXISTS categories_name_global_key;
DROP INDEX IF EXISTS categories_user_name_key;

-- 3. user_id alanını BOŞ BIRAKILABİLİR (NULLable) yapalım
ALTER TABLE public.categories ALTER COLUMN user_id DROP NOT NULL;

-- 4. Küresel (Global) kategoriler için isim benzersizliği kısıtlaması ekle
CREATE UNIQUE INDEX categories_name_global_key ON public.categories (name) WHERE user_id IS NULL;

-- 5. Kullanıcı özel kategorileri için isim benzersizliği kısıtlaması
CREATE UNIQUE INDEX categories_user_name_key ON public.categories (user_id, name) WHERE user_id IS NOT NULL;

-- 6. Küresel (Global) kategorileri ekleyelim
INSERT INTO public.categories (name, user_id) VALUES
  ('Kira', NULL),
  ('Fatura', NULL),
  ('Çek', NULL),
  ('Senet', NULL),
  ('Aidat', NULL),
  ('Kredi', NULL),
  ('Market', NULL),
  ('Diğer', NULL);
