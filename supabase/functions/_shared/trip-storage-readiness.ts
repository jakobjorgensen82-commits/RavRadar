import { corsHeaders } from "./public-gateway.ts";
import { tripStorageMode } from "./trip-store.ts";

export const TRIP_STORAGE_CONTRACT_VERSION = "4.0.311";

export function tripStorageReadinessHeaders(request: Request) {
  return {
    ...corsHeaders(request),
    "Access-Control-Expose-Headers": "x-ravradar-trip-contract-version, x-ravradar-trip-storage-mode",
    "X-RavRadar-Trip-Contract-Version": TRIP_STORAGE_CONTRACT_VERSION,
    "X-RavRadar-Trip-Storage-Mode": tripStorageMode(),
  };
}
