// App-owned public help, not a numerical RavScore/model input. Unknown or mixed
// questions keep the existing whole-question/AI path; no provider claim is made.
import {routeRavQuestion,classifyRavQuestion} from './rav-assistant.js?v=4.0.601';
import {localRavKnowledgeAnswer} from '../../knowledge/rav-assistant-local-v2.js?v=4.0.601';

const PUBLIC_ABOUT='https://ravradar.dk/about.html';
const PUBLIC_GROUP='https://www.facebook.com/groups/1849354103138911/';
const ANSWERS={
  water:{
    da:'Hverken højvande eller lavvande er altid bedst til ravjagt. Højere eller stigende vand kan flytte opskyllet længere op på stranden. Lavere eller faldende vand kan blotlægge materiale, som allerede er afleveret, og gøre det lettere at gennemsøge et mindre område. Det betyder ikke, at faldet har samlet ravet. Kig efter opskylslinjer og steder, hvor let materiale samler sig. Vejrforløb og kyst betyder mere end én fast regel om vandstand. Vandstanden alene giver hverken fund- eller sikkerhedsgaranti.',
    de:'Weder Hochwasser noch Niedrigwasser ist immer am besten für die Bernsteinsuche. Höheres oder steigendes Wasser kann den Spülsaum weiter den Strand hinauf verlagern. Niedrigeres oder fallendes Wasser kann bereits abgelagertes Material freilegen und eine kleinere Suchfläche zugänglich machen. Das beweist nicht, dass der Rückgang Bernstein gesammelt hat. Vergleiche Spülsäume und örtliche Taschen; Wetterverlauf und Küste sind wichtiger als eine feste Wasserstandsregel. Der Wasserstand allein garantiert weder Funde noch Sicherheit.',
    en:'Neither high tide nor low tide is always best for amber hunting. Higher or rising water can move the wash line farther up the beach. Lower or falling water may expose material already delivered and make a smaller area easier to search. That does not prove the fall concentrated amber. Compare wash lines and local pockets; the preceding weather and the coast matter more than one fixed rule about water level. Water level alone guarantees neither finds nor safety.'
  },
  creator:{
    da:'RavRadar er lavet af Jakob Jørgensen. Projektets egen side fortæller om ideen og arbejdet bag: '+PUBLIC_ABOUT,
    de:'Hinter RavRadar steht Jakob Jørgensen. Die eigene Projektseite erklärt die Idee und die Arbeit dahinter: '+PUBLIC_ABOUT,
    en:'RavRadar was created by Jakob Jørgensen. The project’s own page explains the idea and work behind it: '+PUBLIC_ABOUT
  },
  group:{
    da:'Ja. Her er Facebook-gruppen, som RavRadar selv linker til: '+PUBLIC_GROUP,
    de:'Ja. Das ist die Facebook-Gruppe, auf die RavRadar selbst verlinkt: '+PUBLIC_GROUP,
    en:'Yes. This is the Facebook group linked by RavRadar itself: '+PUBLIC_GROUP
  },
  project:{
    da:'RavRadar hjælper dig med at vælge et lovende kystområde og tidspunkt til ravjagt ud fra prognoser og kystforhold. Det er ikke en måling af, hvor ravet ligger, eller en garanti for fund. Læs om projektet: '+PUBLIC_ABOUT,
    de:'RavRadar hilft, anhand von Prognosen und Küstenbedingungen ein vielversprechendes Gebiet und einen Zeitpunkt für die Bernsteinsuche zu wählen. Es misst nicht, wo Bernstein liegt, und garantiert keine Funde. Über das Projekt: '+PUBLIC_ABOUT,
    en:'RavRadar helps you choose a promising coastal area and time for amber hunting from forecasts and coastal conditions. It does not measure where amber lies or guarantee a find. About the project: '+PUBLIC_ABOUT
  },
  beginner:{
    da:'Start med at lære at kende rav fra sten og plast. Søg systematisk i opskylslinjer og lommer med let materiale, og sammenlign frisk og ældre opskyl. Se på vejrforløbet og kysten frem for én vindretning eller vandstand. Kontrollér fund med flere skånsomme tegn; UV alene er ikke bevis. Tilpas udstyr til strand eller vand, og vurder altid forholdene på stedet. En prognose eller RavScore er ingen fund- eller sikkerhedsgaranti.',
    de:'Lerne zunächst, Bernstein von Steinen und Kunststoff zu unterscheiden. Suche systematisch in Spülsäumen und Taschen mit leichtem Material und vergleiche frische und ältere Ablagerungen. Beachte Wetterverlauf und Küste statt nur einer Windrichtung oder eines Wasserstands. Prüfe Funde anhand mehrerer schonender Merkmale; UV allein ist kein Beweis. Passe die Ausrüstung an Strand oder Wasser an und beurteile die Lage vor Ort. Eine Prognose oder ein Score garantiert weder Funde noch Sicherheit.',
    en:'Start by learning to distinguish amber from stone and plastic. Search wash lines and pockets of light material systematically, comparing fresh and older wash. Look at the preceding weather and the coast rather than one wind direction or water level. Check finds using several gentle clues; UV alone is not proof. Choose equipment for the beach or water and assess conditions on site. A forecast or RavScore guarantees neither finds nor safety.'
  },
  compound:{
    da:'Mener du selve materialet rav, et fund af rav eller et bestemt navn på en app, hjemmeside eller gruppe? Skriv gerne lidt mere, så jeg ikke gætter på betydningen.',
    de:'Meinst du das Material Bernstein, einen Bernsteinfund oder den Namen einer App, Website oder Gruppe? Beschreibe bitte kurz, was du meinst, damit ich nicht rate.',
    en:'Do you mean amber itself, a find of amber, or the name of an app, website or group? Please add a little context so I do not guess what the name means.'
  }
};
const FORMS={
  creator:{da:/^(?:hvem (?:har )?(?:lavet|udviklet|skabt) ravradar|hvem står bag ravradar)$/iu,de:/^(?:wer (?:hat ravradar (?:entwickelt|gemacht|erstellt)|steht hinter ravradar))$/iu,en:/^(?:who (?:created|made|developed) ravradar|who is behind ravradar)$/iu},
  group:{da:/^(?:har ravradar en facebook[- ]?gruppe|har ravradar en gruppe på facebook|hvor finder (?:jeg|vi) ravradars facebook[- ]?gruppe)$/iu,de:/^(?:hat ravradar eine facebook[- ]?gruppe|gibt es eine facebook[- ]?gruppe für ravradar|wo finde ich die facebook[- ]?gruppe von ravradar)$/iu,en:/^(?:does ravradar have a facebook group|is there a facebook group for ravradar|where can i find ravradar(?:’s|'s) facebook group)$/iu},
  project:{da:/^hvad er ravradar$/iu,de:/^was ist ravradar$/iu,en:/^what is ravradar$/iu},
  beginner:{da:/^hvad (?:skal|bør|behøver) (?:jeg|vi|man) (?:at )?vide om (?:ravjagt|at finde rav|at lede efter rav)$/iu,de:/^was (?:sollte|muss) (?:ich|man) über (?:die )?bernsteinsuche wissen$/iu,en:/^what (?:do i need to|should i|must i) know about (?:amber hunting|looking for amber|finding amber)$/iu}
};
const WATER={
  da:/^(?:(?:er det bedst(?: til ravjagt)? (?:med|ved)|hvad er bedst(?: til ravjagt)?,?) (?:(?:højvande|højt vand)(?: eller (?:lavvande|lavt vand|lav))?|(?:lavvande|lavt vand)(?: eller (?:højvande|højt vand|høj))?)|er (?:højvande eller lavvande|lavvande eller højvande) bedst(?: til ravjagt)?)$/iu,
  de:/^(?:ist (?:hochwasser oder niedrigwasser|niedrigwasser oder hochwasser) (?:für die bernsteinsuche )?besser|ist es (?:bei hochwasser oder niedrigwasser|bei niedrigwasser oder hochwasser) besser)$/iu,
  en:/^(?:is (?:high tide or low tide|low tide or high tide) better(?: for amber hunting)?|is it better (?:at|with) (?:high tide or low tide|low tide or high tide)|which is (?:better|best)(?: for amber hunting)?,? (?:high tide or low tide|low tide or high tide))$/iu
};
const COMPOUND={da:/^hvad er (?:(?:en|et|den|det) )?(rav[\p{L}-]+)$/iu,de:/^was ist (?:(?:ein|eine|der|die|das) )?(bernstein[\p{L}-]+)$/iu,en:/^what is (?:(?:a|an|the) )?(amber[\p{L}-]+)$/iu};
// Existing explicitly known equipment/product nouns keep their existing route.
const KNOWN_COMPOUNDS=/^(?:ravradar|ravscore|ravet|ravets|ravjagt|ravlygte|ravlampe|ravnet|ravkesse|ravkese|ravbriller|bernsteinsuche|bernsteinjagd|bernsteinlampe|bernsteinkescher|bernsteinnetz|bernsteinbrille|ambernet|ambertorch|amberlight|amberlamp|amberglasses)$/iu;
// A whole practical equipment request can include a general precautions clause.
// The latter qualifies the SAME beach use; it is not an arbitrary second topic.
// Only existing approved public units are composed, with no dropped remainder.
const BEACH_EQUIPMENT_USE={
  da:/^(?:kan (?:(?:jeg|vi|man) (?:også )?(?:bruge|anvende) (?:(?:en|den) )?(?:rav)?kes{1,2}e|(?:(?:en|den) )?(?:rav)?kes{1,2}e (?:også )?(?:bruges|anvendes))|hvordan (?:bruger|anvender) (?:jeg|vi|man) (?:(?:en|den) )?(?:rav)?kes{1,2}e) (?:på|ved) (?:en |den )?strand(?:en)?$/iu,
  de:/^(?:kann (?:ich|man) (?:(?:einen|den) )?(?:bernstein[- ]?)?kescher (?:auch )?(?:am|an einem) strand (?:benutzen|verwenden)|kann (?:(?:ein|der) )?(?:bernstein[- ]?)?kescher (?:auch )?(?:am|an einem) strand (?:benutzt|verwendet) werden|wie (?:benutze ich|benutzt man|verwende ich|verwendet man) (?:(?:einen|den) )?(?:bernstein[- ]?)?kescher (?:am|an einem) strand)$/iu,
  en:/^(?:can (?:(?:an?|the) )?amber(?: hunting)? net (?:also )?be used|can (?:i|we|you) (?:also )?use (?:(?:an?|the) )?amber(?: hunting)? net|how (?:do|can) (?:i|we|you) use (?:(?:an?|the) )?amber(?: hunting)? net) (?:on|at) (?:a|the) beach$/iu
};
const GENERAL_PRECAUTIONS={
  da:/^hvad (?:skal|bør) (?:jeg|vi|man) (?:være opmærksom(?:me)? på|passe på|undgå)$/iu,
  de:/^(?:worauf (?:sollte|sollten|muss|müssen) (?:ich|man|wir) achten|was (?:sollte|sollten|muss|müssen) (?:ich|man|wir) (?:beachten|vermeiden))$/iu,
  en:/^what (?:should|must) (?:i|we|one) (?:watch (?:out )?for|look (?:out )?for|keep in mind|avoid)$/iu
};
function practicalBeachEquipmentHelp(text,language){
  const parts=text.split(/,?\s+(?:og|und|and)\s+(?=(?:hvad|worauf|was|what)\b)|[?!.]\s+(?=(?:hvad|worauf|was|what)\b)/iu);
  if(parts.length>2||!BEACH_EQUIPMENT_USE[language].test(parts[0])
    ||(parts.length===2&&!GENERAL_PRECAUTIONS[language].test(parts[1])))return null;
  const units=[localRavKnowledgeAnswer('Hvad er en kesse til ravjagt?',language),
    localRavKnowledgeAnswer('Hvordan leder jeg systematisk på stranden?',language)];
  if(units.some(unit=>typeof unit!=='string'||!unit))return null;
  const answer=units.join('\n\n');
  return answer.length<=900?{kind:'local-public-help',id:'beach-equipment',answer}:null;
}
export function publicRavAssistantHelp(question,language){
  const raw=String(question||'').trim();
  if(!raw||raw.length>600||!['da','de','en'].includes(language)||routeRavQuestion(raw)==='fixed-refusal')return null;
  const text=raw.normalize('NFKC').replace(/\s+/gu,' ').replace(/[?!.]{1,3}$/u,'');
  const practical=practicalBeachEquipmentHelp(text,language);
  if(practical)return practical;
  let id=Object.keys(FORMS).find(key=>FORMS[key][language].test(text));
  if(!id&&WATER[language].test(text))id='water';
  const term=COMPOUND[language].exec(text)?.[1];
  if(!id&&term&&!KNOWN_COMPOUNDS.test(term)&&classifyRavQuestion(raw)==='origin')id='compound';
  if(!id)return null;
  return {kind:'local-public-help',id,answer:ANSWERS[id][language]};
}
