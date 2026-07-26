-- Signable contracts/estimates, generated from an existing site_visit and
-- sent to the client to sign electronically on the spot (phone/tablet).
-- Each row is a snapshot of the agreed terms AT THE TIME the contract was
-- generated — later edits to the underlying site_visit never change an
-- already-generated contract, so a signed contract can never silently drift.

CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id INTEGER NOT NULL REFERENCES site_visits(id),
  contract_token TEXT UNIQUE NOT NULL,

  -- Snapshot of client/job info at time of contract creation (copied from
  -- the visit so this row is self-contained and always renders correctly
  -- even if the visit is edited/deleted later).
  client_name TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  services_text TEXT,
  total_square_footage REAL,
  total_price REAL,
  deposit_percent INTEGER DEFAULT 30,
  deposit_amount REAL,
  target_start_date TEXT,
  terms_text TEXT,

  -- Signature / proof of acceptance
  status TEXT NOT NULL DEFAULT 'pending', -- pending | signed | void
  signer_name TEXT,
  signature_data TEXT,       -- base64 PNG data URL drawn on the canvas
  signed_at TEXT,
  signer_ip TEXT,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contracts_visit_id ON contracts(visit_id);
CREATE INDEX IF NOT EXISTS idx_contracts_token ON contracts(contract_token);
