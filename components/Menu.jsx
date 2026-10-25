import { useEffect, useRef, useState } from "react";

// Clicks on the menu toggle within this many ms of the last one are ignored
const TOGGLE_DEBOUNCE = 300;

export default function Menu({
  currentPage,
  onJump,
  cardNames,
  onFindCards,
  session,
  editMode,
  editCount,
  saving,
  saveError,
  onToggleEdit,
  onSignIn,
  onSignOut,
}) {
  const [open, setOpen] = useState(false);
  const [jumpValue, setJumpValue] = useState("");
  const [cardQuery, setCardQuery] = useState("");
  const [multiline, setMultiline] = useState(false);
  // Names from the last search that matched no card
  const [notFound, setNotFound] = useState([]);
  const toggleRef = useRef(null);
  const menuRef = useRef(null);
  const lastToggle = useRef(0);

  // Start the jump input on the page being shown each time the menu opens
  useEffect(() => {
    if (open) setJumpValue(String(currentPage));
  }, [open, currentPage]);

  // Close on Escape or a click anywhere outside the menu
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onClick = (event) => {
      if (!menuRef.current.contains(event.target) && !toggleRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  function toggleMenu() {
    const now = Date.now();
    if (now - lastToggle.current < TOGGLE_DEBOUNCE) return;
    lastToggle.current = now;
    setOpen(!open);
  }

  function jumpToPage(event) {
    event.preventDefault();
    const target = parseInt(jumpValue, 10);
    if (isNaN(target) || target < 1) return;
    onJump(target);
    setOpen(false);
  }

  // In multi-line mode each line is a card name.
  // Stay open when any name matches no card so the message is visible.
  function findCards(event) {
    event.preventDefault();
    const names = cardQuery
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    const missing = onFindCards(names);
    setNotFound(missing);
    if (missing.length === 0) setOpen(false);
  }

  function changeQuery(value) {
    setCardQuery(value);
    setNotFound([]);
  }

  // Stay open when saving fails so the error is visible
  async function toggleEdit() {
    if (await onToggleEdit()) setOpen(false);
  }

  function run(action) {
    action();
    setOpen(false);
  }

  return (
    <>
      <button
        ref={toggleRef}
        className="menu-toggle"
        onClick={toggleMenu}
        aria-label="Menu"
        aria-expanded={open}
        aria-controls="menu"
      >
        &#9776;
      </button>
      <nav id="menu" ref={menuRef} className={open ? "open" : ""} inert={!open}>
        <form onSubmit={jumpToPage}>
          <label htmlFor="jump-page-input">Jump to page</label>
          <div className="menu-jump">
            <input
              type="number"
              id="jump-page-input"
              min="1"
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
            />
            <button type="submit">Go</button>
          </div>
        </form>
        <form onSubmit={findCards}>
          <div className="menu-label-row">
            <label htmlFor="find-card-input">Find card</label>
            <button
              type="button"
              className="menu-multiline-toggle"
              onClick={() => setMultiline(!multiline)}
              aria-label={multiline ? "Search one card" : "Search several cards"}
              aria-pressed={multiline}
            >
              {multiline ? "−" : "+"}
            </button>
          </div>
          {multiline ? (
            <div className="menu-find-multiline">
              <textarea
                id="find-card-input"
                rows={6}
                placeholder="One card name per line"
                value={cardQuery}
                onChange={(e) => changeQuery(e.target.value)}
                // Enter adds a line; Ctrl+Enter searches
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) findCards(e);
                }}
              />
              <button type="submit">Go</button>
            </div>
          ) : (
            <div className="menu-jump">
              <input
                type="search"
                id="find-card-input"
                list="card-names"
                placeholder="Card name"
                autoComplete="off"
                value={cardQuery}
                onChange={(e) => changeQuery(e.target.value)}
              />
              <button type="submit">Go</button>
            </div>
          )}
          <datalist id="card-names">
            {cardNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          {notFound.length > 0 && (
            <span className="menu-error">No card found: {notFound.join(", ")}</span>
          )}
        </form>
        <div className="menu-account">
          {session ? (
            <>
              <button onClick={toggleEdit} disabled={saving}>
                {saving ? "Saving…" : editMode ? `Done (${editCount})` : "Edit"}
              </button>
              {saveError && <span className="menu-error">{saveError}</span>}
              <button onClick={() => run(onSignOut)}>Sign out</button>
            </>
          ) : (
            <button onClick={() => run(onSignIn)}>Sign in</button>
          )}
        </div>
      </nav>
    </>
  );
}
