import CardSlot from "./CardSlot.jsx";
import { getPageImages } from "../lib/cards.js";

export const SLOTS_PER_PAGE = 9;

export default function Page({ id, pageNumber, cards, onSelect }) {
  const images = cards
    ? getPageImages(cards, pageNumber, SLOTS_PER_PAGE)
    : Array(SLOTS_PER_PAGE).fill(null);

  // Before cards load, slots stay as empty placeholders
  let placeholder = "";
  if (cards) placeholder = pageNumber === 0 ? "Blank" : "Error";

  return (
    <div className="page" id={id}>
      {images.map((image, i) => (
        <CardSlot
          key={i}
          image={pageNumber === 0 ? null : image}
          placeholder={placeholder}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
