import { useEffect, useState } from "react";
import { fetchPrintings } from "../lib/cards.js";

const FINISHES = [
  { value: "nonfoil", label: "Nonfoil" },
  { value: "foil", label: "Foil" },
  { value: "etched", label: "Etched" },
];

export default function PrintingPicker({ card, selection, onPick, onClose }) {
  const [printings, setPrintings] = useState(null);
  const [error, setError] = useState(null);
  const [finish, setFinish] = useState(selection?.foiling ?? "nonfoil");

  useEffect(() => {
    let cancelled = false;
    fetchPrintings(card.name)
      .then((data) => !cancelled && setPrintings(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [card.name]);

  // Finishes at least one printing comes in; fall back to the first of those if the chosen one isn't
  const available = new Set(printings?.flatMap((printing) => printing.finishes));
  const activeFinish =
    !printings || available.has(finish)
      ? finish
      : FINISHES.find(({ value }) => available.has(value))?.value;

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker" onClick={(e) => e.stopPropagation()}>
        <div className="picker-header">
          <h2>{card.name}</h2>
          <div className="finish-selector">
            {FINISHES.map(({ value, label }) => (
              <button
                key={value}
                className={value === activeFinish ? "active" : undefined}
                disabled={!printings || !available.has(value)}
                onClick={() => setFinish(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={onClose}>Close</button>
        </div>
        {error && <p>{error}</p>}
        {!printings && !error && <p>Loading printings&hellip;</p>}
        <div className="picker-grid">
          {printings?.map((printing) => (
            <button
              key={printing.id}
              className={`printing${
                printing.id === selection?.printing.id && activeFinish === selection.foiling
                  ? " selected"
                  : ""
              }`}
              disabled={!printing.finishes.includes(activeFinish)}
              onClick={() => onPick(printing, activeFinish)}
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
