import { t } from "../i18n.js?v=4.0.317";

const STYLE_ID = 'ravradar-trip-evidence-dialog-style';

function createElement(tag, attributes = {}, text = '') {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className') element.className = value;
    else if (key === 'checked') element.checked = Boolean(value);
    else if (key === 'selected') element.selected = Boolean(value);
    else if (value != null) element.setAttribute(key, String(value));
  }
  if (text) element.textContent = text;
  return element;
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = createElement('style', { id: STYLE_ID });
  style.textContent = `
    .trip-evidence-dialog{width:min(92vw,34rem);max-height:min(88vh,48rem);padding:0;border:0;border-radius:1.25rem;color:var(--text,#17201b);background:var(--surface,#fffdf7);box-shadow:0 1.5rem 5rem #15201842}
    .trip-evidence-dialog::backdrop{background:#10251d9c;backdrop-filter:blur(3px)}
    .trip-evidence-form{display:grid;gap:1rem;padding:clamp(1.15rem,4vw,2rem);overflow:auto}
    .trip-evidence-form h2,.trip-evidence-form p{margin:0}
    .trip-evidence-intro{color:var(--text-muted,#536057);line-height:1.5}
    .trip-evidence-field{display:grid;gap:.45rem}
    .trip-evidence-field>span,.trip-evidence-field legend{font-weight:750}
    .trip-evidence-fieldset{margin:0;padding:0;border:0}
    .trip-evidence-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem}
    .trip-evidence-choices--three{grid-template-columns:repeat(3,minmax(0,1fr))}
    .trip-evidence-choice{display:grid;place-items:center;min-height:3rem;padding:.55rem;border:1px solid var(--border,#cad3ca);border-radius:.85rem;background:var(--surface-raised,#fff);font-weight:700;text-align:center;cursor:pointer}
    .trip-evidence-choice:has(input:checked){border-color:var(--accent,#b85f28);background:var(--accent-soft,#fff0df);box-shadow:0 0 0 2px #b85f2830}
    .trip-evidence-choice input{position:absolute;opacity:0;pointer-events:none}
    .trip-evidence-form select,.trip-evidence-form input[type=search],.trip-evidence-form input[type=number],.trip-evidence-form input[type=datetime-local]{width:100%;min-height:3rem;padding:.65rem .8rem;border:1px solid var(--border,#cad3ca);border-radius:.75rem;background:var(--surface-raised,#fff);color:inherit;font:inherit}
    .trip-zone-search-status{min-height:1.25rem;color:var(--text-muted,#536057)}
    .trip-evidence-note{padding:.75rem .85rem;border-radius:.75rem;background:var(--info-soft,#eaf4ef);font-size:.92rem;line-height:1.4}
    .trip-evidence-actions{display:flex;justify-content:flex-end;gap:.65rem;padding-top:.25rem}
    .trip-evidence-actions button{min-height:2.85rem;padding:.65rem 1rem;border:0;border-radius:999px;font:inherit;font-weight:800;cursor:pointer}
    .trip-evidence-later{background:var(--surface-muted,#e9ece7);color:inherit}
    .trip-evidence-discard{background:#f8e4df;color:#7b271c}
    .trip-evidence-save{background:var(--accent,#b85f28);color:#fff}
    @media(max-width:32rem){.trip-evidence-choices--three{grid-template-columns:1fr}.trip-evidence-actions{display:grid;grid-template-columns:1fr}.trip-evidence-actions button{width:100%}}
  `;
  document.head.append(style);
}

function appendRadio(container, { name, value, label, checked = false }) {
  const choice = createElement('label', { className: 'trip-evidence-choice' });
  choice.append(createElement('input', { type: 'radio', name, value, required: '', checked }), document.createTextNode(label));
  container.append(choice);
}

function appendOptions(select, options, selectedId) {
  select.replaceChildren();
  if (!options.length) {
    select.append(createElement('option', { value: '', selected: true, disabled: '' }, t('trip.form.noParts')));
    return;
  }
  for (const option of options) {
    select.append(createElement('option', { value: option.id, selected: option.id === selectedId }, option.name || option.id));
  }
}

export function normaliseSearch(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

export function findZoneMatch(zones, query) {
  return findZoneMatches(zones, query)[0] || null;
}

export function findZoneMatches(zones, query) {
  const needle = normaliseSearch(query);
  if (!needle) return [];
  return zones.filter(zone => normaliseSearch(zone.name || zone.id).includes(needle));
}

function appendSearchableZonePicker(label, zones, selectedId) {
  const search = createElement('input', {
    type: 'search',
    className: 'trip-zone-search',
    placeholder: t('trip.form.searchArea'),
    autocomplete: 'off',
    'aria-label': t('trip.form.searchArea')
  });
  const select = createElement('select', { name: 'zoneId', required: '' });
  appendOptions(select, zones, selectedId || zones[0]?.id);
  const status = createElement('small', { className: 'trip-zone-search-status', 'aria-live': 'polite' });
  const findMatch = () => {
    const query = normaliseSearch(search.value.trim());
    status.textContent = '';
    const previousId = select.value;
    if (!query) {
      appendOptions(select, zones, zones.some(zone => zone.id === previousId) ? previousId : selectedId || zones[0]?.id);
      select.dispatchEvent(new Event('change', { bubbles:true }));
      return;
    }
    const matches = findZoneMatches(zones, query);
    if (!matches.length) {
      appendOptions(select, zones, zones.some(zone => zone.id === previousId) ? previousId : selectedId || zones[0]?.id);
      status.textContent = t('trip.form.noAreaMatch');
      return;
    }
    appendOptions(select, matches, matches.some(zone => zone.id === previousId) ? previousId : matches[0].id);
    select.dispatchEvent(new Event('change', { bubbles:true }));
    status.textContent = matches.length === 1
      ? matches[0].name || matches[0].id
      : t('trip.form.areaMatches', { count:matches.length });
  };
  search.addEventListener('input', findMatch);
  select.addEventListener('change', () => {
    const selected = zones.find(zone => zone.id === select.value);
    status.textContent = selected?.name || selected?.id || '';
  });
  label.append(search, select, status);
  return select;
}

function appendModeField(form, { mode = 'waders', question = t('trip.form.howSearched') } = {}) {
  const modeField = createElement('fieldset', { className: 'trip-evidence-field trip-evidence-fieldset' });
  modeField.append(createElement('legend', {}, question));
  const modeChoices = createElement('div', { className: 'trip-evidence-choices' });
  appendRadio(modeChoices, { name: 'mode', value: 'waders', label: t('mode.waders'), checked: mode === 'waders' });
  appendRadio(modeChoices, { name: 'mode', value: 'beach', label: t('mode.beachShort'), checked: mode === 'beach' });
  modeField.append(modeChoices);
  form.append(modeField);
  return modeChoices;
}

function appendReportQuestions(form, {
  zones,
  coastalParts,
  selectedZoneId = null,
  selectedCoastalPartId = null,
  noteForSelection = null
}) {
  const foundField = createElement('fieldset', { className: 'trip-evidence-field trip-evidence-fieldset' });
  foundField.append(createElement('legend', {}, t('trip.form.found')));
  const foundChoices = createElement('div', { className: 'trip-evidence-choices' });
  appendRadio(foundChoices, { name: 'found', value: 'yes', label: t('common.yes') });
  appendRadio(foundChoices, { name: 'found', value: 'no', label: t('common.no') });
  foundField.append(foundChoices);
  form.append(foundField);

  const zoneLabel = createElement('label', { className: 'trip-evidence-field' });
  zoneLabel.append(createElement('span', {}, t('trip.form.actualArea')));
  const zoneSelect = appendSearchableZonePicker(zoneLabel, zones, selectedZoneId || zones[0]?.id);
  form.append(zoneLabel);

  const partLabel = createElement('label', { className: 'trip-evidence-field' });
  partLabel.append(createElement('span', {}, t('trip.form.actualCoast')));
  const partSelect = createElement('select', { name: 'coastalPartId', required: '' });
  partLabel.append(partSelect);
  form.append(partLabel);

  const coverageField = createElement('fieldset', { className: 'trip-evidence-field trip-evidence-fieldset' });
  coverageField.append(createElement('legend', {}, t('trip.form.coverage')));
  const coverageChoices = createElement('div', { className: 'trip-evidence-choices trip-evidence-choices--three' });
  appendRadio(coverageChoices, { name: 'searchCoverage', value: 'partial', label: t('trip.form.coveragePartial') });
  appendRadio(coverageChoices, { name: 'searchCoverage', value: 'normal', label: t('trip.form.coverageNormal'), checked: true });
  appendRadio(coverageChoices, { name: 'searchCoverage', value: 'thorough', label: t('trip.form.coverageThorough') });
  coverageField.append(coverageChoices);
  form.append(coverageField);

  const gramsLabel = createElement('label', { className: 'trip-evidence-field', hidden: '' });
  gramsLabel.append(createElement('span', {}, t('trip.form.grams')));
  const gramsInput = createElement('input', { name: 'grams', type: 'number', min: '0', max: '10000', step: '0.1', inputmode: 'decimal' });
  gramsLabel.append(gramsInput);
  form.append(gramsLabel);

  const note = createElement('p', { className: 'trip-evidence-note' });
  form.append(note);
  const updateNote = () => {
    note.textContent = typeof noteForSelection === 'function'
      ? noteForSelection({ zoneId: zoneSelect.value, coastalPartId: partSelect.value })
      : t('trip.form.privacy');
  };
  const updateParts = () => {
    const options = coastalParts.filter(part => part.zoneId === zoneSelect.value);
    appendOptions(partSelect, options, options.some(part => part.id === selectedCoastalPartId) ? selectedCoastalPartId : options[0]?.id);
    updateNote();
  };
  zoneSelect.addEventListener('change', updateParts);
  partSelect.addEventListener('change', updateNote);
  foundChoices.addEventListener('change', () => {
    const found = form.elements.found.value === 'yes';
    gramsLabel.hidden = !found;
    if (!found) gramsInput.value = '';
  });
  updateParts();

  return () => ({
    zoneId: zoneSelect.value,
    coastalPartId: partSelect.value,
    searchCoverage: form.elements.searchCoverage.value,
    found: form.elements.found.value === 'yes',
    grams: gramsInput.value === '' ? null : Number(gramsInput.value)
  });
}

function localDateTimeValue(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function openTripEvidenceDialog({
  searchMinutes,
  mode,
  forecastZoneId,
  forecastCoastalPartId,
  zones = [],
  coastalParts = []
} = {}) {
  if (typeof document === 'undefined') throw new Error(t('trip.form.browserRequired'));
  if (!Array.isArray(zones) || !zones.length) throw new Error(t('trip.form.zonesMissing'));
  if (!Array.isArray(coastalParts) || !coastalParts.length) throw new Error(t('trip.form.partsMissing'));
  ensureStyles();

  const dialog = createElement('dialog', { className: 'trip-evidence-dialog', 'aria-labelledby': 'tripEvidenceTitle' });
  const form = createElement('form', { className: 'trip-evidence-form', method: 'dialog' });
  form.append(createElement('h2', { id: 'tripEvidenceTitle' }, t('trip.form.resultTitle')));
  const modeLabel = t(mode === 'waders' ? 'trip.mode.waders' : 'trip.mode.beach');
  form.append(createElement('p', { className: 'trip-evidence-intro' }, t('trip.form.resultIntro', { minutes:Math.max(1, Math.round(Number(searchMinutes) || 0)), mode:modeLabel })));

  const readQuestions = appendReportQuestions(form, {
    zones,
    coastalParts,
    selectedZoneId: forecastZoneId,
    selectedCoastalPartId: forecastCoastalPartId,
    noteForSelection: selection => selection.zoneId === forecastZoneId && selection.coastalPartId === forecastCoastalPartId
      ? t('trip.form.privacy')
      : t('trip.form.changedPlace')
  });

  const actions = createElement('div', { className: 'trip-evidence-actions' });
  actions.append(
    createElement('button', { className: 'trip-evidence-later', type: 'button' }, t('trip.form.answerLater')),
    createElement('button', { className: 'trip-evidence-discard', type: 'button' }, t('trip.form.discard')),
    createElement('button', { className: 'trip-evidence-save', type: 'submit' }, t('trip.form.submit'))
  );
  form.append(actions);
  dialog.append(form);
  document.body.append(dialog);

  return new Promise(resolve => {
    let answer = null;
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      answer = readQuestions();
      dialog.close('save');
    });
    actions.querySelector('.trip-evidence-later').addEventListener('click', () => dialog.close('later'));
    actions.querySelector('.trip-evidence-discard').addEventListener('click', () => {
      if (globalThis.confirm(t('trip.form.discardConfirm'))) dialog.close('discard');
    });
    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(dialog.returnValue === 'save' ? answer : dialog.returnValue === 'discard' ? { action: 'discard' } : null);
    }, { once: true });
    dialog.showModal();
  });
}

export function openTripEvidenceStartDialog({
  mode = 'waders',
  zoneId = null,
  coastalPartId = null,
  zones = [],
  coastalParts = []
} = {}) {
  if (typeof document === 'undefined') throw new Error(t('trip.form.browserRequired'));
  if (!Array.isArray(zones) || !zones.length) throw new Error(t('trip.form.zonesMissing'));
  if (!Array.isArray(coastalParts) || !coastalParts.length) throw new Error(t('trip.form.partsMissing'));
  ensureStyles();

  const dialog = createElement('dialog', { className: 'trip-evidence-dialog', 'aria-labelledby': 'tripEvidenceStartTitle' });
  const form = createElement('form', { className: 'trip-evidence-form', method: 'dialog' });
  form.append(createElement('h2', { id: 'tripEvidenceStartTitle' }, t('trip.form.startTitle')));
  form.append(createElement('p', { className: 'trip-evidence-intro' }, t('trip.form.startIntro')));

  appendModeField(form, { mode, question: t('trip.form.howWillSearch') });

  const zoneLabel = createElement('label', { className: 'trip-evidence-field' });
  zoneLabel.append(createElement('span', {}, t('trip.form.startArea')));
  const zoneSelect = appendSearchableZonePicker(zoneLabel, zones, zoneId || zones[0]?.id);
  form.append(zoneLabel);

  const partLabel = createElement('label', { className: 'trip-evidence-field' });
  partLabel.append(createElement('span', {}, t('trip.form.startCoast')));
  const partSelect = createElement('select', { name: 'coastalPartId', required: '' });
  partLabel.append(partSelect);
  form.append(partLabel);
  form.append(createElement('p', { className: 'trip-evidence-note' }, t('trip.form.startPrivacy')));

  const actions = createElement('div', { className: 'trip-evidence-actions' });
  actions.append(
    createElement('button', { className: 'trip-evidence-later', type: 'button' }, t('common.cancel')),
    createElement('button', { className: 'trip-evidence-save', type: 'submit' }, t('trip.form.start'))
  );
  form.append(actions);
  dialog.append(form);
  document.body.append(dialog);

  const updateParts = () => {
    const options = coastalParts.filter(part => part.zoneId === zoneSelect.value);
    appendOptions(partSelect, options, options.some(part => part.id === coastalPartId) ? coastalPartId : options[0]?.id);
    partSelect.disabled = !options.length;
  };
  zoneSelect.addEventListener('change', updateParts);
  updateParts();

  return new Promise(resolve => {
    let answer = null;
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      answer = {
        mode: form.elements.mode.value,
        zoneId: zoneSelect.value,
        coastalPartId: partSelect.value
      };
      dialog.close('start');
    });
    actions.querySelector('.trip-evidence-later').addEventListener('click', () => dialog.close('cancel'));
    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(dialog.returnValue === 'start' ? answer : null);
    }, { once: true });
    dialog.showModal();
  });
}

export function openAccountTripReportDialog({
  mode = 'waders',
  zoneId = null,
  coastalPartId = null,
  zones = [],
  coastalParts = [],
  now = new Date()
} = {}) {
  if (typeof document === 'undefined') throw new Error(t('trip.form.browserRequired'));
  if (!Array.isArray(zones) || !zones.length) throw new Error(t('trip.form.zonesMissing'));
  if (!Array.isArray(coastalParts) || !coastalParts.length) throw new Error(t('trip.form.partsMissing'));
  ensureStyles();

  const current = now instanceof Date ? now : new Date(now);
  const dialog = createElement('dialog', { className: 'trip-evidence-dialog', 'aria-labelledby': 'accountTripReportTitle' });
  const form = createElement('form', { className: 'trip-evidence-form', method: 'dialog' });
  form.append(createElement('h2', { id: 'accountTripReportTitle' }, t('trip.form.reportTitle')));
  form.append(createElement('p', { className: 'trip-evidence-intro' }, t('trip.form.reportIntro')));

  const timeLabel = createElement('label', { className: 'trip-evidence-field' });
  timeLabel.append(createElement('span', {}, t('trip.form.startedAt')));
  const timeInput = createElement('input', { name: 'startedAt', type: 'datetime-local', required: '', max: localDateTimeValue(current) });
  timeLabel.append(timeInput);
  form.append(timeLabel);

  const durationLabel = createElement('label', { className: 'trip-evidence-field' });
  durationLabel.append(createElement('span', {}, t('trip.form.minutes')));
  const durationInput = createElement('input', { name: 'searchMinutes', type: 'number', min: '1', max: '1440', step: '1', required: '', value: '60', inputmode: 'numeric' });
  durationLabel.append(durationInput);
  form.append(durationLabel);

  appendModeField(form, { mode });
  const readQuestions = appendReportQuestions(form, {
    zones,
    coastalParts,
    selectedZoneId: zoneId,
    selectedCoastalPartId: coastalPartId,
    noteForSelection: () => t('trip.form.reportPrivacy')
  });

  const status = createElement('p', { className: 'form-status', role: 'status' });
  form.append(status);
  const actions = createElement('div', { className: 'trip-evidence-actions' });
  actions.append(
    createElement('button', { className: 'trip-evidence-later', type: 'button' }, t('common.cancel')),
    createElement('button', { className: 'trip-evidence-save', type: 'submit' }, t('trip.form.submit'))
  );
  form.append(actions);
  dialog.append(form);
  document.body.append(dialog);

  return new Promise(resolve => {
    let answer = null;
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const startedAt = new Date(timeInput.value);
      const searchMinutes = Number(durationInput.value);
      if (!Number.isFinite(startedAt.getTime())) {
        status.textContent = t('trip.form.invalidDate');
        return;
      }
      if (startedAt.getTime() + searchMinutes * 60000 > current.getTime() + 5 * 60000) {
        status.textContent = t('trip.form.future');
        return;
      }
      answer = { ...readQuestions(), mode: form.elements.mode.value, startedAt: startedAt.toISOString(), searchMinutes };
      dialog.close('save');
    });
    actions.querySelector('.trip-evidence-later').addEventListener('click', () => dialog.close('cancel'));
    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(dialog.returnValue === 'save' ? answer : null);
    }, { once: true });
    dialog.showModal();
  });
}
