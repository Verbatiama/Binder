import CardSlot from "./CardSlot.jsx";
import { getPageImages, SLOTS_PER_PAGE } from "../lib/cards.js";

export { SLOTS_PER_PAGE };

export default function Page({
  id,
  pageNumber,
  cards,
  selections,
  highlightedIds,
  editMode,
  onSelect,
}) {
  // Page 0 is the blank inside cover; before cards load, every slot shows a card back
  const images =
    cards && pageNumber !== 0
      ? getPageImages(cards, pageNumber, SLOTS_PER_PAGE)
      : Array(SLOTS_PER_PAGE).fill(null);

  return (
    <div className="page" id={id}>
      {images.map((image, i) => (
        <CardSlot
          key={i}
          image={image}
          selected={image && selections.has(image.id)}
          highlighted={image && highlightedIds?.has(image.id)}
          editMode={editMode}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
