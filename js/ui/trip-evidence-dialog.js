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
    .trip-evidence-form select,.trip-evidence-form input[type=number],.trip-evidence-form input[type=datetime-local]{width:100%;min-height:3rem;padding:.65rem .8rem;border:1px solid var(--border,#cad3ca);border-radius:.75rem;background:var(--surface-raised,#fff);color:inherit;font:inherit}
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
    select.append(createElement('option', { value: '', selected: true, disabled: '' }, 'Ingen kyststrækninger fundet'));
    return;
  }
  for (const option of options) {
    select.append(createElement('option', { value: option.id, selected: option.id === selectedId }, option.name || option.id));
  }
}

function appendModeField(form, { mode = 'waders', question = 'Hvordan søgte du?' } = {}) {
  const modeField = createElement('fieldset', { className: 'trip-evidence-field trip-evidence-fieldset' });
  modeField.append(createElement('legend', {}, question));
  const modeChoices = createElement('div', { className: 'trip-evidence-choices' });
  appendRadio(modeChoices, { name: 'mode', value: 'waders', label: 'I vandet (waders)', checked: mode === 'waders' });
  appendRadio(modeChoices, { name: 'mode', value: 'beach', label: 'På stranden', checked: mode === 'beach' });
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
  foundField.append(createElement('legend', {}, 'Fandt du rav?'));
  const foundChoices = createElement('div', { className: 'trip-evidence-choices' });
  appendRadio(foundChoices, { name: 'found', value: 'yes', label: 'Ja' });
  appendRadio(foundChoices, { name: 'found', value: 'no', label: 'Nej' });
  foundField.append(foundChoices);
  form.append(foundField);

  const zoneLabel = createElement('label', { className: 'trip-evidence-field' });
  zoneLabel.append(createElement('span', {}, 'Hvilket område søgte du faktisk i?'));
  const zoneSelect = createElement('select', { name: 'zoneId', required: '' });
  appendOptions(zoneSelect, zones, selectedZoneId || zones[0]?.id);
  zoneLabel.append(zoneSelect);
  form.append(zoneLabel);

  const partLabel = createElement('label', { className: 'trip-evidence-field' });
  partLabel.append(createElement('span', {}, 'Hvilken kyststrækning søgte du på?'));
  const partSelect = createElement('select', { name: 'coastalPartId', required: '' });
  partLabel.append(partSelect);
  form.append(partLabel);

  const coverageField = createElement('fieldset', { className: 'trip-evidence-field trip-evidence-fieldset' });
  coverageField.append(createElement('legend', {}, 'Hvor meget af stedet fik du undersøgt?'));
  const coverageChoices = createElement('div', { className: 'trip-evidence-choices trip-evidence-choices--three' });
  appendRadio(coverageChoices, { name: 'searchCoverage', value: 'partial', label: 'Kun en lille del' });
  appendRadio(coverageChoices, { name: 'searchCoverage', value: 'normal', label: 'En almindelig tur', checked: true });
  appendRadio(coverageChoices, { name: 'searchCoverage', value: 'thorough', label: 'Det meste grundigt' });
  coverageField.append(coverageChoices);
  form.append(coverageField);

  const gramsLabel = createElement('label', { className: 'trip-evidence-field', hidden: '' });
  gramsLabel.append(createElement('span', {}, 'Cirka hvor mange gram? (frivilligt)'));
  const gramsInput = createElement('input', { name: 'grams', type: 'number', min: '0', max: '10000', step: '0.1', inputmode: 'decimal' });
  gramsLabel.append(gramsInput);
  form.append(gramsLabel);

  const note = createElement('p', { className: 'trip-evidence-note' });
  form.append(note);
  const updateNote = () => {
    note.textContent = typeof noteForSelection === 'function'
      ? noteForSelection({ zoneId: zoneSelect.value, coastalPartId: partSelect.value })
      : 'Vi sender dit valgte område og din kyststrækning til RavRadar – ikke din præcise position eller GPS-rute.';
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
  if (typeof document === 'undefined') throw new Error('Turformularen kræver en browser.');
  if (!Array.isArray(zones) || !zones.length) throw new Error('Zonelisten mangler.');
  if (!Array.isArray(coastalParts) || !coastalParts.length) throw new Error('Kystdelslisten mangler.');
  ensureStyles();

  const dialog = createElement('dialog', { className: 'trip-evidence-dialog', 'aria-labelledby': 'tripEvidenceTitle' });
  const form = createElement('form', { className: 'trip-evidence-form', method: 'dialog' });
  form.append(createElement('h2', { id: 'tripEvidenceTitle' }, 'Hvordan gik ravturen?'));
  const modeLabel = mode === 'waders' ? 'i vandet' : 'på stranden';
  form.append(createElement('p', { className: 'trip-evidence-intro' }, `Du søgte ${Math.max(1, Math.round(Number(searchMinutes) || 0))} minutter ${modeLabel}. Dit svar hjælper os med at se, hvornår RavScore rammer rigtigt og forkert.`));

  const readQuestions = appendReportQuestions(form, {
    zones,
    coastalParts,
    selectedZoneId: forecastZoneId,
    selectedCoastalPartId: forecastCoastalPartId,
    noteForSelection: selection => selection.zoneId === forecastZoneId && selection.coastalPartId === forecastCoastalPartId
      ? 'Vi sender dit valgte område og din kyststrækning til RavRadar – ikke din præcise position eller GPS-rute.'
      : 'Turen bliver gemt som nyttig erfaring, men sammenlignes ikke direkte med startscoren, fordi du søgte et andet sted end først valgt.'
  });

  const actions = createElement('div', { className: 'trip-evidence-actions' });
  actions.append(
    createElement('button', { className: 'trip-evidence-later', type: 'button' }, 'Svar senere'),
    createElement('button', { className: 'trip-evidence-discard', type: 'button' }, 'Afslut uden at indberette'),
    createElement('button', { className: 'trip-evidence-save', type: 'submit' }, 'Indsend tur')
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
      if (globalThis.confirm('Vil du afslutte turen uden at indberette noget? Turen fjernes fra denne enhed, og der sendes ingen data til RavRadar.')) dialog.close('discard');
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
  if (typeof document === 'undefined') throw new Error('Turformularen kræver en browser.');
  if (!Array.isArray(zones) || !zones.length) throw new Error('Zonelisten mangler.');
  if (!Array.isArray(coastalParts) || !coastalParts.length) throw new Error('Kystdelslisten mangler.');
  ensureStyles();

  const dialog = createElement('dialog', { className: 'trip-evidence-dialog', 'aria-labelledby': 'tripEvidenceStartTitle' });
  const form = createElement('form', { className: 'trip-evidence-form', method: 'dialog' });
  form.append(createElement('h2', { id: 'tripEvidenceStartTitle' }, 'Start en ravtur'));
  form.append(createElement('p', { className: 'trip-evidence-intro' }, 'Vælg hvordan og hvor du vil lede. RavRadar gemmer samtidig den score og de forhold, du så ved turens start.'));

  appendModeField(form, { mode, question: 'Hvordan vil du søge?' });

  const zoneLabel = createElement('label', { className: 'trip-evidence-field' });
  zoneLabel.append(createElement('span', {}, 'Hvilket område starter du i?'));
  const zoneSelect = createElement('select', { name: 'zoneId', required: '' });
  appendOptions(zoneSelect, zones, zoneId || zones[0]?.id);
  zoneLabel.append(zoneSelect);
  form.append(zoneLabel);

  const partLabel = createElement('label', { className: 'trip-evidence-field' });
  partLabel.append(createElement('span', {}, 'Hvilken del af kysten?'));
  const partSelect = createElement('select', { name: 'coastalPartId', required: '' });
  partLabel.append(partSelect);
  form.append(partLabel);
  form.append(createElement('p', { className: 'trip-evidence-note' }, 'Når du afslutter turen, spørger vi kun til søgningen og resultatet. Din præcise position og GPS-rute bliver ikke sendt.'));

  const actions = createElement('div', { className: 'trip-evidence-actions' });
  actions.append(
    createElement('button', { className: 'trip-evidence-later', type: 'button' }, 'Annuller'),
    createElement('button', { className: 'trip-evidence-save', type: 'submit' }, 'Start tur')
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
  if (typeof document === 'undefined') throw new Error('Turformularen kræver en browser.');
  if (!Array.isArray(zones) || !zones.length) throw new Error('Zonelisten mangler.');
  if (!Array.isArray(coastalParts) || !coastalParts.length) throw new Error('Kystdelslisten mangler.');
  ensureStyles();

  const current = now instanceof Date ? now : new Date(now);
  const dialog = createElement('dialog', { className: 'trip-evidence-dialog', 'aria-labelledby': 'accountTripReportTitle' });
  const form = createElement('form', { className: 'trip-evidence-form', method: 'dialog' });
  form.append(createElement('h2', { id: 'accountTripReportTitle' }, 'Indberet tur eller fund'));
  form.append(createElement('p', { className: 'trip-evidence-intro' }, 'Brug den rigtige dato og starttid for turen. RavRadar sætter aldrig dagens vejr på en ældre tur.'));

  const timeLabel = createElement('label', { className: 'trip-evidence-field' });
  timeLabel.append(createElement('span', {}, 'Vælg dato og tidspunkt for turens start'));
  const timeInput = createElement('input', { name: 'startedAt', type: 'datetime-local', required: '', max: localDateTimeValue(current) });
  timeLabel.append(timeInput);
  form.append(timeLabel);

  const durationLabel = createElement('label', { className: 'trip-evidence-field' });
  durationLabel.append(createElement('span', {}, 'Hvor mange minutter ledte du?'));
  const durationInput = createElement('input', { name: 'searchMinutes', type: 'number', min: '1', max: '1440', step: '1', required: '', value: '60', inputmode: 'numeric' });
  durationLabel.append(durationInput);
  form.append(durationLabel);

  appendModeField(form, { mode });
  const readQuestions = appendReportQuestions(form, {
    zones,
    coastalParts,
    selectedZoneId: zoneId,
    selectedCoastalPartId: coastalPartId,
    noteForSelection: () => 'RavRadar gemmer din valgte tid, dit område og din kyststrækning – ikke din præcise position. Hvis det oprindelige vejr- og scorebillede ikke findes sikkert, bruges rapporten ikke direkte til at justere RavScore.'
  });

  const status = createElement('p', { className: 'form-status', role: 'status' });
  form.append(status);
  const actions = createElement('div', { className: 'trip-evidence-actions' });
  actions.append(
    createElement('button', { className: 'trip-evidence-later', type: 'button' }, 'Annuller'),
    createElement('button', { className: 'trip-evidence-save', type: 'submit' }, 'Indsend tur')
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
        status.textContent = 'Vælg en gyldig dato og et gyldigt tidspunkt.';
        return;
      }
      if (startedAt.getTime() + searchMinutes * 60000 > current.getTime() + 5 * 60000) {
        status.textContent = 'Turen kan ikke slutte i fremtiden. Kontrollér tidspunktet og søgetiden.';
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
