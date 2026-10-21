// One-off: pull Care360 branches + dropdowns into the local cache.
//   npx tsx scripts/sync-care360.ts
// Also exposed in the app as POST /api/admin/care360/sync (admin → Bot Config).
import { syncCare360Reference } from "../src/lib/care360";

syncCare360Reference()
  .then((counts) => {
    console.log("✅ Care360 reference data synced:", counts);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Care360 sync failed:", err);
    process.exit(1);
  });
