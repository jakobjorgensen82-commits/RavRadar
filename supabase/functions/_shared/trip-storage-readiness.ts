import { corsHeaders } from "./public-gateway.ts";
import { tripStorageMode } from "./trip-store.ts";

export const TRIP_STORAGE_CONTRACT_VERSION = "4.0.311";

export function tripStorageReadinessHeaders(request: Request, ownTripExport = false) {
  return {
    ...corsHeaders(request),
    "Access-Control-Expose-Headers": "x-ravradar-trip-contract-version, x-ravradar-trip-storage-mode, x-ravradar-trip-export-version",
    "X-RavRadar-Trip-Contract-Version": TRIP_STORAGE_CONTRACT_VERSION,
    "X-RavRadar-Trip-Storage-Mode": tripStorageMode(),
    // Installed route capability only, not an authenticated export/read proof.
    ...(ownTripExport ? { "X-RavRadar-Trip-Export-Version": "1" } : {}),
  };
}
