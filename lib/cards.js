import { supabase } from "./supabase.js";

const imageCacheUrl = "https://fanable.verbatiam.dev/api/scryfall/image";
// PostgREST caps each response (1000 rows by default), so read the cards in batches
const BATCH_SIZE = 1000;
export const SLOTS_PER_PAGE = 9;

async function fetchBinderSlots() {
  const rows = [];
  for (let from = 0; ; from += BATCH_SIZE) {
    // Each slot joins to its card by card_id and to the owned printing, if one is recorded, by printing_id;
    // the slot's foiling sets the finish overlay
    const { data, error } = await supabase
      .from("binder_slots")
      .select(
        "book, page, slot, foiling, cards!card_id(id, name, set_name, image_grid, image_display, card_faces, card_ownership(quantity, is_specific)), printing:cards!printing_id(id, image_grid, image_display, card_faces, card_ownership(quantity, is_specific))",
      )
      .order("book")
      .order("page")
      .order("slot")
      .range(from, from + BATCH_SIZE - 1);

    if (error)
      throw new Error(`Failed to fetch binder slots: ${error.message}`);
    rows.push(...data);
    if (data.length < BATCH_SIZE) return rows;
  }
}

export async function fetchAndMergeCollections() {
  const rows = await fetchBinderSlots();

  return rows.map(({ book, page, slot, foiling, cards: card, printing }) => {
    // Show the owned printing's image and ownership, keeping the slot's card id
    const shown = printing ?? card;
    return {
      ...card,
      image_grid: shown.image_grid,
      image_display: shown.image_display,
      card_faces: shown.card_faces,
      Name: card.name,
      Owned: shown.card_ownership.reduce((sum, o) => sum + o.quantity, 0),
      IsSpecific: shown.card_ownership.some((o) => o.is_specific),
      Finish: foiling,
      Book: book,
      Page: page,
      Slot: slot,
    };
  });
}

// Serve Scryfall images through the image cache
function cachedImage(scryfallUrl) {
  return `${imageCacheUrl}?url=${encodeURIComponent(scryfallUrl)}`;
}

// Grid image for the binder slot, higher quality display image for the full screen view
function toCardImage(imageUris, owned) {
  return {
    url: cachedImage(imageUris.grid),
    displayUrl: cachedImage(imageUris.display || imageUris.grid),
    owned,
  };
}

export function retrieveCardImage(card) {
  if (card.card_faces) {
    for (const face of card.card_faces) {
      if (
        face.type_line &&
        face.type_line.includes("Legendary") &&
        face.type_line.includes("Creature") &&
        face.image_uris?.grid
      ) {
        return toCardImage(face.image_uris, card.Owned);
      }
    }
  }

  if (card.image_grid) {
    return toCardImage(
      { grid: card.image_grid, display: card.image_display },
      card.Owned,
    );
  }
  return null;
}

// Every printing of a card, oldest first, each with its image and whether it's owned
export async function fetchPrintings(name) {
  const { data, error } = await supabase
    .from("cards")
    .select(
      "id, name, set_name, collector_number, released_at, finishes, image_grid, image_display, card_faces, card_ownership(quantity)",
    )
    .eq("name", name)
    .order("released_at")
    .order("collector_number");

  if (error) throw new Error(`Failed to fetch printings: ${error.message}`);
  return data.map((card) => {
    const Owned = card.card_ownership.reduce((sum, o) => sum + o.quantity, 0);
    return {
      ...card,
      finishes: card.finishes ?? [],
      image: retrieveCardImage({ ...card, Owned }),
    };
  });
}

export function getPageImages(cards, pageNumber, slotsPerPage) {
  const images = Array(slotsPerPage).fill(null);
  cards
    .filter((card) => card.Page == pageNumber)
    .forEach((card) => {
      const image = retrieveCardImage(card);
      images[card.Slot - 1] = image && {
        ...image,
        id: card.id,
        name: card.name,
        isSpecific: card.IsSpecific,
        finish: card.Finish,
      };
    });
  return images;
}

// Warm the browser cache so the images are ready when the page is shown
export function prefetchPageImages(cards, pageNumber, slotsPerPage) {
  if (pageNumber <= 0) return;
  getPageImages(cards, pageNumber, slotsPerPage).forEach((image) => {
    if (image) new Image().src = image.url;
  });
}
