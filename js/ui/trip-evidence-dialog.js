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
    .trip-evidence-form select,.trip-evidence-form input[type=number]{width:100%;min-height:3rem;padding:.65rem .8rem;border:1px solid var(--border,#cad3ca);border-radius:.75rem;background:var(--surface-raised,#fff);color:inherit;font:inherit}
    .trip-evidence-note{padding:.75rem .85rem;border-radius:.75rem;background:var(--info-soft,#eaf4ef);font-size:.92rem;line-height:1.4}
    .trip-evidence-actions{display:flex;justify-content:flex-end;gap:.65rem;padding-top:.25rem}
    .trip-evidence-actions button{min-height:2.85rem;padding:.65rem 1rem;border:0;border-radius:999px;font:inherit;font-weight:800;cursor:pointer}
    .trip-evidence-later{background:var(--surface-muted,#e9ece7);color:inherit}
    .trip-evidence-save{background:var(--accent,#b85f28);color:#fff}
    @media(max-width:32rem){.trip-evidence-choices--three{grid-template-columns:1fr}.trip-evidence-actions{display:grid;grid-template-columns:1fr 1fr}.trip-evidence-actions button{width:100%}}
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
  for (const option of options) {
    select.append(createElement('option', { value: option.id, selected: option.id === selectedId }, option.name || option.id));
  }
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
  form.append(createElement('p', { className: 'trip-evidence-intro' }, `Du søgte ${Math.max(1, Math.round(Number(searchMinutes) || 0))} minutter ${modeLabel}. Svar kort, så hjælper turen med at gøre RavRadar mere præcis.`));

  const foundField = createElement('fieldset', { className: 'trip-evidence-field trip-evidence-fieldset' });
  foundField.append(createElement('legend', {}, 'Fandt du rav?'));
  const foundChoices = createElement('div', { className: 'trip-evidence-choices' });
  appendRadio(foundChoices, { name: 'found', value: 'yes', label: 'Ja' });
  appendRadio(foundChoices, { name: 'found', value: 'no', label: 'Nej' });
  foundField.append(foundChoices);
  form.append(foundField);

  const zoneLabel = createElement('label', { className: 'trip-evidence-field' });
  zoneLabel.append(createElement('span', {}, 'Hvor søgte du?'));
  const zoneSelect = createElement('select', { name: 'zoneId', required: '' });
  appendOptions(zoneSelect, zones, forecastZoneId);
  zoneLabel.append(zoneSelect);
  form.append(zoneLabel);

  const partLabel = createElement('label', { className: 'trip-evidence-field' });
  partLabel.append(createElement('span', {}, 'Hvilken kystdel?'));
  const partSelect = createElement('select', { name: 'coastalPartId', required: '' });
  partLabel.append(partSelect);
  form.append(partLabel);

  const coverageField = createElement('fieldset', { className: 'trip-evidence-field trip-evidence-fieldset' });
  coverageField.append(createElement('legend', {}, 'Hvor grundigt søgte du?'));
  const coverageChoices = createElement('div', { className: 'trip-evidence-choices trip-evidence-choices--three' });
  appendRadio(coverageChoices, { name: 'searchCoverage', value: 'partial', label: 'Kort kig' });
  appendRadio(coverageChoices, { name: 'searchCoverage', value: 'normal', label: 'Normal tur', checked: true });
  appendRadio(coverageChoices, { name: 'searchCoverage', value: 'thorough', label: 'Grundigt' });
  coverageField.append(coverageChoices);
  form.append(coverageField);

  const gramsLabel = createElement('label', { className: 'trip-evidence-field', hidden: '' });
  gramsLabel.append(createElement('span', {}, 'Cirka hvor mange gram? (frivilligt)'));
  const gramsInput = createElement('input', { name: 'grams', type: 'number', min: '0', max: '100000', step: '0.1', inputmode: 'decimal' });
  gramsLabel.append(gramsInput);
  form.append(gramsLabel);

  const calibrationNote = createElement('p', { className: 'trip-evidence-note' }, 'Vi gemmer kystdelen, ikke din præcise position eller rute.');
  form.append(calibrationNote);

  const actions = createElement('div', { className: 'trip-evidence-actions' });
  actions.append(
    createElement('button', { className: 'trip-evidence-later', type: 'button' }, 'Svar senere'),
    createElement('button', { className: 'trip-evidence-save', type: 'submit' }, 'Gem tur')
  );
  form.append(actions);
  dialog.append(form);
  document.body.append(dialog);

  const partsForZone = zoneId => coastalParts.filter(part => part.zoneId === zoneId);
  const updateParts = () => {
    const options = partsForZone(zoneSelect.value);
    appendOptions(partSelect, options, options.some(part => part.id === forecastCoastalPartId) ? forecastCoastalPartId : options[0]?.id);
    partSelect.disabled = !options.length;
    updateNote();
  };
  const updateNote = () => {
    const matches = zoneSelect.value === forecastZoneId && partSelect.value === forecastCoastalPartId;
    calibrationNote.textContent = matches
      ? 'Vi gemmer kystdelen, ikke din præcise position eller rute.'
      : 'Turen bliver gemt, men bruges ikke til automatisk scorejustering, fordi stedet er ændret siden turstart.';
  };
  zoneSelect.addEventListener('change', updateParts);
  partSelect.addEventListener('change', updateNote);
  foundChoices.addEventListener('change', () => {
    const found = form.elements.found.value === 'yes';
    gramsLabel.hidden = !found;
    if (!found) gramsInput.value = '';
  });
  updateParts();

  return new Promise(resolve => {
    let answer = null;
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      answer = {
        zoneId: zoneSelect.value,
        coastalPartId: partSelect.value,
        searchCoverage: form.elements.searchCoverage.value,
        found: form.elements.found.value === 'yes',
        grams: gramsInput.value === '' ? null : Number(gramsInput.value)
      };
      dialog.close('save');
    });
    actions.querySelector('.trip-evidence-later').addEventListener('click', () => dialog.close('later'));
    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(dialog.returnValue === 'save' ? answer : null);
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
  form.append(createElement('h2', { id: 'tripEvidenceStartTitle' }, 'Hvor vil du lede?'));
  form.append(createElement('p', { className: 'trip-evidence-intro' }, 'Vælg søgemetode og kystdel. Så gemmer RavRadar den prognose, du faktisk starter turen med.'));

  const modeField = createElement('fieldset', { className: 'trip-evidence-field trip-evidence-fieldset' });
  modeField.append(createElement('legend', {}, 'Hvordan vil du søge?'));
  const modeChoices = createElement('div', { className: 'trip-evidence-choices' });
  appendRadio(modeChoices, { name: 'mode', value: 'waders', label: 'I vandet', checked: mode === 'waders' });
  appendRadio(modeChoices, { name: 'mode', value: 'beach', label: 'På stranden', checked: mode === 'beach' });
  modeField.append(modeChoices);
  form.append(modeField);

  const zoneLabel = createElement('label', { className: 'trip-evidence-field' });
  zoneLabel.append(createElement('span', {}, 'Hvilken zone?'));
  const zoneSelect = createElement('select', { name: 'zoneId', required: '' });
  appendOptions(zoneSelect, zones, zoneId || zones[0]?.id);
  zoneLabel.append(zoneSelect);
  form.append(zoneLabel);

  const partLabel = createElement('label', { className: 'trip-evidence-field' });
  partLabel.append(createElement('span', {}, 'Hvilken kystdel?'));
  const partSelect = createElement('select', { name: 'coastalPartId', required: '' });
  partLabel.append(partSelect);
  form.append(partLabel);
  form.append(createElement('p', { className: 'trip-evidence-note' }, 'Vi bruger dit valgte kystafsnit. Din præcise position og rute bliver ikke sendt.'));

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
