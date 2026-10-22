-- Collector numbers aren't always whole numbers (The List's "BOK-7", promos like "123p"),
-- so store them as text. Re-run the card import afterwards to add the printings that were skipped.
alter table public.cards alter column collector_number type text;
