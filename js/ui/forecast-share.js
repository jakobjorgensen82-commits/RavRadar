import { exactForecastShareSelection, forecastShareCopy, forecastShareDate,
  forecastShareScoreText, forecastShareUrl, FORECAST_SHARE_BASE_URL } from '../services/forecast-share-contract.js?v=4.0.586&ui=forecast-share-20261024';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

// The caller supplies the committed normal map frame, never the pending slider
// request or an independently selected "best time".
export function mountForecastShareControl(panel, {
  selection: input, zoneName, result, isSelectionCurrent = () => false,
}) {
  const selection = exactForecastShareSelection(input);
  if (!selection || result?.time !== selection.time) return () => {};
  const copy = forecastShareCopy(selection.language);
  const button = element('button', copy.title, 'primary-button forecast-share-button');
  button.type = 'button';
  let dialog = null, disposed = false;
  const dispose = () => {
    disposed = true; button.disabled = true;
    if (dialog) { const opened = dialog; dialog = null; opened.close(); opened.remove(); }
  };
  const current = () => {
    try { if (!disposed && isSelectionCurrent(selection)) return true; } catch { /* fail closed */ }
    dispose(); return false;
  };
  panel.querySelector('.zone-header')?.insertAdjacentElement('afterend', button);
  button.addEventListener('click', () => {
    if (!current() || dialog) return;
    const url = forecastShareUrl(FORECAST_SHARE_BASE_URL, selection);
    const opened = element('dialog', undefined, 'app-dialog forecast-share-dialog'); dialog = opened;
    const content = element('div', undefined, 'dialog-content');
    const close = element('button', '×', 'dialog-close');
    close.type = 'button'; close.setAttribute('aria-label', copy.close);
    const title = element('h2', copy.title); title.id = 'forecastShareTitle';
    opened.setAttribute('aria-labelledby', title.id);
    const context = element('p', zoneName + ' · ' + copy[selection.mode]);
    const time = element('p', forecastShareDate(selection.time, selection.language), 'forecast-share-time');
    const score = element('p', forecastShareScoreText(result, selection.language), 'forecast-share-score');
    const note = element('p', copy.note, 'muted');
    const actions = element('div', undefined, 'button-row');
    const share = element('button', copy.share, 'primary-button'); share.type = 'button';
    const copyButton = element('button', copy.copy); copyButton.type = 'button';
    const status = element('p'); status.setAttribute('role', 'status');
    const field = element('input'); field.type = 'text'; field.readOnly = true; field.value = url;
    field.setAttribute('aria-label', copy.copy); field.hidden = true;
    async function copyLink() {
      if (!current()) return;
      try {
        if (!globalThis.navigator?.clipboard?.writeText) throw new Error('NO_CLIPBOARD');
        await navigator.clipboard.writeText(url);
        if (current()) status.textContent = copy.copied;
      } catch {
        if (current()) { status.textContent = copy.manual; field.hidden = false; field.focus(); field.select(); }
      }
    }
    share.addEventListener('click', async () => {
      if (!current()) return;
      share.disabled = true;
      try {
        const payload = { url }; // No prewritten Facebook post or score supplied by the URL.
        if (!navigator.share || (navigator.canShare && !navigator.canShare(payload))) {
          await copyLink(); return;
        }
        await navigator.share(payload); current();
      } catch (error) {
        if (current() && error?.name !== 'AbortError') {
          status.textContent = copy.manual; field.hidden = false; field.focus(); field.select();
        }
      } finally { share.disabled = disposed; }
    });
    copyButton.addEventListener('click', copyLink);
    close.addEventListener('click', () => opened.close());
    opened.addEventListener('close', () => {
      opened.remove(); if (dialog === opened) dialog = null;
      if (!disposed && button.isConnected) button.focus();
    }, { once: true });
    actions.append(share, copyButton);
    content.append(title, context, time, score, note, actions, status, field);
    opened.append(close, content); document.body.append(opened); opened.showModal();
  });
  return dispose;
}

// One startup selection through the existing timeline controller. A later user
// request/generation wins; there is no retry or fallback to a nearby hour.
export function openForecastShareSelection({ incoming, controller, zones, setMode, openZone, notice, isStillRequested = () => true, language = 'da' }) {
  if (incoming.status === 'absent') return;
  const selection = incoming.selection;
  const copy = forecastShareCopy(selection?.language || language);
  if (incoming.status !== 'valid') { notice(copy.invalid); return; }
  const zone = zones?.features?.find(feature => feature.properties?.id === selection.zoneId)?.properties;
  const initial = controller.snapshot();
  if (!zone || !initial.times.includes(selection.time)) { notice(copy.unavailable); return; }
  if (!isStillRequested(selection)) { notice(copy.cancelled); return; }
  setMode(selection.mode);
  notice(copy.loading);
  const generation = initial.generation;
  let active = false, done = false, unsubscribe = () => {};
  const finish = () => { done = true; unsubscribe(); };
  const observe = frame => {
    if (!active || done) return;
    if (frame.generation !== generation) { finish(); notice(copy.unavailable); return; }
    if (frame.requestedTime !== selection.time) { finish(); notice(copy.cancelled); return; }
    if (frame.status === 'error' || frame.status === 'unavailable') { finish(); notice(copy.unavailable); return; }
    if (frame.status === 'ready' && frame.committedTime === selection.time) {
      finish();
      if (!isStillRequested(selection)) { notice(copy.cancelled); return; }
      notice(''); openZone(zone);
    }
  };
  unsubscribe = controller.subscribe(observe);
  active = true;
  if (!controller.select(selection.time, { immediate: true })) { finish(); notice(copy.unavailable); }
}
