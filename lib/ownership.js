import { supabase } from "./supabase.js";

// Records which printing of each card is owned, via the set_ownership database function.
// selections maps a binder slot's card id to { name, printing, foiling }, or { name, remove: true }.
export async function saveOwnership(selections) {
  const rows = [...selections].map(([slotCardId, { name, printing, foiling, remove }]) =>
    remove
      ? { slot_card_id: slotCardId, name, remove: true }
      : { slot_card_id: slotCardId, name, printing_id: printing.id, foiling },
  );
  const { error } = await supabase.rpc("set_ownership", { selections: rows });
  if (error) throw new Error(`Failed to save ownership: ${error.message}`);
}
