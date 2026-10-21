import { supabase } from "./supabase.js";

const imageCacheUrl = "https://fanable.verbatiam.dev/api/scryfall/image";
// PostgREST caps each response (1000 rows by default), so read the cards in batches
const BATCH_SIZE = 1000;
export const SLOTS_PER_PAGE = 9;

async function fetchBinderSlots() {
  const rows = [];
  for (let from = 0; ; from += BATCH_SIZE) {
    // Each slot joins to its card by card_id; the slot's foiling is ignored
    const { data, error } = await supabase
      .from("binder_slots")
      .select(
        "book, page, slot, cards(id, name, set_name, image_grid, image_display, card_faces, card_ownership(quantity))",
      )
      .order("book")
      .order("page")
      .order("slot")
      .range(from, from + BATCH_SIZE - 1);

    if (error) throw new Error(`Failed to fetch binder slots: ${error.message}`);
    rows.push(...data);
    if (data.length < BATCH_SIZE) return rows;
  }
}

export async function fetchAndMergeCollections() {
  const rows = await fetchBinderSlots();

  return rows.map(({ book, page, slot, cards: card }) => ({
    ...card,
    Name: card.name,
    Owned: card.card_ownership.reduce((sum, o) => sum + o.quantity, 0),
    Book: book,
    Page: page,
    Slot: slot,
  }));
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
  if (card.image_grid) {
    return toCardImage(
      { grid: card.image_grid, display: card.image_display },
      card.Owned,
    );
  } else if (card.card_faces) {
    for (const face of card.card_faces) {
      if (
        face.type_line &&
        face.type_line.includes("Legendary") &&
        face.type_line.includes("Creature") &&
        face.image_uris.grid
      ) {
        return toCardImage(face.image_uris, card.Owned);
      }
    }
  }
  return null;
}

export function getPageImages(cards, pageNumber, slotsPerPage) {
  const images = Array(slotsPerPage).fill(null);
  cards
    .filter((card) => card.Page == pageNumber)
    .forEach((card) => {
      images[card.Slot - 1] = retrieveCardImage(card);
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
