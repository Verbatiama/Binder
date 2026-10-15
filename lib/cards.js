const collectionUrl =
  "https://raw.githubusercontent.com/Verbatiama/LegendaryCreatureCollectionStorage/main/collection.json";
const fullCardsUrl =
  "https://raw.githubusercontent.com/Verbatiama/LegendaryCreatureCollectionStorage/main/FullCards.json";

export async function fetchAndMergeCollections() {
  // Fetch both files in parallel
  const [collectionRes, fullCardsRes] = await Promise.all([
    fetch(collectionUrl),
    fetch(fullCardsUrl),
  ]);

  if (!collectionRes.ok || !fullCardsRes.ok) {
    throw new Error("Failed to fetch one or both resources");
  }

  const collection = await collectionRes.json();
  const fullCards = await fullCardsRes.json();

  const fullCardsMap = new Map();
  fullCards.forEach((card) => {
    fullCardsMap.set(card.name, card);
  });

  // Merge collection with fullCards by Name
  return collection.map((item) => ({
    ...item,
    ...(fullCardsMap.get(item.Name) || {}),
  }));
}

export function retrieveCardImage(card) {
  if (card.image_uris && card.image_uris.grid) {
    return { url: card.image_uris.grid, owned: card.Owned };
  } else if (card.card_faces) {
    for (const face of card.card_faces) {
      if (
        face.type_line &&
        face.type_line.includes("Legendary") &&
        face.type_line.includes("Creature") &&
        face.image_uris.grid
      ) {
        return { url: face.image_uris.grid, owned: card.Owned };
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
