export default function CardSlot({ image, placeholder, onSelect }) {
  if (!image) {
    return (
      <div className="card-slot">
        <div className="card-placeholder">{placeholder}</div>
      </div>
    );
  }

  return (
    <div className="card-slot">
      <img
        src={image.url}
        alt="Card"
        style={{
          width: "100%",
          height: "100%",
          cursor: "pointer",
          filter: image.owned === 0 ? "grayscale(100%) brightness(0.6)" : undefined,
        }}
        onClick={() => onSelect(image.url)}
      />
    </div>
  );
}
