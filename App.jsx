import { useEffect, useState } from "react";
import Page from "./components/Page.jsx";
import CardOverlay from "./components/CardOverlay.jsx";
import { fetchAndMergeCollections } from "./lib/cards.js";

export default function App() {
  const [cards, setCards] = useState(null);
  const [leftPage, setLeftPage] = useState(0);
  const [jumpValue, setJumpValue] = useState("");
  const [overlayUrl, setOverlayUrl] = useState(null);
  const rightPage = leftPage + 1;

  useEffect(() => {
    fetchAndMergeCollections().then(setCards);
  }, []);

  function changePage(delta) {
    if (leftPage + delta < 0) return;
    setLeftPage(leftPage + delta);
  }

  function jumpToPage(event) {
    event.preventDefault();
    const page = parseInt(jumpValue, 10);
    if (isNaN(page) || page < 1) return;
    setLeftPage(page % 2 == 0 ? page : page - 1);
  }

  return (
    <>
      <a
        href="/"
        style={{
          position: "fixed",
          top: "8px",
          left: "12px",
          zIndex: 10,
          font: "14px system-ui,sans-serif",
          color: "#c2410c",
          textDecoration: "none",
        }}
      >
        &larr; Adam Henderson
      </a>
      <div className="binder-container">
        <div className="binder">
          <div className="binder-edge left" onClick={() => changePage(-2)} title="Previous"></div>
          <Page id="left-page" pageNumber={leftPage} cards={cards} onSelect={setOverlayUrl} />
          <Page id="right-page" pageNumber={rightPage} cards={cards} onSelect={setOverlayUrl} />
          <div className="binder-edge right" onClick={() => changePage(2)} title="Next"></div>
        </div>
        <div className="page-numbers">
          <span id="left-page-number">{leftPage}</span>
          <form className="jump-to-page" onSubmit={jumpToPage}>
            <label htmlFor="jump-page-input">Jump to page:</label>
            <input
              type="number"
              id="jump-page-input"
              min="1"
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
            />
            <button type="submit">Go</button>
          </form>
          <span id="right-page-number">{rightPage}</span>
        </div>
      </div>
      <CardOverlay imageUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />
    </>
  );
}
