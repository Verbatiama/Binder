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
  if (card.image_uris && card.image_uris.large) {
    return { url: card.image_uris.large, owned: card.Owned };
  } else if (card.card_faces) {
    for (const face of card.card_faces) {
      if (
        face.type_line &&
        face.type_line.includes("Legendary") &&
        face.type_line.includes("Creature") &&
        face.image_uris.large
      ) {
        return { url: face.image_uris.large, owned: card.Owned };
      }
    }
  }
  return null;
}
