// Shared by the private SOURCE codec and the recordwise forecast-file reader.
// The owner approved 256 -> 512 sources after national acquisition reported
// 373 targets on 6 October 2026. No byte, time, proof or source-policy budget
// changes with this cardinality correction; overflow remains all-or-nothing.
export const WATER_SOURCE_CONTINUITY_MAX_SOURCES = 512;
