// Warm the image cache with the grid image of every card the binder can show.
// Run manually: npm run warm:images [-- --rate <requests per minute>]
import { fetchAndMergeCollections, retrieveCardImage } from "../lib/cards.js";

// Stay under the image cache's limit of 600 requests per minute
const rateIndex = process.argv.indexOf("--rate");
const requestsPerMinute = rateIndex > -1 ? Number(process.argv[rateIndex + 1]) : 500;
const concurrency = 8;
const maxAttempts = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function warm(url) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url);
    await res.arrayBuffer();
    if (res.ok) return;
    if (attempt >= maxAttempts) throw new Error(`HTTP ${res.status}`);
    // Rate limited: wait as long as the server asks, otherwise back off
    const retryAfter = Number(res.headers.get("retry-after"));
    await sleep(retryAfter > 0 ? retryAfter * 1000 : attempt * 5000);
  }
}

const cards = await fetchAndMergeCollections();
const urls = [
  ...new Set(cards.map((card) => retrieveCardImage(card)?.url).filter(Boolean)),
];
console.log(
  `Warming ${urls.length} grid images (${cards.length} cards) at ${requestsPerMinute}/min`,
);

const interval = 60000 / requestsPerMinute;
const failures = [];
let next = 0;
let done = 0;
let nextStart = Date.now();

async function worker() {
  while (next < urls.length) {
    const url = urls[next++];
    // Space request starts evenly across all workers
    const wait = nextStart - Date.now();
    nextStart = Math.max(nextStart, Date.now()) + interval;
    if (wait > 0) await sleep(wait);
    try {
      await warm(url);
    } catch (err) {
      failures.push({ url, error: err.message });
    }
    if (++done % 100 === 0 || done === urls.length) {
      console.log(`${done}/${urls.length} (${failures.length} failed)`);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));

if (failures.length) {
  console.error(`\n${failures.length} images failed:`);
  failures.forEach(({ url, error }) => console.error(`  ${error}  ${decodeURIComponent(url)}`));
  process.exitCode = 1;
} else {
  console.log("All images cached");
}
