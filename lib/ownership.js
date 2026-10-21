// Builds the SQL that records which printing of each card is owned.
// selections maps a binder slot's card id to { name, printing, foiling }.
const sqlString = (value) => `'${String(value).replace(/'/g, "''")}'`;

function printingSql(slotCardId, name, printing, foiling) {
  const id = sqlString(printing.id);
  const finish = sqlString(foiling);
  // Move the card's non-specific ownership row onto the chosen printing and finish, keeping its quantity;
  // if the card wasn't owned at all, add a row for the chosen printing
  return `-- ${name}: ${printing.set_name} #${printing.collector_number} (${foiling})
WITH moved AS (
  UPDATE card_ownership
  SET id = ${id}, is_specific = true, foiling = ${finish}
  WHERE (NOT is_specific AND id IN (SELECT id FROM cards WHERE name = ${sqlString(name)}))
     OR id = ${id}
  RETURNING id
)
INSERT INTO card_ownership (id, quantity, is_specific, foiling)
SELECT ${id}, 1, true, ${finish}
WHERE NOT EXISTS (SELECT 1 FROM moved);

-- Show the chosen printing in the binder slot
UPDATE binder_slots
SET card_id = ${id}, foiling = ${finish}
WHERE card_id = ${sqlString(slotCardId)};`;
}

export function buildOwnershipSql(selections) {
  const statements = [...selections].map(([slotCardId, { name, printing, foiling }]) =>
    printingSql(slotCardId, name, printing, foiling),
  );
  return ["BEGIN;", ...statements, "COMMIT;"].join("\n\n");
}
