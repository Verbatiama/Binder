-- Editing a card now records the chosen printing in binder_slots.printing_id
-- and leaves the slot's card_id alone.

-- Records the chosen printing and finish of each card in one transaction.
-- selections is a JSON array of { slot_card_id, name, printing_id, foiling }.
-- Runs as the caller, so the owner policies still apply.
create or replace function public.set_ownership(selections jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selection jsonb;
  slot_card_id public.binder_slots.card_id%type;
  chosen_printing_id public.card_ownership.id%type;
  finish public.card_ownership.foiling%type;
begin
  if not public.is_binder_owner() then
    raise exception 'Only binder owners can change ownership' using errcode = '42501';
  end if;

  for selection in select value from jsonb_array_elements(selections) loop
    slot_card_id := selection ->> 'slot_card_id';
    chosen_printing_id := selection ->> 'printing_id';
    finish := selection ->> 'foiling';

    -- Move the card's non-specific ownership row onto the chosen printing and finish, keeping its quantity;
    -- if the card wasn't owned at all, add a row for the chosen printing
    with moved as (
      update public.card_ownership
      set id = chosen_printing_id, is_specific = true, foiling = finish
      where (not is_specific and id in (select id from public.cards where name = selection ->> 'name'))
         or id = chosen_printing_id
      returning id
    )
    insert into public.card_ownership (id, quantity, is_specific, foiling)
    select chosen_printing_id, 1, true, finish
    where not exists (select 1 from moved);

    -- Show the chosen printing in the binder slot, keeping the slot's card
    update public.binder_slots
    set printing_id = chosen_printing_id, foiling = finish
    where card_id = slot_card_id;
  end loop;
end;
$$;
