-- KATEGORİLERİ DOLDURMA SORGUSU
-- Bu sorguyu Supabase SQL Editor'de çalıştırın.
-- NOT: user_id kısmını kendi kullanıcınızın ID'si ile değiştirmeniz gerekebilir 
-- veya tüm kullanıcılar için ortak kategoriler istiyorsanız tablo yapısını ona göre düzenleyebiliriz.

-- Mevcut kategorileri temizlemek isterseniz (Opsiyonel):
-- DELETE FROM public.categories;

-- Örnek kategoriler ekleme
-- Eğer user_id zorunluysa, önce auth.users tablosundan kendi ID'nizi alıp aşağıya yapıştırın.
-- Şimdilik en son oluşturulan admin kullanıcısının ID'sini otomatik bulmaya çalışalım:

DO $$
DECLARE
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'admin.edm@takip.com' LIMIT 1;

    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.categories (user_id, name) VALUES
        (target_user_id, 'Mutfak & Market'),
        (target_user_id, 'Kira & Aidat'),
        (target_user_id, 'Faturalar (Elektrik, Su, Doğalgaz)'),
        (target_user_id, 'Ulaşım & Yakıt'),
        (target_user_id, 'Eğlence & Sosyal Aktivite'),
        (target_user_id, 'Sağlık'),
        (target_user_id, 'Eğitim'),
        (target_user_id, 'Giyim & Aksesuar'),
        (target_user_id, 'Elektronik & Hobiler'),
        (target_user_id, 'Diğer Ödemeler');
    END IF;
END $$;
