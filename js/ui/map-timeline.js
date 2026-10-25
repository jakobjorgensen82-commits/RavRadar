import { getLanguage, getLocale, t } from '../i18n.js?v=4.0.589';
const ZONE = 'Europe/Copenhagen';
export function mapTimelineDate(time, language = getLanguage()) {
  const locale = { da: 'da-DK', de: 'de-DE', en: 'en-GB' }[language] ?? 'da-DK';
  const date = new Intl.DateTimeFormat(locale, { timeZone: ZONE, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(time));
  const clock = new Intl.DateTimeFormat(locale, { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short' }).format(new Date(time));
  const template = { da: '{date} · kl. {time}', de: '{date} · {time} Uhr', en: '{date} · {time}' }[language] ?? '{date} · kl. {time}';
  return template.replace('{date}', date.charAt(0).toLocaleUpperCase(locale) + date.slice(1)).replace('{time}', clock);
}
export function mapTimelineDayTicks(times, language = getLanguage()) {
  const locale = { da: 'da-DK', de: 'de-DE', en: 'en-GB' }[language] ?? 'da-DK';
  const keyFormat = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
  const labelFormat = new Intl.DateTimeFormat(locale, { timeZone: ZONE, weekday: 'long', day: 'numeric', month: 'short' });
  const weekdayFormat = new Intl.DateTimeFormat(locale, { timeZone: ZONE, weekday: 'short' });
  const dateFormat = new Intl.DateTimeFormat(locale, { timeZone: ZONE, day: '2-digit', month: '2-digit' });
  const ticks = []; let previous = null;
  times.forEach((time, index) => {
    const key = keyFormat.format(new Date(time));
    if (key !== previous) ticks.push({ index, label: labelFormat.format(new Date(time)),
      weekday: weekdayFormat.format(new Date(time)), date: dateFormat.format(new Date(time)) });
    previous = key;
  });
  // The range selects actual hour indices. Day boundaries and preferred label
  // centres use that same axis, including partial first/last days and DST.
  // Short two-line labels occupy 80% of an equal share; bounded collision
  // adjustment keeps them inside one row without pretending days are equal.
  const last = Math.max(1, times.length - 1), width = ticks.length ? .8 / ticks.length : 0;
  const centres = ticks.map((tick, i) => {
    tick.start = tick.index / last;
    tick.end = (ticks[i + 1]?.index ?? times.length - 1) / last;
    tick.width = width;
    return Math.max(width / 2, Math.min(1 - width / 2,
      times.length === 1 ? .5 : (tick.start + tick.end) / 2));
  });
  for (let i = 1; i < centres.length; i++) centres[i] = Math.max(centres[i], centres[i - 1] + width);
  if (centres.length) centres[centres.length - 1] = Math.min(centres.at(-1), 1 - width / 2);
  for (let i = centres.length - 2; i >= 0; i--) centres[i] = Math.min(centres[i], centres[i + 1] - width);
  return ticks.map((tick, i) => ({ ...tick, centre: centres[i] }));
}
export function bindMapTimeline(host, controller) {
  if (!host) return { refresh() {}, destroy() {} };
  host.innerHTML = '<div class="map-timeline-heading"><strong data-map-time-title></strong><div class="map-timeline-actions"><button type="button" data-map-time-prev>−1 h</button><button type="button" data-map-time-next>+1 h</button><button type="button" data-map-time-now></button></div></div>'
    + '<p class="map-timeline-committed" data-map-time-committed aria-live="polite"></p>'
    + '<p class="map-timeline-requested" data-map-time-requested></p>'
    + '<div class="map-timeline-controls"><input type="range" data-map-time-range min="0" max="0" step="1" value="0"></div>'
    + '<div class="map-timeline-days" data-map-time-days></div><p class="map-timeline-status" data-map-time-status role="status"></p><p class="map-timeline-scope" data-map-time-scope></p>';
  const query = selector => host.querySelector(selector), range = query('[data-map-time-range]');
  let renderedDaysKey = '';
  const render = frame => {
    host.hidden = !frame.initialized;
    if (host.hidden) return;
    host.setAttribute('aria-label', t('map.timeline.title'));
    host.setAttribute('aria-busy', String(frame.status === 'loading'));
    query('[data-map-time-title]').textContent = t('map.timeline.title');
    query('[data-map-time-now]').textContent = t('map.timeline.now');
    query('[data-map-time-prev]').setAttribute('aria-label', t('map.timeline.previous'));
    query('[data-map-time-next]').setAttribute('aria-label', t('map.timeline.next'));
    range.setAttribute('aria-label', t('map.timeline.title'));
    const index = Math.max(0, frame.times.indexOf(frame.requestedTime));
    range.max = String(Math.max(0, frame.times.length - 1)); range.value = String(index);
    range.disabled = !frame.times.length;
    if (frame.requestedTime) range.setAttribute('aria-valuetext', mapTimelineDate(frame.requestedTime));
    query('[data-map-time-prev]').disabled = !frame.times.length || index === 0;
    query('[data-map-time-next]').disabled = !frame.times.length || index === frame.times.length - 1;
    query('[data-map-time-now]').disabled = !frame.liveTime || !frame.times.length;
    query('[data-map-time-committed]').textContent = frame.committedTime
      ? t('map.timeline.shown', { time: mapTimelineDate(frame.committedTime) }) : t('map.timeline.unavailable');
    const requested = query('[data-map-time-requested]');
    requested.hidden = !frame.requestedTime || frame.requestedTime === frame.committedTime;
    requested.textContent = frame.requestedTime ? t('map.timeline.requested', { time: mapTimelineDate(frame.requestedTime) }) : '';
    const status = query('[data-map-time-status]');
    status.textContent = ['loading', 'error'].includes(frame.status) ? t('map.timeline.' + frame.status) : '';
    status.dataset.state = frame.status;
    query('[data-map-time-scope]').textContent = t('map.timeline.scope');
    const daysKey = [getLanguage(),frame.times[0],frame.times.at(-1),frame.times.length].join('|');
    if (daysKey !== renderedDaysKey) {
      renderedDaysKey = daysKey;
      const days = query('[data-map-time-days]'); days.replaceChildren();
      for (const tick of mapTimelineDayTicks(frame.times)) {
        if (tick.index > 0) {
          const boundary = document.createElement('span'); boundary.className = 'map-timeline-day-boundary';
          boundary.style.left = String(tick.start * 100) + '%'; boundary.setAttribute('aria-hidden', 'true');
          days.append(boundary);
        }
        const button = document.createElement('button'); button.type = 'button';
        button.textContent = tick.weekday + '\n' + tick.date;
        button.setAttribute('aria-label', tick.label); button.setAttribute('title', tick.label);
        button.style.left = String(tick.centre * 100) + '%'; button.style.width = String(tick.width * 100) + '%';
        button.addEventListener('click', () => controller.select(frame.times[tick.index], { immediate: true }));
        days.append(button);
      }
    }
  };
  range.addEventListener('input', () => controller.select(controller.snapshot().times[Number(range.value)]));
  range.addEventListener('change', () => controller.select(controller.snapshot().times[Number(range.value)], { immediate: true }));
  query('[data-map-time-now]').addEventListener('click', () => controller.now());
  query('[data-map-time-prev]').addEventListener('click', () => controller.step(-1));
  query('[data-map-time-next]').addEventListener('click', () => controller.step(1));
  const unsubscribe = controller.subscribe(render);
  return { refresh: () => render(controller.snapshot()), destroy: unsubscribe };
}
