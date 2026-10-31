import { getLocale, registerI18nMessages, t } from '../i18n.js?v=4.0.594';

// Kun den godkendte principfigur: ingen prognosedata, score eller gemt brugerstate.
registerI18nMessages({
  da:{
    'about.angle.title':'Strømmens retning i forhold til kysten',
    'about.angle.description':'Havet ligger til venstre og land til højre. Den blå pil viser strømmen ved {angle} grader fra direkte mod land. Den stiplede linje viser hastighedens kystrettede del.',
    'about.angle.sea':'Hav',
    'about.angle.land':'Land',
    'about.angle.toward':'Mod land →',
    'about.angle.value':'{angle} grader fra direkte mod land',
    'about.angle.along':'Vandet bevæger sig 8 cm langs kysten på ét sekund, men kommer ikke nærmere land. Derfor er der intet direkte bidrag mod eller væk fra kysten.',
    'about.angle.direct':'Vandet bevæger sig 8 cm lige mod land på ét sekund. Hele bevægelsen bringer det nærmere kysten.',
    'about.angle.away':'Vandet bevæger sig 8 cm lige væk fra land på ét sekund. Hele bevægelsen fører det længere fra kysten.',
    'about.angle.obliqueToward':'Vandet bevæger sig stadig 8 cm i den blå pils retning på ét sekund. Fordi det løber skråt, kommer det kun {speed} cm nærmere kysten på den tid; bevægelsen går også langs kysten.',
    'about.angle.obliqueAway':'Vandet bevæger sig stadig 8 cm i den blå pils retning på ét sekund. Fordi det løber skråt, kommer det kun {speed} cm længere fra kysten på den tid; bevægelsen går også langs kysten.',
  },
  de:{
    'about.angle.title':'Strömungsrichtung im Verhältnis zur Küste',
    'about.angle.description':'Das Meer liegt links, das Land rechts. Der blaue Pfeil zeigt die Strömung bei {angle} Grad gegenüber der Richtung direkt zum Land. Die gestrichelte Linie zeigt den küstenwärts gerichteten Anteil der Geschwindigkeit.',
    'about.angle.sea':'Meer',
    'about.angle.land':'Land',
    'about.angle.toward':'Zum Land →',
    'about.angle.value':'{angle} Grad gegenüber der Richtung direkt zum Land',
    'about.angle.along':'Das Wasser bewegt sich in einer Sekunde 8 cm entlang der Küste, kommt dem Land aber nicht näher. Daher gibt es keinen direkten Anteil zur Küste hin oder von ihr weg.',
    'about.angle.direct':'Das Wasser bewegt sich in einer Sekunde 8 cm direkt zum Land. Die gesamte Bewegung bringt es näher an die Küste.',
    'about.angle.away':'Das Wasser bewegt sich in einer Sekunde 8 cm direkt vom Land weg. Die gesamte Bewegung führt es weiter von der Küste fort.',
    'about.angle.obliqueToward':'Das Wasser bewegt sich in einer Sekunde weiterhin 8 cm in Richtung des blauen Pfeils. Weil es schräg fließt, kommt es der Küste in dieser Zeit nur {speed} cm näher; es bewegt sich auch entlang der Küste.',
    'about.angle.obliqueAway':'Das Wasser bewegt sich in einer Sekunde weiterhin 8 cm in Richtung des blauen Pfeils. Weil es schräg fließt, entfernt es sich in dieser Zeit nur {speed} cm von der Küste; es bewegt sich auch entlang der Küste.',
  },
  en:{
    'about.angle.title':'Current direction relative to the coast',
    'about.angle.description':'The sea is on the left and land on the right. The blue arrow shows the current at {angle} degrees from directly toward land. The dashed line shows the shoreward component of its speed.',
    'about.angle.sea':'Sea',
    'about.angle.land':'Land',
    'about.angle.toward':'Toward land →',
    'about.angle.value':'{angle} degrees from directly toward land',
    'about.angle.along':'The water moves 8 cm along the coast in one second, but gets no closer to land. There is therefore no direct component toward or away from the coast.',
    'about.angle.direct':'The water moves 8 cm directly toward land in one second. Its entire movement brings it closer to the coast.',
    'about.angle.away':'The water moves 8 cm directly away from land in one second. Its entire movement takes it farther from the coast.',
    'about.angle.obliqueToward':'The water still moves 8 cm in the direction of the blue arrow in one second. Because it flows diagonally, it gets only {speed} cm closer to the coast in that time; it also moves along the coast.',
    'about.angle.obliqueAway':'The water still moves 8 cm in the direction of the blue arrow in one second. Because it flows diagonally, it gets only {speed} cm farther from the coast in that time; it also moves along the coast.',
  },
});

export function installAboutExplainer(root) {
  if (!root) return;
  const slider = root.querySelector('#rr-current-angle');
  const value = root.querySelector('#rr-angle-value');
  const result = root.querySelector('#rr-angle-result');
  const svg = root.querySelector('.rr-angle-drawing');
  if (!slider || !value || !result || !svg) return;
  const documentObject = root.ownerDocument;
  const ns = 'http://www.w3.org/2000/svg';
  const add = (tag, attributes, text) => {
    const element = documentObject.createElementNS(ns, tag);
    for (const [key, attributeValue] of Object.entries(attributes)) element.setAttribute(key, attributeValue);
    if (text) element.textContent = text;
    svg.appendChild(element);
    return element;
  };
  let angle = 45;
  function render() {
    const width = Math.max(1, svg.getBoundingClientRect().width || 320);
    const height = 215;
    const coast = Math.round(width * .77);
    const x = Math.round(width * .40), y = 112;
    const length = Math.min(84, width * .25);
    const radians = angle * Math.PI / 180;
    const dx = Math.cos(radians) * length;
    const dy = -Math.sin(radians) * length;
    svg.replaceChildren();
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.setAttribute('aria-labelledby', 'rr-angle-title rr-angle-desc');
    add('title', {id:'rr-angle-title'}, t('about.angle.title'));
    add('desc', {id:'rr-angle-desc'}, t('about.angle.description', {angle}));
    add('rect', {x:0,y:0,width:coast,height,rx:10,fill:'var(--rr-sea)'});
    add('rect', {x:coast,y:0,width:width-coast,height,fill:'var(--rr-sand)'});
    add('line', {x1:coast,y1:0,x2:coast,y2:height,stroke:'var(--rr-amber)','stroke-width':2});
    add('text', {x:16,y:27,fill:'var(--rr-ink)','font-size':14}, t('about.angle.sea'));
    add('text', {x:Math.min(coast+12,width-40),y:27,fill:'var(--rr-ink)','font-size':14}, t('about.angle.land'));
    add('line', {x1:16,y1:y,x2:coast-9,y2:y,stroke:'var(--rr-line)','stroke-width':1});
    add('text', {x,y:height-17,fill:'var(--rr-muted)','font-size':12,'text-anchor':'middle'}, t('about.angle.toward'));
    const projectedY = y + 35;
    add('line', {x1:x,y1:y+6,x2:x,y2:projectedY+6,stroke:'var(--rr-muted)','stroke-width':1});
    add('line', {x1:x+dx,y1:y+dy+5,x2:x+dx,y2:projectedY,stroke:'var(--rr-muted)','stroke-width':1,'stroke-dasharray':'3 5'});
    add('line', {x1:x,y1:projectedY,x2:x+dx,y2:projectedY,stroke:'var(--rr-amber)','stroke-width':3,'stroke-dasharray':'6 4'});
    add('circle', {cx:x+dx,cy:projectedY,r:4,fill:'var(--rr-amber)'});
    add('circle', {cx:x,cy:y,r:4,fill:'var(--rr-current)'});
    add('line', {x1:x,y1:y,x2:x+dx,y2:y+dy,stroke:'var(--rr-current)','stroke-width':4,'stroke-linecap':'round'});
    const tipX = x + dx, tipY = y + dy;
    const direction = Math.atan2(dy, dx);
    const arrowhead = 9, spread = Math.PI / 6;
    const p1x = tipX-arrowhead*Math.cos(direction-spread), p1y = tipY-arrowhead*Math.sin(direction-spread);
    const p2x = tipX-arrowhead*Math.cos(direction+spread), p2y = tipY-arrowhead*Math.sin(direction+spread);
    add('polyline', {points:p1x+','+p1y+' '+tipX+','+tipY+' '+p2x+','+p2y,fill:'none',stroke:'var(--rr-current)','stroke-width':4,'stroke-linecap':'round','stroke-linejoin':'round'});
    value.textContent = angle + '°';
    slider.value = String(angle);
    const speed = (8 * Math.abs(Math.cos(radians))).toLocaleString(getLocale(), {minimumFractionDigits:1,maximumFractionDigits:1});
    slider.setAttribute('aria-valuetext', t('about.angle.value', {angle}));
    const key = angle === 90 ? 'along' : angle === 0 ? 'direct' : angle === 180 ? 'away' : angle < 90 ? 'obliqueToward' : 'obliqueAway';
    result.textContent = t('about.angle.' + key, {speed});
  }
  slider.addEventListener('input', () => {
    const next = Number(slider.value);
    if (!Number.isFinite(next) || next < 0 || next > 180) return;
    angle = Math.round(next / 15) * 15;
    render();
  });
  const ResizeObserverObject = documentObject.defaultView?.ResizeObserver;
  if (typeof ResizeObserverObject === 'function') new ResizeObserverObject(render).observe(svg);
  render();
}
