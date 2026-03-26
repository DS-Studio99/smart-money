-- =========================================
-- দোকান বাকি ম্যানেজমেন্ট — Shop Credits Table
-- Supabase SQL Editor-এ এটি রান করুন
-- =========================================

CREATE TABLE IF NOT EXISTS shop_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL,
  item_description TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  purchase_date DATE NOT NULL,
  due_date DATE,
  note TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  payment_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shop_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own shop_credits"
  ON shop_credits FOR ALL
  USING (auth.uid() = user_id);
