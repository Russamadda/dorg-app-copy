ALTER TABLE tilbud
ADD COLUMN IF NOT EXISTS sett_som_lest boolean
DEFAULT false;
