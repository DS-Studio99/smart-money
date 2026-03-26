-- =========================================================
-- Smart Money - নতুন ফিচারের জন্য SQL Schema
-- Supabase SQL Editor-এ এটি রান করুন
-- =========================================================

-- ───────────────────────────────────────────────
-- ১. Income Sources (আয়ের উৎস)
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '💰',
  type TEXT DEFAULT 'recurring' CHECK (type IN ('recurring', 'one_time')),
  color TEXT DEFAULT '#10B981',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own income_sources" ON income_sources
  FOR ALL USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────
-- ২. Income Entries (আয়ের এন্ট্রি)
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS income_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  source_id UUID REFERENCES income_sources(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  month INTEGER GENERATED ALWAYS AS (EXTRACT(MONTH FROM date)::INTEGER) STORED,
  year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)::INTEGER) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own income_entries" ON income_entries
  FOR ALL USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────
-- ৩. Expense Splits (খরচ ভাগাভাগি)
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  members JSONB DEFAULT '[]'::jsonb,
  settlements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own expense_splits" ON expense_splits
  FOR ALL USING (auth.uid() = created_by);
