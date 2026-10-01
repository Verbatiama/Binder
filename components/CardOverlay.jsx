export default function CardOverlay({ imageUrl, onClose }) {
  if (!imageUrl) return null;

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
      <img
        id="card-overlay-img"
        src={imageUrl}
        alt="Card Preview"
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          borderRadius: "16px",
          boxShadow: "0 0 32px #000",
        }}
      />
    </div>
  );
}
