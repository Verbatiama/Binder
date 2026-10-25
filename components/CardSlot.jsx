import { useEffect, useRef, useState } from "react";
import cardBack from "../assets/card-back.svg";

export default function CardSlot({ image, selected, highlightedIds, editMode, onSelect }) {
  // Tracks which url has finished loading, so a new page's image starts hidden again
  const [loadedUrl, setLoadedUrl] = useState(null);
  const loaded = image && loadedUrl === image.url;
  const highlighted = Boolean(image && highlightedIds?.has(image.id));
  const slotRef = useRef(null);

  // Each search creates a new set of ids, so restart the pulse even when this slot stays highlighted
  useEffect(() => {
    if (!highlighted) return;
    for (const animation of slotRef.current.getAnimations()) {
      if (animation.animationName === "card-highlight") {
        animation.cancel();
        animation.play();
      }
    }
  }, [highlighted, highlightedIds]);

  return (
    <div
      ref={slotRef}
      className={`card-slot${selected ? " selected" : ""}${highlighted ? " highlighted" : ""}`}
    >
      {/* Keyed by url so its delayed fade-in restarts for each new image */}
      <img key={image?.url} src={cardBack} alt="Card back" className="card-back" />
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
          onClick={() => onSelect(image)}
        />
      )}
      {loaded && image.finish !== "nonfoil" && (
        <span className={`finish ${image.finish}`} aria-hidden="true">
          <span className="finish-shine" />
          <span className="finish-glare" />
        </span>
      )}
      {/* In edit mode, mark cards whose owned printing is already recorded */}
      {editMode && image?.isSpecific && (
        <span className="specific-check" title="Printing recorded">
          &#10003;
        </span>
      )}
    </div>
  );
}
