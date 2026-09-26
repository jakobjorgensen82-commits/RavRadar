// Operational acquisition checkpoints only. Keep these out of the shared
// production inventory: its contents are part of the score/public contract.
export const PRIVATE_WEATHER_PROGRESS_ONLY_FILES = Object.freeze({
  dmiForecastStore: 'data/live/dmi-forecast-cache.json',
  dmiWaterStations: 'data/live/dmi-water-stations.json',
});
