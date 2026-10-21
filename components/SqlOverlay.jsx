import { useState } from "react";

export default function SqlOverlay({ sql, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!sql) return null;

  function copy() {
    navigator.clipboard.writeText(sql).then(() => setCopied(true));
  }

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker" onClick={(e) => e.stopPropagation()}>
        <div className="picker-header">
          <h2>Ownership SQL</h2>
          <div>
            <button onClick={copy}>{copied ? "Copied" : "Copy"}</button>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
        <textarea className="sql-output" readOnly value={sql} />
      </div>
    </div>
  );
}
