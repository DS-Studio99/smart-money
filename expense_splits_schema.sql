-- =========================================
-- Expense Splits Schema
-- Supabase SQL Editor-এ রান করুন
-- =========================================

CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  members JSONB DEFAULT '[]'::jsonb,      -- [{name: "Rahim", paid: 500}, ...]
  settlements JSONB DEFAULT '[]'::jsonb,  -- [{id, from, to, amount, date}, ...]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own expense_splits" ON expense_splits FOR ALL USING (auth.uid() = created_by);
