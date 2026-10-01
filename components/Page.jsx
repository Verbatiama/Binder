import CardSlot from "./CardSlot.jsx";
import { retrieveCardImage } from "../lib/cards.js";

const SLOTS_PER_PAGE = 9;

export default function Page({ id, pageNumber, cards, onSelect }) {
  const images = Array(SLOTS_PER_PAGE).fill(null);
  if (cards) {
    cards
      .filter((card) => card.Page == pageNumber)
      .forEach((card) => {
        images[card.Slot - 1] = retrieveCardImage(card);
      });
  }

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
