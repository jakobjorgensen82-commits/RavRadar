import {
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from './ravscore-model-contract.js?v=4.0.324';

const INTEGRATED_MODEL_ID = 'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0';
const CANDIDATE_G_MODEL_ID = 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3';

const TEXT = Object.freeze({
  da: Object.freeze({
    title: 'Sådan skal RavScore læses',
    summary: ({ score, transport, mobilisation, huntability }) =>
      `RavScore ${score} samler relativt transportbevis ${transport}/100, mobiliseringsmulighed ${mobilisation}/100 og søgeforhold ${huntability}/100.`,
    memory: ({ coverage, window }) =>
      `Scoren har ${coverage} verificerede historiktimer inden for modellens ${window}-timers strømvindue. Ved et historikhul er tallet dækningsomfang, ikke bevis på et ubrudt forløb.`,
    memoryStatus: 'Den offentlige visning har ikke et sikkert timeantal for historikdækningen i denne række.',
    historyIncomplete: ({ lower, upper }) => `Scoren ${lower} er et forsigtigt minimum; det konservative modelinterval er ${lower}–${upper}.`,
    tailReset: 'En ældre konservativ bølge- eller last-mile-hale er nulstillet til sin forsigtige punktværdi efter den dokumenterede tidsgrænse; den fysiske tilstand er ikke opdigtet eller overskrevet.',
    grid: 'Strømmen er ikke en direkte måling af lokal bundnær strøm. Den bruges som relativt bevis for transport mod kystzonen. En vedvarende fralandskomponent er derfor negativ tilførselsevidens og kan føre noget mobilt materiale ud, men beviser ikke, at alt lokalt rav har forladt kystzonen. Gridstrømmen er heller ikke en måling af bølgeorbitaler, surfzonens undertow, feeder- eller langskyststrøm eller ripstrømme.',
    lastMile: 'Modellen bruger et kausalt, energivægtet gennemsnit af bølgernes retning: kun den aktuelle og de tidligere timer tæller, aldrig fremtidige timer. Gennemsnittet har fire timers halveringstid, så ældre timer tæller gradvist mindre. Det kan kun dæmpe eksisterende transportbevis med højst 15 %; bølger kan aldrig skabe eller øge tilførsel. Det sidste stykke over revler, gennem render og brydningszone er fortsat fysisk uopløst, og retningssammenhæng bruges kun til usikkerhed og forklaring.',
    fallingOutbound: 'Modellen beregner vandstanden lavere tre timer frem; det er ikke i sig selv ebbe eller en tidevandsfase og bestemmer ikke strømretningen. Her falder vandet samtidig med verificeret søværts gridstrøm, som kan føre noget mobilt rav ud. Lavere vand kan også blotlægge allerede afleveret eller fastholdt rav bag en revle, så et afgrænset område er lettere at afsøge. Det beviser ikke, at vandstandsfaldet fysisk har koncentreret ravet. Konteksten giver 0 scorepoint.',
    fallingInbound: 'Modellen beregner vandstanden lavere tre timer frem; det er ikke i sig selv ebbe eller en tidevandsfase og bestemmer ikke strømretningen. Her falder vandet samtidig med verificeret gridstrøm mod kystzonen. Lavere vand kan blotlægge allerede afleveret eller fastholdt rav bag en revle, så et afgrænset område er lettere at afsøge. Det beviser ikke, at vandstandsfaldet fysisk har koncentreret ravet. Konteksten giver 0 scorepoint.',
    fallingAlongOrWeak: 'Modellen beregner vandstanden lavere tre timer frem; det er ikke i sig selv ebbe eller en tidevandsfase og bestemmer ikke strømretningen. Den verificerede kystnormale gridstrøm er samtidig højst ±0,03 m/s og klassificeres derfor som langs/for svag. Lavere vand kan blotlægge allerede afleveret eller fastholdt rav bag en revle, så et afgrænset område er lettere at afsøge. Det beviser ikke fysisk koncentration. Konteksten giver 0 scorepoint.',
    fallingUnknownOrHold: 'Modellen beregner vandstanden lavere tre timer frem; det er ikke i sig selv ebbe eller en tidevandsfase og bestemmer ikke strømretningen. Den samtidige strømretning kan ikke klassificeres sikkert, fordi strømevidensen er ukendt eller holdes på kildens native cadence. Lavere vand kan blotlægge allerede afleveret eller fastholdt rav bag en revle, men beviser ikke fysisk koncentration. Konteksten giver 0 scorepoint.',
    rising: 'Stigende vandstand giver 0 scorepoint. Den kan flytte opskylskant og adgang, men beviser ikke i sig selv transport ind mod stranden.',
    stable: 'Stabil vandstand giver 0 scorepoint og bruges kun som jagtkontekst.',
    unknownWater: 'Vandstandens virkning er ikke sikkert kendt for denne time. Vandstand giver under alle omstændigheder 0 scorepoint og bruges kun som jagtkontekst.',
    limitations: 'RavRadar har ikke lokal batymetri eller en bølgeopløst surfzonemodel, observerer ikke det lokale ravlager og kan ikke kalde scoren en fundchance eller et empirisk præcisionsmål.',
  }),
  de: Object.freeze({
    title: 'So ist der BernsteinScore zu lesen',
    summary: ({ score, transport, mobilisation, huntability }) =>
      `Der BernsteinScore ${score} kombiniert relative Transportevidenz ${transport}/100, Mobilisierungsmöglichkeit ${mobilisation}/100 und Suchbedingungen ${huntability}/100.`,
    memory: ({ coverage, window }) =>
      `Der Score hat ${coverage} verifizierte Verlaufsstunden innerhalb des ${window}-Stunden-Strömungsfensters. Bei einer Verlaufslücke beschreibt dies den Deckungsumfang, nicht einen lückenlosen Verlauf.`,
    memoryStatus: 'Für diese Zeile zeigt die öffentliche Ansicht keine sichere Stundenzahl der Verlaufsdeckung.',
    historyIncomplete: ({ lower, upper }) => `Der Score ${lower} ist ein vorsichtiger Mindestwert; das konservative Modellintervall beträgt ${lower}–${upper}.`,
    tailReset: 'Ein älterer konservativer Wellen- oder Last-Mile-Nachlauf wurde nach der dokumentierten Zeitgrenze auf seinen vorsichtigen Punktwert zurückgesetzt; der physikalische Zustand wurde weder erfunden noch überschrieben.',
    grid: 'Die Strömung ist keine direkte Messung der lokalen bodennahen Strömung. Sie dient als relative Evidenz für Transport zur Küstenzone. Eine anhaltende seewärtige Komponente ist daher negative Zuflussevidenz und kann einen Teil mobilen Materials seewärts bewegen, beweist aber nicht, dass der gesamte lokale Bernstein die Küstenzone verlassen hat. Die Gitterströmung ist auch keine Messung von Wellenorbitalen, dem Undertow der Brandungszone, Zubringer-, Küstenlängs- oder Rippströmungen.',
    lastMile: 'Das Modell verwendet einen kausalen, energiegewichteten Durchschnitt der Wellenrichtung: Nur die aktuelle Stunde und frühere Stunden zählen, niemals zukünftige Stunden. Der Durchschnitt hat eine Halbwertszeit von vier Stunden, sodass ältere Stunden schrittweise weniger zählen. Er kann vorhandene Transportevidenz nur um höchstens 15 % dämpfen; Wellen können Zufluss niemals erzeugen oder erhöhen. Der letzte Weg über Sandbänke, Rinnen und Brandungszone bleibt physikalisch unaufgelöst; Richtungskohärenz beeinflusst nur Unsicherheit und Erklärung.',
    fallingOutbound: 'Das Modell berechnet für drei Stunden später einen niedrigeren Wasserstand; dies ist für sich genommen weder Ebbe noch eine Gezeitenphase und bestimmt nicht die Strömungsrichtung. Hier fällt das Wasser gleichzeitig mit verifizierter seewärtiger Gitterströmung, die einen Teil mobilen Bernsteins seewärts bewegen kann. Niedrigeres Wasser kann bereits angelieferten oder hinter einer Sandbank zurückgehaltenen Bernstein freilegen und so ein begrenztes Gebiet leichter absuchbar machen. Das beweist keine physische Konzentration durch den Wasserstandsfall. Der Kontext gibt 0 Scorepunkte.',
    fallingInbound: 'Das Modell berechnet für drei Stunden später einen niedrigeren Wasserstand; dies ist für sich genommen weder Ebbe noch eine Gezeitenphase und bestimmt nicht die Strömungsrichtung. Hier fällt das Wasser gleichzeitig mit verifizierter Gitterströmung zur Küstenzone. Niedrigeres Wasser kann bereits angelieferten oder hinter einer Sandbank zurückgehaltenen Bernstein freilegen und so ein begrenztes Gebiet leichter absuchbar machen. Das beweist keine physische Konzentration durch den Wasserstandsfall. Der Kontext gibt 0 Scorepunkte.',
    fallingAlongOrWeak: 'Das Modell berechnet für drei Stunden später einen niedrigeren Wasserstand; dies ist für sich genommen weder Ebbe noch eine Gezeitenphase und bestimmt nicht die Strömungsrichtung. Die verifizierte küstennormale Gitterströmung liegt gleichzeitig bei höchstens ±0,03 m/s und gilt daher als küstenparallel/zu schwach. Niedrigeres Wasser kann bereits angelieferten oder hinter einer Sandbank zurückgehaltenen Bernstein freilegen und ein begrenztes Gebiet leichter absuchbar machen; dies beweist keine physische Konzentration. Der Kontext gibt 0 Scorepunkte.',
    fallingUnknownOrHold: 'Das Modell berechnet für drei Stunden später einen niedrigeren Wasserstand; dies ist für sich genommen weder Ebbe noch eine Gezeitenphase und bestimmt nicht die Strömungsrichtung. Die gleichzeitige Strömungsrichtung lässt sich nicht sicher klassifizieren, weil die Strömungsevidenz unbekannt ist oder im nativen Liefertakt gehalten wird. Niedrigeres Wasser kann bereits angelieferten oder zurückgehaltenen Bernstein freilegen, beweist aber keine physische Konzentration. Der Kontext gibt 0 Scorepunkte.',
    rising: 'Steigender Wasserstand gibt 0 Scorepunkte. Er kann Spülsaum und Zugang verändern, beweist aber allein keinen Transport zum Strand.',
    stable: 'Stabiler Wasserstand gibt 0 Scorepunkte und wird nur als Suchkontext verwendet.',
    unknownWater: 'Die Wirkung des Wasserstands ist für diese Stunde nicht sicher bekannt. Der Wasserstand gibt in jedem Fall 0 Scorepunkte und dient nur als Suchkontext.',
    limitations: 'RavRadar hat weder lokale Bathymetrie noch ein wellenaufgelöstes Brandungszonenmodell, beobachtet den lokalen Bernsteinbestand nicht und kann den Score weder als Fundchance noch als empirisches Präzisionsmaß bezeichnen.',
  }),
  en: Object.freeze({
    title: 'How to read the AmberScore',
    summary: ({ score, transport, mobilisation, huntability }) =>
      `AmberScore ${score} combines relative transport evidence ${transport}/100, mobilisation opportunity ${mobilisation}/100, and search conditions ${huntability}/100.`,
    memory: ({ coverage, window }) =>
      `The score has ${coverage} verified history hours within the model's ${window}-hour current window. During a history gap this is coverage, not proof of an unbroken sequence.`,
    memoryStatus: 'The public display has no safe history-coverage hour count for this row.',
    historyIncomplete: ({ lower, upper }) => `The score ${lower} is a conservative minimum; the conservative model interval is ${lower}–${upper}.`,
    tailReset: 'An older conservative wave or last-mile tail was reset to its cautious point value after the documented time limit; the physical state was neither invented nor overwritten.',
    grid: 'The current is not a direct measurement of local near-bed current. It is used as relative evidence of transport towards the coastal zone. A sustained offshore component is therefore negative supply evidence and can move some mobile material seaward, but does not prove that all local amber has left the coastal zone. The grid current is also not a measurement of wave orbitals, surf-zone undertow, feeder or longshore current, or rip currents.',
    lastMile: 'The model uses a causal, energy-weighted average of wave direction: only the current and earlier hours count, never future hours. The average has a four-hour half-life, so older hours gradually count less. It can only attenuate existing transport evidence by at most 15%; waves can never create or increase supply. The final route across bars, through channels, and across the breaking zone remains physically unresolved; directional coherence affects uncertainty and explanation only.',
    fallingOutbound: 'The model calculates a lower water level three hours ahead; this is not by itself ebb or a tidal phase and does not determine current direction. Here, falling water coincides with verified seaward model-grid current, which can move some mobile amber seaward. Lower water may also expose amber already delivered or retained behind a bar, making a bounded area easier to search. This does not prove that the water-level fall physically concentrated the amber. The context awards 0 score points.',
    fallingInbound: 'The model calculates a lower water level three hours ahead; this is not by itself ebb or a tidal phase and does not determine current direction. Here, falling water coincides with verified model-grid current towards the coastal zone. Lower water may expose amber already delivered or retained behind a bar, making a bounded area easier to search. This does not prove that the water-level fall physically concentrated the amber. The context awards 0 score points.',
    fallingAlongOrWeak: 'The model calculates a lower water level three hours ahead; this is not by itself ebb or a tidal phase and does not determine current direction. The verified coast-normal model-grid current is simultaneously no more than ±0.03 m/s and is therefore classified as alongshore/too weak. Lower water may expose amber already delivered or retained behind a bar and make a bounded area easier to search; this does not prove physical concentration. The context awards 0 score points.',
    fallingUnknownOrHold: 'The model calculates a lower water level three hours ahead; this is not by itself ebb or a tidal phase and does not determine current direction. The simultaneous current direction cannot be classified safely because current evidence is unknown or held at the source’s native cadence. Lower water may expose amber already delivered or retained behind a bar, but does not prove physical concentration. The context awards 0 score points.',
    rising: 'Rising water level awards 0 score points. It may move the strandline and change access, but does not by itself prove transport towards the beach.',
    stable: 'Stable water level awards 0 score points and is used only as search context.',
    unknownWater: 'The water-level effect is not known safely for this hour. Water level always awards 0 score points and is used only as search context.',
    limitations: 'RavRadar has no local bathymetry or wave-resolving surf-zone model, does not observe the local amber inventory, and cannot describe the score as a find probability or an empirical accuracy measure.',
  }),
});

const CANDIDATE_G_TEXT = Object.freeze({
  da: Object.freeze({
    title: 'Sådan skal RavScore læses under Candidate G-rollback',
    summary: ({ score, transport, mobilisation, huntability }) =>
      `RavScore ${score} samler Candidate G's jagtbarhed ${huntability}/100, strømledede transport og levering ${transport}/100 samt mobiliseringsmulighed ${mobilisation}/100 med vægtene 20/50/30.`,
    memory: ({ coverage, window }) =>
      `Transporten bygger på ${coverage} af ${window} timers sammenhængende, verificeret strømhistorik.`,
    memoryStatus: 'Den sammenhængende strømhistorik er medregnet; den offentlige visning har ikke et sikkert timeantal for denne række.',
    grid: 'Candidate G bruger gridstrømmen som relativt transportbevis; den er ikke en direkte måling af lokal bundnær strøm. En vedvarende fralandskomponent trækker transporten ned og kan føre noget mobilt materiale ud, men beviser ikke, at alt lokalt rav har forladt kystzonen. Gridstrømmen er ikke bølgeorbitaler, surfzonens undertow, feeder-, langskyst- eller ripstrøm.',
    delivery: 'Candidate G beregner levering ud fra transportpotentiale gange en afhængig bølge- og tidsfaktor. Bølgeleddet kan kun modulere de sidste 15 % af denne faktor; det er et historisk, ikke fundkalibreret prior og løser ikke den fysiske vej over revler, render og brydningszone.',
    gate: 'Efter mindst 13 effektive timer med stærk, sammenhængende fralandsstrøm kan Candidate G sætte hele slutscoren til 0. Det er en konservativ historisk gate for negativ tilførselsevidens, ikke et bevis på, at alt rav er ført ud.',
    falling: 'Candidate G beregner vandstanden lavere tre timer frem; det er ikke i sig selv ebbe eller en tidevandsfase og bestemmer ikke strømretningen. Noget mobilt rav kan føres ud, hvis den samtidige strøm faktisk er søværts. Lavere vand kan blotlægge allerede afleveret eller fastholdt rav bag revler og gøre et afgrænset område lettere at afsøge, men beviser ikke fysisk koncentration. Vandstand giver ingen selvstændige scorepoint.',
    rising: 'Stigende vandstand giver ingen selvstændige scorepoint i Candidate G. Den kan flytte opskylskant og adgang, men beviser ikke i sig selv transport ind mod stranden.',
    stable: 'Stabil vandstand giver ingen selvstændige scorepoint i Candidate G og bruges kun som jagtkontekst.',
    unknownWater: 'Vandstandens virkning er ikke sikkert kendt for denne time. Den giver ingen selvstændige scorepoint i Candidate G.',
    limitations: 'RavRadar har ikke lokal batymetri eller en bølgeopløst surfzonemodel, observerer ikke det lokale ravlager og kan ikke kalde scoren en fundchance eller et empirisk præcisionsmål.',
  }),
  de: Object.freeze({
    title: 'So ist der BernsteinScore beim Candidate-G-Rollback zu lesen',
    summary: ({ score, transport, mobilisation, huntability }) =>
      `Der BernsteinScore ${score} kombiniert Candidate Gs Suchbarkeit ${huntability}/100, strömungsgeführten Transport und Lieferung ${transport}/100 sowie Mobilisierungsmöglichkeit ${mobilisation}/100 mit den Gewichten 20/50/30.`,
    memory: ({ coverage, window }) =>
      `Der Transport beruht auf ${coverage} von ${window} Stunden zusammenhängender, verifizierter Strömungshistorie.`,
    memoryStatus: 'Die zusammenhängende Strömungshistorie ist berücksichtigt; für diese Zeile liegt in der öffentlichen Anzeige keine sichere Stundenzahl vor.',
    grid: 'Candidate G verwendet die Gitterströmung als relative Transportevidenz; sie ist keine direkte Messung der lokalen bodennahen Strömung. Eine anhaltende seewärtige Komponente vermindert den Transport und kann einen Teil mobilen Materials seewärts bewegen, beweist aber nicht, dass der gesamte lokale Bernstein die Küstenzone verlassen hat. Die Gitterströmung ist weder Wellenorbital noch Undertow der Brandungszone, Zubringer-, Küstenlängs- oder Rippströmung.',
    delivery: 'Candidate G berechnet die Lieferung als Transportpotenzial mal einen abhängigen Wellen- und Zeitfaktor. Der Wellenanteil kann nur die letzten 15 % dieses Faktors modulieren; dies ist ein historisches, nicht fundkalibriertes Prior und löst den physikalischen Weg über Sandbänke, Rinnen und Brandungszone nicht auf.',
    gate: 'Nach mindestens 13 effektiven Stunden starker, zusammenhängender seewärtiger Strömung kann Candidate G den gesamten Endwert auf 0 setzen. Das ist ein konservatives historisches Gate für negative Zuflussevidenz, kein Beweis dafür, dass sämtlicher Bernstein hinausgetragen wurde.',
    falling: 'Candidate G berechnet für drei Stunden später einen niedrigeren Wasserstand; dies ist für sich genommen weder Ebbe noch eine Gezeitenphase und bestimmt nicht die Strömungsrichtung. Ein Teil mobilen Bernsteins kann seewärts bewegt werden, wenn die gleichzeitige Strömung tatsächlich seewärts gerichtet ist. Niedrigeres Wasser kann bereits angelieferten oder hinter Sandbänken zurückgehaltenen Bernstein freilegen und ein begrenztes Gebiet leichter absuchbar machen, beweist aber keine physische Konzentration. Der Wasserstand gibt keine eigenständigen Scorepunkte.',
    rising: 'Steigender Wasserstand gibt in Candidate G keine eigenständigen Scorepunkte. Er kann Spülsaum und Zugang verändern, beweist aber allein keinen Transport zum Strand.',
    stable: 'Stabiler Wasserstand gibt in Candidate G keine eigenständigen Scorepunkte und dient nur als Suchkontext.',
    unknownWater: 'Die Wirkung des Wasserstands ist für diese Stunde nicht sicher bekannt. Er gibt in Candidate G keine eigenständigen Scorepunkte.',
    limitations: 'RavRadar hat weder lokale Bathymetrie noch ein wellenaufgelöstes Brandungszonenmodell, beobachtet den lokalen Bernsteinbestand nicht und kann den Score weder als Fundchance noch als empirisches Präzisionsmaß bezeichnen.',
  }),
  en: Object.freeze({
    title: 'How to read AmberScore during a Candidate G rollback',
    summary: ({ score, transport, mobilisation, huntability }) =>
      `AmberScore ${score} combines Candidate G huntability ${huntability}/100, current-led transport and delivery ${transport}/100, and mobilisation opportunity ${mobilisation}/100 using 20/50/30 weights.`,
    memory: ({ coverage, window }) =>
      `Transport uses ${coverage} of ${window} hours of coherent, verified current history.`,
    memoryStatus: 'The coherent current history is included; the public display has no safe hour count for this row.',
    grid: 'Candidate G uses the grid current as relative transport evidence; it is not a direct measurement of local near-bed current. A sustained offshore component reduces transport and can move some mobile material seaward, but does not prove that all local amber has left the coastal zone. The grid current is not wave orbital motion, surf-zone undertow, feeder, longshore, or rip current.',
    delivery: 'Candidate G calculates delivery as transport potential times a dependent wave-and-timing factor. The wave term can modulate only the final 15% of that factor; this is a historical, non-find-calibrated prior and does not resolve the physical route across bars, channels, and the breaking zone.',
    gate: 'After at least 13 effective hours of strong, coherent offshore current, Candidate G can set the entire final score to 0. This is a conservative historical gate for negative supply evidence, not proof that all amber was carried away.',
    falling: 'Candidate G calculates a lower water level three hours ahead; this is not by itself ebb or a tidal phase and does not determine current direction. Some mobile amber may move seaward if the simultaneous current is in fact seaward. Lower water may expose amber already delivered or retained behind bars and make a bounded area easier to search, but does not prove physical concentration. Water level awards no independent score points.',
    rising: 'Rising water level awards no independent score points in Candidate G. It may move the strandline and change access, but does not by itself prove transport towards the beach.',
    stable: 'Stable water level awards no independent score points in Candidate G and is used only as search context.',
    unknownWater: 'The water-level effect is not known safely for this hour. It awards no independent score points in Candidate G.',
    limitations: 'RavRadar has no local bathymetry or wave-resolving surf-zone model, does not observe the local amber inventory, and cannot describe the score as a find probability or an empirical accuracy measure.',
  }),
});

const finite = value => typeof value === 'number' && Number.isFinite(value);

const rounded = value => Math.round(Number(value));
const LAST_MILE_STATUSES = new Set([
  'LAST_MILE_BOUNDED_WAVE_APPROACH_READY',
  'LAST_MILE_BOUNDED_WAVE_APPROACH_CALM_NEUTRAL',
  'LAST_MILE_HISTORY_INCOMPLETE_ENCLOSING_BOUND',
  'LAST_MILE_CONSERVATIVE_TAIL_RESET_POINT',
]);
const MODEL_BINDING = ravScoreModelBinding();
const hasActiveBinding = result => {
  const declared = result?.modelBinding;
  try {
    assertRavScoreModelBinding(declared, 'RavScore explanation binding');
  } catch {
    return false;
  }
  return Object.entries(MODEL_BINDING).every(([key, value]) => declared[key] === value);
};
const languageKey = language => ['da', 'de', 'en'].includes(String(language).slice(0, 2).toLowerCase())
  ? String(language).slice(0, 2).toLowerCase()
  : 'da';
const displayHours = (value, language) => new Intl.NumberFormat(
  language === 'da' ? 'da-DK' : language === 'de' ? 'de-DE' : 'en-GB',
  { maximumFractionDigits:1 },
).format(Number(value));
const displayDistance = (value, language) => new Intl.NumberFormat(
  language === 'da' ? 'da-DK' : language === 'de' ? 'de-DE' : 'en-GB',
  { maximumFractionDigits: 1 },
).format(value);
const SCORE_BOUND_FIELDS = Object.freeze([
  'lower', 'upper', 'modelUncertaintyPoints', 'rawLower', 'rawUpper',
]);

function exactPublicScoreQuality(result, {
  fullCalibrationEligible = null,
  historyIncompleteAllowed = true,
  tailResetAllowed = true,
} = {}) {
  const bounds=result?.scoreBounds;
  const coverage=result?.historyCoverageHours;
  const reasons=result?.historyReasonCodes;
  if (!bounds || typeof bounds!=='object' || Array.isArray(bounds)
    || JSON.stringify(Object.keys(bounds).sort())
      !== JSON.stringify([...SCORE_BOUND_FIELDS].sort())
    || SCORE_BOUND_FIELDS.some(field=>!finite(bounds[field]))
    || bounds.lower<0||bounds.upper>100||bounds.lower>bounds.upper
    || bounds.rawLower<0||bounds.rawUpper>100||bounds.rawLower>bounds.rawUpper
    || Math.abs(bounds.modelUncertaintyPoints-(bounds.upper-bounds.lower))>1e-9
    || result.score!==bounds.lower
    || !finite(coverage)||coverage<0||coverage>48
    || !Array.isArray(reasons)
    || reasons.some(code=>typeof code!=='string'||!/^[A-Z][A-Z0-9_]{0,127}$/.test(code))
    || new Set(reasons).size!==reasons.length
    || typeof result.conservativeTailResetApplied!=='boolean')return false;
  if(result.scoreQuality==='FULL_HISTORY')return typeof result.calibrationEligible==='boolean'
    &&(fullCalibrationEligible===null||result.calibrationEligible===fullCalibrationEligible)
    &&coverage===48&&reasons.length===0
    &&bounds.lower===bounds.upper&&bounds.rawLower===bounds.rawUpper
    &&(result.scoreSemantics==='EXACT_POINT_SCORE'
      ||(tailResetAllowed&&result.scoreSemantics==='CONSERVATIVE_TAIL_RESET_POINT_SCORE'))
    &&result.conservativeTailResetApplied
      ===(result.scoreSemantics==='CONSERVATIVE_TAIL_RESET_POINT_SCORE');
  return historyIncompleteAllowed&&result.scoreQuality==='HISTORY_INCOMPLETE'
    &&result.calibrationEligible===false&&reasons.length>0
    &&result.scoreSemantics==='CONSERVATIVE_ENCLOSING_LOWER_BOUND';
}

function gridSourceParagraph(result, language) {
  const provenance = result?.localWeather?.currentProvenance;
  if (provenance?.status !== 'verified') return null;
  const distance = finite(provenance?.distanceKm)
    && provenance.distanceKm >= 0 && provenance.distanceKm <= 15
    ? provenance.distanceKm : null;
  const regionalProxy = provenance?.sourceClass === 'owner-approved-regional-proxy';
  const localGrid = provenance?.sourceClass === 'local-model-grid'
    || provenance?.sourceClass === 'supplemental-local-current';
  if (!regionalProxy && !localGrid) return null;
  if (regionalProxy && distance === null) return null;
  const distanceText = distance === null ? null : displayDistance(distance, language);
  const held = result?.explanation?.transportDiagnostics?.currentMemoryStatus
    === 'READY_NATIVE_HOLD';
  const heldSuffix = language === 'de'
    ? ' Der Score hält diesen letzten verifizierten Referenzwert nur bis zum nächsten nativen Dreistundentermin fest und erfindet dazwischen keine Strömung.'
    : language === 'en'
      ? ' The score holds this last verified reference only until the next native three-hour sample and invents no current between samples.'
      : ' Scoren fastholder kun denne senest verificerede reference frem til næste native tretimersprøve og opfinder ingen strøm mellem prøverne.';
  const suffix = held ? heldSuffix : '';
  if (language === 'de') {
    return regionalProxy
      ? `Dieser Küstenabschnitt nutzt einen vom Eigentümer freigegebenen regionalen DMI-Proxy-Gitterpunkt in ${distanceText} km Entfernung vom RavRadar-Wasserpunkt; er ist kein lokaler Gitterpunkt.${suffix}`
      : `Die Strömungsdaten stammen von einem verifizierten Modellgitterpunkt, der dem Küstenabschnitt zugeordnet ist${distanceText === null ? '' : ` und ${distanceText} km vom RavRadar-Wasserpunkt entfernt liegt`}.${suffix}`;
  }
  if (language === 'en') {
    return regionalProxy
      ? `This coastal part uses an owner-approved regional DMI proxy grid point ${distanceText} km from RavRadar’s water point; it is not a local grid point.${suffix}`
      : `The current data come from a verified model grid point linked to the coastal part${distanceText === null ? '' : `, ${distanceText} km from RavRadar’s water point`}.${suffix}`;
  }
  return regionalProxy
    ? `Denne kystdel bruger et ejer-godkendt regionalt DMI-proxygridpunkt ${distanceText} km fra RavRadars vandpunkt; det er ikke et lokalt gridpunkt.${suffix}`
    : `Strømdataene kommer fra et verificeret modelgridpunkt knyttet til kystdelen${distanceText === null ? '' : `, ${distanceText} km fra RavRadars vandpunkt`}.${suffix}`;
}

function waterParagraph(text, water) {
  if (water?.scoreEffectPoints !== 0 || water?.transportEffect !== 'NONE') return null;
  if (water?.trendSemantics !== 'FORWARD_3H_MODEL_CHANGE_NOT_TIDAL_PHASE'
    || water?.currentRelationDeadbandMps !== 0.03) return null;
  if (water.phase === 'FALLING') {
    if (water.jointContextCode !== `FALLING_WITH_${water.currentRelation}_CURRENT_CONTEXT`) {
      return null;
    }
    if (water.currentRelation === 'OUTBOUND') return text.fallingOutbound;
    if (water.currentRelation === 'INBOUND') return text.fallingInbound;
    if (water.currentRelation === 'ALONG_OR_WEAK') return text.fallingAlongOrWeak;
    if (water.currentRelation === 'UNKNOWN_OR_NATIVE_HOLD') return text.fallingUnknownOrHold;
    return null;
  }
  if (water.phase === 'RISING') return text.rising;
  if (water.phase === 'STABLE') return text.stable;
  return text.unknownWater;
}

export function presentIntegratedRavScoreExplanation(result, { language = 'da' } = {}) {
  const explanation = result?.explanation;
  const transport = explanation?.transportDiagnostics;
  const mobilisation = explanation?.mobilisationDiagnostics;
  const water = explanation?.waterLevelContext;
  if (result?.available !== true
    || MODEL_BINDING.modelId !== INTEGRATED_MODEL_ID
    || !hasActiveBinding(result)
    || !finite(result?.score)
    || !finite(result?.components?.huntability)
    || !finite(result?.components?.transport)
    || !finite(result?.components?.release)
    || !exactPublicScoreQuality(result)
    || transport?.engine !== 'INTEGRATED_COASTAL_PROCESS'
    || transport?.lastMileScoreEffect !== 'BOUNDED_SUPPLY_ATTENUATION_ONLY'
    || !LAST_MILE_STATUSES.has(transport?.lastMileStatus)
    || !finite(transport?.lastMileDeliveryFactor)
    || transport.lastMileDeliveryFactor < 0.85
    || transport.lastMileDeliveryFactor > 1
    || transport?.lastMilePhysicalDeliveryResolved !== false
    || transport?.lastMileStructuralUncertainty !== true
    || transport?.resolvedSurfZoneIncluded !== false
    || typeof transport?.currentMemoryReady !== 'boolean'
    || !finite(mobilisation?.mobilisationPotential)) {
    return Object.freeze({ available: false, reason: 'INTEGRATED_EXPLANATION_NOT_READY' });
  }

  const selectedLanguage = languageKey(language);
  const text = TEXT[selectedLanguage];
  const values = Object.freeze({
    score: rounded(result.score),
    huntability: rounded(result.components.huntability),
    transport: rounded(result.components.transport),
    mobilisation: rounded(result.components.release),
  });
  const coverageKnown = finite(result.historyCoverageHours);
  const memory = coverageKnown
    ? text.memory({
      coverage: displayHours(result.historyCoverageHours, selectedLanguage),
      window: displayHours(48, selectedLanguage),
    })
    : text.memoryStatus;
  const waterText = waterParagraph(text, water);
  if (!waterText) return Object.freeze({ available: false, reason: 'WATER_CONTEXT_NOT_SCORE_NEUTRAL' });
  const gridSource = gridSourceParagraph(result, selectedLanguage);
  if (!gridSource) return Object.freeze({ available: false, reason: 'CURRENT_PROVENANCE_CONTEXT_INVALID' });
  const sections = Object.freeze({
    memory,
    ...(result.scoreQuality === 'HISTORY_INCOMPLETE' ? {
      scoreQuality: text.historyIncomplete({
        lower: displayHours(result.scoreBounds.lower, selectedLanguage),
        upper: displayHours(result.scoreBounds.upper, selectedLanguage),
      }),
    } : result.conservativeTailResetApplied ? { scoreQuality:text.tailReset } : {}),
    gridCurrent: `${gridSource} ${text.grid}`,
    lastMile: text.lastMile,
    waterLevel: waterText,
    limitations: text.limitations,
  });

  return Object.freeze({
    available: true,
    title: text.title,
    summary: text.summary(values),
    sections,
    facts: Object.freeze(Object.values(sections)),
    metrics: values,
    waterPhase: water?.phase ?? 'UNKNOWN',
    waterCurrentRelation: water?.currentRelation ?? null,
    waterCurrentJointContext: water?.jointContextCode ?? null,
    currentMemoryStatus: transport.currentMemoryStatus ?? null,
    limitations: Object.freeze([
      'LOCAL_AMBER_INVENTORY_UNOBSERVED',
      'LOCAL_BATHYMETRY_NOT_INCLUDED',
      'SURF_ZONE_UNRESOLVED',
      'NOT_CALIBRATED_TO_REPRESENTATIVE_FINDS',
    ]),
  });
}

function candidateWaterPhase(result) {
  const trend = finite(result?.localWeather?.waterLevelTrendCm3h)
    ? Number(result.localWeather.waterLevelTrendCm3h)
    : null;
  if (trend === null) return 'UNKNOWN';
  if (trend < 0) return 'FALLING';
  if (trend > 0) return 'RISING';
  return 'STABLE';
}

function presentCandidateGRavScoreExplanation(result, { language = 'da' } = {}) {
  const explanation = result?.explanation;
  const transport = explanation?.transportDiagnostics;
  const mobilisation = explanation?.mobilisationDiagnostics;
  if (result?.available !== true
    || MODEL_BINDING.modelId !== CANDIDATE_G_MODEL_ID
    || !hasActiveBinding(result)
    || explanation?.modelId !== CANDIDATE_G_MODEL_ID
    || !finite(result?.score)
    || !finite(result?.components?.huntability)
    || !finite(result?.components?.transport)
    || !finite(result?.components?.release)
    || !exactPublicScoreQuality(result, {
      fullCalibrationEligible:false,
      historyIncompleteAllowed:false,
      tailResetAllowed:false,
    })
    || transport?.engine !== 'CANDIDATE_G'
    || transport?.transportMemoryReady !== true
    || transport?.transportMemoryStatus !== 'READY'
    || !finite(transport?.transportPotential)
    || !finite(transport?.deliveryPotential)
    || !finite(transport?.transportAndDelivery)
    || !finite(mobilisation?.mobilisationPotential)) {
    return Object.freeze({ available: false, reason: 'CANDIDATE_G_EXPLANATION_NOT_READY' });
  }

  const selectedLanguage = languageKey(language);
  const text = CANDIDATE_G_TEXT[selectedLanguage];
  const values = Object.freeze({
    score: rounded(result.score),
    huntability: rounded(result.components.huntability),
    transport: rounded(result.components.transport),
    mobilisation: rounded(result.components.release),
  });
  const coverageKnown = finite(transport.currentMemoryCoverageHours)
    && finite(transport.currentMemoryWindowHours);
  const memory = coverageKnown
    ? text.memory({
      coverage: displayHours(transport.currentMemoryCoverageHours, selectedLanguage),
      window: displayHours(transport.currentMemoryWindowHours, selectedLanguage),
    })
    : text.memoryStatus;
  const phase = candidateWaterPhase(result);
  const waterLevel = phase === 'FALLING' ? text.falling
    : phase === 'RISING' ? text.rising
      : phase === 'STABLE' ? text.stable
        : text.unknownWater;
  const gridSource = gridSourceParagraph(result, selectedLanguage);
  if (!gridSource) return Object.freeze({ available: false, reason: 'CURRENT_PROVENANCE_CONTEXT_INVALID' });
  const sections = Object.freeze({
    memory,
    gridCurrent: `${gridSource} ${text.grid}`,
    lastMile: text.delivery,
    outflowGate: text.gate,
    waterLevel,
    limitations: text.limitations,
  });
  return Object.freeze({
    available: true,
    title: text.title,
    summary: text.summary(values),
    sections,
    facts: Object.freeze(Object.values(sections)),
    metrics: values,
    waterPhase: phase,
    currentMemoryStatus: transport.currentMemoryStatus,
    limitations: Object.freeze([
      'LOCAL_AMBER_INVENTORY_UNOBSERVED',
      'LOCAL_BATHYMETRY_NOT_INCLUDED',
      'SURF_ZONE_UNRESOLVED',
      'CANDIDATE_G_WAVE_LANDING_PRIOR_NOT_FIND_CALIBRATED',
      'CANDIDATE_G_13H_WHOLE_SCORE_GATE_IS_CONSERVATIVE_PRIOR',
    ]),
  });
}

/**
 * Selects an explanation adapter only from the canonical contract that was
 * built into the currently active public artifact. A result carrying another
 * model binding is never interpreted as a fallback or shadow result.
 */
export function presentActiveRavScoreExplanation(result, options = {}) {
  if (MODEL_BINDING.modelId === INTEGRATED_MODEL_ID) {
    return presentIntegratedRavScoreExplanation(result, options);
  }
  if (MODEL_BINDING.modelId === CANDIDATE_G_MODEL_ID) {
    return presentCandidateGRavScoreExplanation(result, options);
  }
  return Object.freeze({ available: false, reason: 'UNKNOWN_ACTIVE_MODEL_BINDING' });
}
