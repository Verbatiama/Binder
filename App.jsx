import { useEffect, useMemo, useRef, useState } from "react";
import Page, { SLOTS_PER_PAGE } from "./components/Page.jsx";
import CardOverlay from "./components/CardOverlay.jsx";
import Menu from "./components/Menu.jsx";
import PrintingPicker from "./components/PrintingPicker.jsx";
import SignIn from "./components/SignIn.jsx";
import { fetchAndMergeCollections, prefetchPageImages } from "./lib/cards.js";
import { saveOwnership } from "./lib/ownership.js";
import { supabase } from "./lib/supabase.js";

// Minimum horizontal distance (px) for a touch to count as a page-turn swipe
const SWIPE_THRESHOLD = 50;
// How long cards found by name stay highlighted
const HIGHLIGHT_DURATION = 3000;
// Card proportions (width / height) of the card images
const CARD_ASPECT = 488 / 680;
// Page gap and padding as fractions of the card width
const PAGE_GAP = 0.05;
const PAGE_PAD = 0.1;
// Page size in card widths: 3 cards, 2 gaps and padding on both sides
const PAGE_WIDTH = 3 + 2 * PAGE_GAP + 2 * PAGE_PAD;
const PAGE_HEIGHT = 3 / CARD_ASPECT + 2 * PAGE_GAP + 2 * PAGE_PAD;
// Show a two-page spread unless its cards would be smaller than this fraction of a single page's
const SPREAD_MIN_SCALE = 0.75;

function cssPx(styles, name) {
  return parseFloat(styles.getPropertyValue(name)) || 0;
}

// Picks one page or a spread and the card width (px) that fits the viewport without distorting cards
function computeLayout() {
  const styles = getComputedStyle(document.documentElement);
  const availWidth =
    window.innerWidth -
    2 * cssPx(styles, "--side-gutter") -
    2 * cssPx(styles, "--binder-pad-x");
  const availHeight =
    window.innerHeight -
    cssPx(styles, "--top-gutter") -
    cssPx(styles, "--side-gutter") -
    2 * cssPx(styles, "--binder-pad-y") -
    cssPx(styles, "--page-numbers-height");
  const byHeight = availHeight / PAGE_HEIGHT;
  const single = Math.min(byHeight, availWidth / PAGE_WIDTH);
  const spread = Math.min(
    byHeight,
    (availWidth - cssPx(styles, "--binder-gap")) / (2 * PAGE_WIDTH),
  );
  const singlePage = spread < single * SPREAD_MIN_SCALE;
  const cardWidth = Math.max(Math.floor(singlePage ? single : spread), 1);
  return { singlePage, cardWidth };
}

function useBinderLayout() {
  const [layout, setLayout] = useState(computeLayout);

  useEffect(() => {
    const onResize = () =>
      setLayout((prev) => {
        const next = computeLayout();
        return next.singlePage === prev.singlePage && next.cardWidth === prev.cardWidth
          ? prev
          : next;
      });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return layout;
}

export default function App() {
  const [cards, setCards] = useState(null);
  const [page, setPage] = useState(0);
  const [overlayImage, setOverlayImage] = useState(null);
  // Ids of the cards found by name, or null when nothing is highlighted
  const [highlightedIds, setHighlightedIds] = useState(null);
  // Cards found by a search for several names, in the order searched; page turns step through
  // them while it's set
  const [searchResults, setSearchResults] = useState(null);
  const [searchIndex, setSearchIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  // Slot card id -> { name, printing, foiling } for each printing chosen in edit mode,
  // or { name, remove: true } for each card removed from the collection
  const [selections, setSelections] = useState(new Map());
  const [editingCard, setEditingCard] = useState(null);
  const [session, setSession] = useState(null);
  const [signingIn, setSigningIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const { singlePage: showSinglePage, cardWidth } = useBinderLayout();
  const touchStart = useRef(null);
  // A spread starts on an even page; a single page view skips the blank inside cover
  const leftPage = page - (page % 2);
  const rightPage = leftPage + 1;
  const singlePage = Math.max(page, 1);
  const displayedPage = showSinglePage ? singlePage : Math.max(leftPage, 1);

  useEffect(() => {
    fetchAndMergeCollections().then(setCards);
  }, []);

  const cardNames = useMemo(
    () => (cards ? [...new Set(cards.map((card) => card.name))].sort() : []),
    [cards],
  );

  useEffect(() => {
    if (!highlightedIds) return;
    const timeout = setTimeout(() => setHighlightedIds(null), HIGHLIGHT_DURATION);
    return () => clearTimeout(timeout);
  }, [highlightedIds]);

  // Fires with the stored session on load, after a magic link sign-in, and on sign-out
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setSigningIn(false);
      } else {
        setEditMode(false);
        setSelections(new Map());
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Prefetch the previous and next page or spread
  useEffect(() => {
    if (!cards) return;
    const pages = showSinglePage
      ? [singlePage - 1, singlePage + 1]
      : [leftPage - 2, leftPage - 1, leftPage + 2, leftPage + 3];
    pages.forEach((p) => prefetchPageImages(cards, p, SLOTS_PER_PAGE));
  }, [cards, showSinglePage, singlePage, leftPage]);

  function changePage(direction) {
    if (searchResults) {
      const next = searchIndex + direction;
      if (next < 0 || next >= searchResults.length) return;
      setSearchIndex(next);
      showCard(searchResults[next]);
      return;
    }
    if (showSinglePage) {
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

  function showCard(card) {
    setPage(card.Page);
    setHighlightedIds(new Set([card.id]));
  }

  // Index in cards of the card with this name: an exact match, else the first containing it, or -1
  function matchCard(name) {
    const search = name.toLowerCase();
    const exact = cards.findIndex((c) => c.name.toLowerCase() === search);
    return exact !== -1 ? exact : cards.findIndex((c) => c.name.toLowerCase().includes(search));
  }

  // Turns to the first card found. Finding several starts stepping through them.
  // Returns the names that matched no card.
  function findCards(names) {
    if (!cards) return names;
    const found = [];
    const missing = [];
    for (const name of names) {
      const card = cards[matchCard(name)];
      if (card) found.push(card);
      else missing.push(name);
    }
    setSearchResults(found.length > 1 ? found : null);
    setSearchIndex(0);
    if (found.length > 0) showCard(found[0]);
    return missing;
  }

  // Cards are loaded in binder order, so sorting by their index puts the names in that order.
  // Names that match no card go last.
  function sortByBinderOrder(names) {
    if (!cards) return names;
    const position = (name) => {
      const index = matchCard(name);
      return index === -1 ? Infinity : index;
    };
    return names.toSorted((a, b) => position(a) - position(b));
  }

  function jumpToPage(target) {
    setSearchResults(null);
    setPage(target);
  }

  function selectCard(image) {
    if (editMode) setEditingCard(image);
    else setOverlayImage(image);
  }

  function pickPrinting(printing, foiling) {
    const card = editingCard;
    setSelections((prev) => new Map(prev).set(card.id, { name: card.name, printing, foiling }));
    setEditingCard(null);
  }

  function removeCard() {
    const card = editingCard;
    setSelections((prev) => new Map(prev).set(card.id, { name: card.name, remove: true }));
    setEditingCard(null);
  }

  // Leaving edit mode saves the chosen printings; on failure stay in edit mode so they can be retried.
  // Returns whether the mode changed.
  async function toggleEditMode() {
    if (editMode && selections.size > 0) {
      setSaving(true);
      setSaveError(null);
      try {
        await saveOwnership(selections);
      } catch (err) {
        setSaveError(err.message);
        return false;
      } finally {
        setSaving(false);
      }
      setSelections(new Map());
      fetchAndMergeCollections().then(setCards);
    }
    setEditMode(!editMode);
    return true;
  }

  return (
    <>
      <a
        href="/"
        style={{
          position: "fixed",
          top: "8px",
          left: "12px",
          zIndex: 30,
          font: "14px system-ui,sans-serif",
          color: "#c2410c",
          textDecoration: "none",
        }}
      >
        &larr; Adam Henderson
      </a>
      <Menu
        currentPage={displayedPage}
        onJump={jumpToPage}
        cardNames={cardNames}
        onFindCards={findCards}
        onSortNames={sortByBinderOrder}
        session={session}
        editMode={editMode}
        editCount={selections.size}
        saving={saving}
        saveError={saveError}
        onToggleEdit={toggleEditMode}
        onSignIn={() => setSigningIn(true)}
        onSignOut={() => supabase.auth.signOut()}
      />
      <div
        className={`binder-container${editMode ? " editing" : ""}`}
        style={{
          "--card-w": `${cardWidth}px`,
          "--card-h": `${cardWidth / CARD_ASPECT}px`,
          "--page-gap": `${cardWidth * PAGE_GAP}px`,
          "--page-pad": `${cardWidth * PAGE_PAD}px`,
        }}
      >
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
          {showSinglePage ? (
            <Page
              id="single-page"
              pageNumber={singlePage}
              cards={cards}
              selections={selections}
              highlightedIds={highlightedIds}
              editMode={editMode}
              onSelect={selectCard}
            />
          ) : (
            <>
              <Page
                id="left-page"
                pageNumber={leftPage}
                cards={cards}
                selections={selections}
                highlightedIds={highlightedIds}
              editMode={editMode}
              onSelect={selectCard}
              />
              <Page
                id="right-page"
                pageNumber={rightPage}
                cards={cards}
                selections={selections}
                highlightedIds={highlightedIds}
              editMode={editMode}
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
            {showSinglePage ? singlePage : leftPage}
          </span>
          {searchResults && (
            <span className="search-status">
              <span className="search-status-name">
                {searchIndex + 1} / {searchResults.length}: {searchResults[searchIndex].name}
              </span>
              <button onClick={() => setSearchResults(null)} aria-label="End search">
                &times;
              </button>
            </span>
          )}
          {!showSinglePage && <span id="right-page-number">{rightPage}</span>}
        </div>
      </div>
      <CardOverlay image={overlayImage} onClose={() => setOverlayImage(null)} />
      {editingCard && (
        <PrintingPicker
          card={editingCard}
          selection={selections.get(editingCard.id)}
          onPick={pickPrinting}
          onRemove={removeCard}
          onClose={() => setEditingCard(null)}
        />
      )}
      {signingIn && <SignIn onClose={() => setSigningIn(false)} />}
    </>
  );
}
