import { initializeUserDataSafety } from "./js/services/storage-safety.js";

await initializeUserDataSafety();
await import("./app.js");
