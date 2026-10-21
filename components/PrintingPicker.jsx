import { useEffect, useState } from "react";
import { fetchPrintings } from "../lib/cards.js";

export default function PrintingPicker({ card, selectedId, onPick, onClose }) {
  const [printings, setPrintings] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchPrintings(card.name)
      .then((data) => !cancelled && setPrintings(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [card.name]);

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker" onClick={(e) => e.stopPropagation()}>
        <div className="picker-header">
          <h2>{card.name}</h2>
          <button onClick={onClose}>Close</button>
        </div>
        {error && <p>{error}</p>}
        {!printings && !error && <p>Loading printings&hellip;</p>}
        <div className="picker-grid">
          {printings?.map((printing) => (
            <button
              key={printing.id}
              className={`printing${printing.id === selectedId ? " selected" : ""}`}
              onClick={() => onPick(printing)}
            >
              {printing.image && (
                <img
                  src={printing.image.url}
                  alt={printing.set_name}
                  loading="lazy"
                  style={{
                    filter:
                      printing.image.owned === 0 ? "grayscale(100%) brightness(0.6)" : undefined,
                  }}
                />
              )}
              <span>
                {printing.set_name} #{printing.collector_number}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
