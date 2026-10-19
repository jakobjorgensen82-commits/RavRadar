// Display-only: no current-clock replacement, trip admission or score calculation.
import { buildLocalZoneScore } from '../core/local-zone-score.js?v=4.0.584';

export function mapCoastalPartsForDisplay(frame, liveParts) {
  return frame?.isNow === false ? frame.conditions?.coastalParts || null : liveParts;
}

export function exactMapZoneScore({ conditions, time, zoneId, mode }) {
  const rows = conditions?.coastalParts?.zones?.[zoneId]?.hourly;
  if (!['waders', 'beach'].includes(mode) || !Array.isArray(rows)
      || !rows.some(row => row.time === time) || conditions?.mapForecastTime !== time) return null;
  const score = buildLocalZoneScore({ coastalParts: conditions.coastalParts, zoneId, mode, time });
  return score?.time === time ? score : null;
}

// One physical load at a time, with at most one queued latest selection. No
// additional hour cache: the manifest-bound data service owns its bounded LRU.
export function createMapForecastController({ loadHour, onCommit = () => {}, debounceMs = 200,
  schedule = setTimeout, cancel = clearTimeout } = {}) {
  let generation = null, times = [], live = null, requestedTime = null, committed = null;
  let requestToken = 0, status = 'unavailable', timer = null, pending = null, ready = false, disposed = false;
  let initialized = false;
  const listeners = new Set();
  const snapshot = () => ({ generation, times: [...times], requestedTime, liveTime: live?.time ?? null,
    committedTime: committed?.time ?? null, committed, requestToken, status, initialized });
  const notify = () => { for (const listener of listeners) listener(snapshot()); };
  const commit = frame => { committed = frame; status = 'ready'; onCommit(frame); notify(); };
  const stopTimer = () => { if (timer !== null) cancel(timer); timer = null; };
  const pump = () => {
    if (disposed || pending || !ready || !generation || !requestedTime
        || requestedTime === committed?.time || requestedTime === live?.time) return;
    const task = { generation, time: requestedTime, token: requestToken };
    pending = task;
    Promise.resolve().then(() => loadHour(task.time, task.generation)).then(frame => {
      if (disposed || generation !== task.generation || requestedTime !== task.time) return;
      if (frame?.generation !== generation || frame.time !== requestedTime || !frame.conditions) {
        throw new Error('MAP_FORECAST_FRAME_MISMATCH');
      }
      commit({ ...frame, isNow: false, requestToken });
    }).catch(() => {
      if (!disposed && generation === task.generation && requestedTime === task.time) {
        status = 'error'; notify(); // Keep the last committed frame and label.
      }
    }).finally(() => {
      if (pending === task) pending = null;
      if (!disposed && (generation !== task.generation || requestedTime !== task.time)) pump();
    });
  };
  return {
    get committed() { return committed; },
    snapshot, subscribe(listener) { listeners.add(listener); listener(snapshot()); return () => listeners.delete(listener); },
    configure({ generation: nextGeneration = null, times: nextTimes = [], live: nextLive = null } = {}) {
      if (disposed) return;
      initialized = true;
      const changed = generation !== nextGeneration;
      generation = nextGeneration; times = [...nextTimes]; live = nextLive;
      if (changed || !committed || committed.isNow || !times.includes(committed.time) || !times.includes(requestedTime)) {
        stopTimer(); requestToken++; requestedTime = live?.time ?? null; ready = false;
        if (live && generation && times.includes(live.time)) commit({ ...live, generation, isNow: true, requestToken });
        else { committed = null; status = 'unavailable'; onCommit(null); notify(); }
      } else notify();
    },
    select(time, { immediate = false } = {}) {
      if (disposed || !times.includes(time)) return false;
      stopTimer(); requestedTime = time; requestToken++; ready = immediate;
      if (time === live?.time) { commit({ ...live, generation, isNow: true, requestToken }); return true; }
      if (time === committed?.time) { status = 'ready'; notify(); return true; }
      status = 'loading'; notify();
      if (immediate) pump();
      else timer = schedule(() => { timer = null; ready = true; pump(); }, debounceMs);
      return true;
    },
    now() { if (live?.time) this.select(live.time, { immediate: true }); },
    step(delta) {
      const i = times.indexOf(requestedTime ?? committed?.time);
      if (i >= 0) this.select(times[Math.max(0, Math.min(times.length - 1, i + delta))], { immediate: true });
    },
    destroy() { disposed = true; stopTimer(); listeners.clear(); requestToken++; },
  };
}
