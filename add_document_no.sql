-- transactions tablosuna document_no ekle
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'document_no') THEN
        ALTER TABLE public.transactions ADD COLUMN document_no TEXT;
    END IF;
END $$;

-- payment_definitions tablosuna document_no ekle (Şablon için)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_definitions' AND column_name = 'document_no') THEN
        ALTER TABLE public.payment_definitions ADD COLUMN document_no TEXT;
    END IF;
END $$;
