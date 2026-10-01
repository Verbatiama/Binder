import { useEffect, useState } from "react";
import Page, { SLOTS_PER_PAGE } from "./components/Page.jsx";
import CardOverlay from "./components/CardOverlay.jsx";
import { fetchAndMergeCollections, prefetchPageImages } from "./lib/cards.js";

const PORTRAIT_QUERY = "(orientation: portrait)";

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
  const isPortrait = usePortrait();
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
      <div className="binder-container">
        <div className="binder">
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
              onSelect={setOverlayUrl}
            />
          ) : (
            <>
              <Page
                id="left-page"
                pageNumber={leftPage}
                cards={cards}
                onSelect={setOverlayUrl}
              />
              <Page
                id="right-page"
                pageNumber={rightPage}
                cards={cards}
                onSelect={setOverlayUrl}
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
    </>
  );
}
