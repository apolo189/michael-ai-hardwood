-- Site visit notes for field measurements + photos, shareable with subcontractors.
-- Completely separate from the `leads` table (booking form) -- a visit MAY
-- optionally reference an existing lead, but can also be created standalone
-- for clients who called/were referred directly.

CREATE TABLE IF NOT EXISTS site_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER,                          -- optional link back to leads.id
  client_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  property_type TEXT,                       -- house / apartment / condo / commercial
  visit_date TEXT,                          -- ISO date string, user-entered
  services_json TEXT,                       -- JSON array of selected services
  stain_color TEXT,
  finish_coats INTEGER,
  install_type TEXT,                        -- red_oak / prefinished / laminate (if new install)
  total_square_footage REAL,                -- sum of rooms, computed client-side, stored for convenience
  has_stairs INTEGER DEFAULT 0,
  stairs_count INTEGER,
  access_difficulty TEXT,                   -- easy / moderate / difficult
  furniture_moving TEXT,                    -- client_does_it / needs_help
  has_pets INTEGER DEFAULT 0,
  subfloor_condition TEXT,
  color_match_notes TEXT,
  quoted_estimate REAL,                     -- pulled from lead if available
  final_price REAL,                         -- Luis's real price after seeing it in person
  pricing_notes TEXT,
  target_start_date TEXT,
  interest_level TEXT,                      -- hot / warm / cold
  next_step TEXT,                           -- send_estimate / client_thinking / schedule_start / other
  free_notes TEXT,
  share_token TEXT UNIQUE,                  -- random token for the public, no-login WhatsApp share link
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_visits_created_at ON site_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_site_visits_share_token ON site_visits(share_token);
CREATE INDEX IF NOT EXISTS idx_site_visits_lead_id ON site_visits(lead_id);

-- One row per room measured during the visit.
CREATE TABLE IF NOT EXISTS site_visit_rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id INTEGER NOT NULL,
  room_name TEXT,
  length_ft REAL,
  width_ft REAL,
  square_footage REAL,
  current_floor_type TEXT,                  -- hardwood / laminate / carpet / tile / concrete
  condition TEXT,                           -- good / fair / damaged / water_damage / pet_damage
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (visit_id) REFERENCES site_visits(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_site_visit_rooms_visit_id ON site_visit_rooms(visit_id);

-- Photos taken during the visit, stored in R2 (PHOTOS bucket) -- this table
-- only stores metadata + the R2 object key, never the binary itself.
CREATE TABLE IF NOT EXISTS site_visit_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  room_name TEXT,                           -- optional label, e.g. which room this photo is of
  caption TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (visit_id) REFERENCES site_visits(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_site_visit_photos_visit_id ON site_visit_photos(visit_id);
