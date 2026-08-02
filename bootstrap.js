performance.mark?.('ravradar:bootstrap-start');
import { initializeUserDataSafety } from "./js/services/storage-safety.js";

await initializeUserDataSafety();
performance.mark?.('ravradar:storage-ready');
await import("./app.js");
performance.mark?.('ravradar:app-imported');
