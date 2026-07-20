-- Michael AI Hardwood Flooring — Initial Schema

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  service TEXT,
  square_footage REAL,
  finish_option TEXT,
  estimate_low REAL,
  estimate_high REAL,
  labor_only INTEGER DEFAULT 0,
  appointment_day_pref TEXT,
  appointment_window TEXT,
  photos_json TEXT,
  conversation_summary TEXT,
  consent_contact INTEGER DEFAULT 0,
  status TEXT DEFAULT 'new',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  messages_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
