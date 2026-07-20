-- Michael AI Hardwood Flooring — v2 schema update
-- Replaces low/high estimate range with a single exact total (per new pricing model),
-- adds finish_coats and wants_call_now columns.

ALTER TABLE leads ADD COLUMN estimate_total REAL;
ALTER TABLE leads ADD COLUMN finish_coats INTEGER;
ALTER TABLE leads ADD COLUMN wants_call_now INTEGER DEFAULT 0;
