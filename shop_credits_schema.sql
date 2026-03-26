-- =========================================
-- দোকান বাকি ম্যানেজমেন্ট — নতুন স্কিমা
-- Supabase SQL Editor-এ এটি রান করুন
-- =========================================

-- পুরনো টেবিল ড্রপ করুন (যদি আগে তৈরি থাকে)
DROP TABLE IF EXISTS shop_credits CASCADE;

-- ১. দোকানের টেবিল
CREATE TABLE IF NOT EXISTS credit_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE credit_shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own credit_shops"
  ON credit_shops FOR ALL
  USING (auth.uid() = user_id);

-- ২. কেনাকাটা ও পেমেন্ট লগ টেবিল
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES credit_shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'payment')),
  -- কেনাকাটার জন্য (type = 'purchase')
  item_description TEXT,
  item_price NUMERIC DEFAULT 0,
  cash_paid NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,  -- auto = item_price - cash_paid
  -- পেমেন্টের জন্য (type = 'payment')
  payment_amount NUMERIC DEFAULT 0,
  -- সাধারণ
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own credit_transactions"
  ON credit_transactions FOR ALL
  USING (auth.uid() = user_id);
