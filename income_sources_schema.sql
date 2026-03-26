-- =========================================
-- Income Sources & Growth Tracker Schema
-- Supabase SQL Editor-এ রান করুন
-- =========================================

-- income_sources table: প্রতিটি আয়ের উৎস
CREATE TABLE IF NOT EXISTS income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- উৎসের নাম (চাকরি, ফ্রিল্যান্সিং, টিউশন ইত্যাদি)
  icon TEXT DEFAULT '💰',          -- ইমোজি আইকন
  type TEXT DEFAULT 'recurring' CHECK (type IN ('recurring', 'one_time')), -- নিয়মিত বা এককালীন
  color TEXT DEFAULT '#10B981',    -- UI রঙ
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own income_sources" ON income_sources FOR ALL USING (auth.uid() = user_id);

-- income_entries table: প্রতিমাসে প্রতিটি সোর্স থেকে কত আয় হলো
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
CREATE POLICY "Users can manage own income_entries" ON income_entries FOR ALL USING (auth.uid() = user_id);
