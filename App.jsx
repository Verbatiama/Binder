import { useEffect, useRef, useState } from "react";
import Page, { SLOTS_PER_PAGE } from "./components/Page.jsx";
import CardOverlay from "./components/CardOverlay.jsx";
import PrintingPicker from "./components/PrintingPicker.jsx";
import SqlOverlay from "./components/SqlOverlay.jsx";
import { fetchAndMergeCollections, prefetchPageImages } from "./lib/cards.js";
import { buildOwnershipSql } from "./lib/ownership.js";

const PORTRAIT_QUERY = "(orientation: portrait)";
// Minimum horizontal distance (px) for a touch to count as a page-turn swipe
const SWIPE_THRESHOLD = 50;

function usePortrait() {
  const [isPortrait, setIsPortrait] = useState(
    () => window.matchMedia(PORTRAIT_QUERY).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(PORTRAIT_QUERY);
    const onChange = (event) => setIsPortrait(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return isPortrait;
}

export default function App() {
  const [cards, setCards] = useState(null);
  const [page, setPage] = useState(0);
  const [jumpValue, setJumpValue] = useState("");
  const [overlayUrl, setOverlayUrl] = useState(null);
  const [editMode, setEditMode] = useState(false);
  // Slot card id -> { name, printing } for each printing chosen in edit mode
  const [selections, setSelections] = useState(new Map());
  const [editingCard, setEditingCard] = useState(null);
  const [sql, setSql] = useState(null);
  const isPortrait = usePortrait();
  const touchStart = useRef(null);
  // Landscape shows a spread starting on an even page; portrait shows one page, skipping the blank inside cover
  const leftPage = page - (page % 2);
  const rightPage = leftPage + 1;
  const singlePage = Math.max(page, 1);
  const displayedPage = isPortrait ? singlePage : Math.max(leftPage, 1);

  useEffect(() => {
    fetchAndMergeCollections().then(setCards);
  }, []);

  useEffect(() => {
    setJumpValue(String(displayedPage));
  }, [displayedPage]);

  // Prefetch the previous and next page (portrait) or spread (landscape)
  useEffect(() => {
    if (!cards) return;
    const pages = isPortrait
      ? [singlePage - 1, singlePage + 1]
      : [leftPage - 2, leftPage - 1, leftPage + 2, leftPage + 3];
    pages.forEach((p) => prefetchPageImages(cards, p, SLOTS_PER_PAGE));
  }, [cards, isPortrait, singlePage, leftPage]);

  function changePage(direction) {
    if (isPortrait) {
      if (singlePage + direction < 1) return;
      setPage(singlePage + direction);
    } else {
      if (leftPage + 2 * direction < 0) return;
      setPage(leftPage + 2 * direction);
    }
  }

  function onTouchStart(event) {
    if (event.touches.length !== 1) {
      touchStart.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    // Ignore short or mostly vertical gestures so scrolling still works
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    // Swiping left reveals the next page, like turning a real page
    changePage(dx < 0 ? 1 : -1);
  }

  function selectCard(image) {
    if (editMode) setEditingCard(image);
    else setOverlayUrl(image.displayUrl);
  }

  function pickPrinting(printing) {
    const card = editingCard;
    setSelections((prev) => new Map(prev).set(card.id, { name: card.name, printing }));
    setEditingCard(null);
  }

  // Leaving edit mode turns the chosen printings into SQL
  function toggleEditMode() {
    if (editMode && selections.size > 0) {
      setSql(buildOwnershipSql(selections));
      setSelections(new Map());
    }
    setEditMode(!editMode);
  }

  function jumpToPage(event) {
    event.preventDefault();
    const target = parseInt(jumpValue, 10);
    if (isNaN(target) || target < 1) return;
    setPage(target);
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
      <button
        className={`edit-button${editMode ? " active" : ""}`}
        onClick={toggleEditMode}
      >
        {editMode ? `Done (${selections.size})` : "Edit"}
      </button>
      <div className={`binder-container${editMode ? " editing" : ""}`}>
        <div
          className="binder"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchCancel={() => (touchStart.current = null)}
        >
          <div
            className="binder-edge left"
            onClick={() => changePage(-1)}
            title="Previous"
          ></div>
          {isPortrait ? (
            <Page
              id="single-page"
              pageNumber={singlePage}
              cards={cards}
              selections={selections}
              onSelect={selectCard}
            />
          ) : (
            <>
              <Page
                id="left-page"
                pageNumber={leftPage}
                cards={cards}
                selections={selections}
              onSelect={selectCard}
              />
              <Page
                id="right-page"
                pageNumber={rightPage}
                cards={cards}
                selections={selections}
              onSelect={selectCard}
              />
            </>
          )}
          <div
            className="binder-edge right"
            onClick={() => changePage(1)}
            title="Next"
          ></div>
        </div>
        <div className="page-numbers">
          <span id="left-page-number">
            {isPortrait ? singlePage : leftPage}
          </span>
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
          {!isPortrait && <span id="right-page-number">{rightPage}</span>}
        </div>
      </div>
      <CardOverlay imageUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />
      {editingCard && (
        <PrintingPicker
          card={editingCard}
          selectedId={selections.get(editingCard.id)?.printing.id}
          onPick={pickPrinting}
          onClose={() => setEditingCard(null)}
        />
      )}
      <SqlOverlay sql={sql} onClose={() => setSql(null)} />
    </>
  );
}
