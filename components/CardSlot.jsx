import { useState } from "react";
import cardBack from "../assets/card-back.svg";

export default function CardSlot({ image, onSelect }) {
  // Tracks which url has finished loading, so a new page's image starts hidden again
  const [loadedUrl, setLoadedUrl] = useState(null);
  const loaded = image && loadedUrl === image.url;

  return (
    <div className="card-slot">
      <img src={cardBack} alt="Card back" className="card-back" />
      {image && (
        <img
          src={image.url}
          alt="Card"
          className="card-image"
          style={{
            opacity: loaded ? 1 : 0,
            filter: image.owned === 0 ? "grayscale(100%) brightness(0.6)" : undefined,
          }}
          onLoad={() => setLoadedUrl(image.url)}
          onClick={() => onSelect(image.displayUrl)}
        />
      )}
    </div>
  );
}
