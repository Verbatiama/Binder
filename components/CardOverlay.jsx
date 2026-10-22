import { useState } from "react";

export default function CardOverlay({ image, onClose }) {
  // Tracks which url has finished loading, so the finish only appears over the loaded art
  const [loadedUrl, setLoadedUrl] = useState(null);
  if (!image) return null;

  return (
    <div
      id="card-overlay"
      onClick={onClose}
      style={{
        display: "flex",
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.85)",
        zIndex: 9999,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          isolation: "isolate",
          overflow: "hidden",
          borderRadius: "16px",
          boxShadow: "0 0 32px #000",
        }}
      >
        <img
          id="card-overlay-img"
          src={image.displayUrl}
          alt="Card Preview"
          onLoad={() => setLoadedUrl(image.displayUrl)}
          style={{
            display: "block",
            maxWidth: "90vw",
            maxHeight: "90vh",
          }}
        />
        {loadedUrl === image.displayUrl && image.finish !== "nonfoil" && (
          <span className={`finish ${image.finish}`} aria-hidden="true">
            <span className="finish-shine" />
            <span className="finish-glare" />
          </span>
        )}
      </div>
    </div>
  );
}
