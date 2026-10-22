-- Lets signed-in binder owners record card ownership from the site.
-- After running this, add yourself as an owner:
--   insert into public.binder_owners (user_id) values ('<your auth user id>');

create table if not exists public.binder_owners (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.binder_owners enable row level security;
alter table public.cards enable row level security;
alter table public.card_ownership enable row level security;
alter table public.binder_slots enable row level security;

grant select on public.cards, public.card_ownership, public.binder_slots to anon, authenticated;
grant select on public.binder_owners to authenticated;
grant insert, update on public.card_ownership to authenticated;
grant update on public.binder_slots to authenticated;

-- Everyone can read the collection, signed in or not
drop policy if exists "Anyone can read cards" on public.cards;
create policy "Anyone can read cards" on public.cards
  for select to anon, authenticated using (true);

drop policy if exists "Anyone can read card ownership" on public.card_ownership;
create policy "Anyone can read card ownership" on public.card_ownership
  for select to anon, authenticated using (true);

drop policy if exists "Anyone can read binder slots" on public.binder_slots;
create policy "Anyone can read binder slots" on public.binder_slots
  for select to anon, authenticated using (true);

drop policy if exists "Owners can see themselves" on public.binder_owners;
create policy "Owners can see themselves" on public.binder_owners
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.is_binder_owner()
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from public.binder_owners where user_id = (select auth.uid()));
$$;

-- Only owners can change ownership and binder slots
drop policy if exists "Owners can add card ownership" on public.card_ownership;
create policy "Owners can add card ownership" on public.card_ownership
  for insert to authenticated with check ((select public.is_binder_owner()));

drop policy if exists "Owners can change card ownership" on public.card_ownership;
create policy "Owners can change card ownership" on public.card_ownership
  for update to authenticated
  using ((select public.is_binder_owner()))
  with check ((select public.is_binder_owner()));

drop policy if exists "Owners can change binder slots" on public.binder_slots;
create policy "Owners can change binder slots" on public.binder_slots
  for update to authenticated
  using ((select public.is_binder_owner()))
  with check ((select public.is_binder_owner()));

-- Records the chosen printing and finish of each card in one transaction.
-- selections is a JSON array of { slot_card_id, name, printing_id, foiling }.
-- Runs as the caller, so the policies above still apply.
create or replace function public.set_ownership(selections jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selection jsonb;
  slot_card_id public.binder_slots.card_id%type;
  printing_id public.card_ownership.id%type;
  finish public.card_ownership.foiling%type;
begin
  if not public.is_binder_owner() then
    raise exception 'Only binder owners can change ownership' using errcode = '42501';
  end if;

  for selection in select value from jsonb_array_elements(selections) loop
    slot_card_id := selection ->> 'slot_card_id';
    printing_id := selection ->> 'printing_id';
    finish := selection ->> 'foiling';

    -- Move the card's non-specific ownership row onto the chosen printing and finish, keeping its quantity;
    -- if the card wasn't owned at all, add a row for the chosen printing
    with moved as (
      update public.card_ownership
      set id = printing_id, is_specific = true, foiling = finish
      where (not is_specific and id in (select id from public.cards where name = selection ->> 'name'))
         or id = printing_id
      returning id
    )
    insert into public.card_ownership (id, quantity, is_specific, foiling)
    select printing_id, 1, true, finish
    where not exists (select 1 from moved);

    -- Show the chosen printing in the binder slot
    update public.binder_slots
    set card_id = printing_id, foiling = finish
    where card_id = slot_card_id;
  end loop;
end;
$$;

revoke execute on function public.set_ownership(jsonb) from public, anon;
grant execute on function public.set_ownership(jsonb) to authenticated;
