// App-owned public help for complete questions. Mixed questions keep the
// existing whole-question path.
import {routeRavQuestion,classifyRavQuestion} from './rav-assistant.js?v=4.0.603&locale=topic-tab-20261125';
import {localRavKnowledgeAnswer} from '../../knowledge/rav-assistant-local-v2.js?v=4.0.603';
import {t} from '../i18n.js?v=4.0.603';

const PUBLIC_ABOUT='https://ravradar.dk/about.html';
const PUBLIC_GROUP='https://www.facebook.com/groups/1849354103138911/';
const SANDBAR_TRANSPORT_TOPIC='public-knowledge:sandbar-transport';
const SANDBAR_SURFACE_CLUES={
  da:'Fra stranden kan du holde øje med åbninger i rækken af brydende bølger og se, hvordan skum eller flydende tang bevæger sig dér. Det er spor om vandets bevægelse i overfladen. Ravets placering og strømmen ved bunden er stadig usikre.',
  de:'Vom Strand aus kannst du nach Lücken zwischen den brechenden Wellen schauen und beobachten, wie sich Schaum oder treibender Tang dort bewegt. Das sind Hinweise auf die Bewegung an der Oberfläche. Wo Bernstein liegt und wie das Wasser am Boden strömt, bleibt offen.',
  en:'From the beach, look for gaps in the line of breaking waves and watch how foam or floating seaweed moves there. These are clues to movement at the surface. Where the amber is and how the current flows near the seabed remain uncertain.',
};
const SANDBAR_SURFACE_FOLLOWUP={
  da:/^(?:og )?hvad kan (?:jeg|vi|man) (?:konkret )?(?:se|observere)(?: fra stranden|,? (?:hvis|når) (?:jeg|vi|man) står på stranden)$/iu,
  de:/^(?:und )?was kann (?:ich|man) (?:konkret )?vom strand aus (?:sehen|beobachten)$/iu,
  en:/^(?:and )?what can (?:i|we) (?:(?:actually|specifically) )?(?:see|observe) from the beach$/iu,
};

const ANSWERS={
  water:{
    da:'Hverken højvande eller lavvande er altid bedst til ravjagt. Højere eller stigende vand kan flytte opskyllet længere op på stranden. Lavere eller faldende vand kan blotlægge materiale, som allerede er afleveret, og gøre det lettere at gennemsøge et mindre område. Det betyder ikke, at faldet har samlet ravet. Kig efter opskylslinjer og steder, hvor let materiale samler sig. Vejrforløb og kyst betyder mere end én fast regel om vandstand. Vandstanden alene giver hverken fund- eller sikkerhedsgaranti.',
    de:'Weder Hochwasser noch Niedrigwasser ist immer am besten für die Bernsteinsuche. Höheres oder steigendes Wasser kann den Spülsaum weiter den Strand hinauf verlagern. Niedrigeres oder fallendes Wasser kann bereits abgelagertes Material freilegen und eine kleinere Suchfläche zugänglich machen. Das beweist nicht, dass der Rückgang Bernstein gesammelt hat. Vergleiche Spülsäume und örtliche Taschen; Wetterverlauf und Küste sind wichtiger als eine feste Wasserstandsregel. Der Wasserstand allein garantiert weder Funde noch Sicherheit.',
    en:'Neither high tide nor low tide is always best for amber hunting. Higher or rising water can move the wash line farther up the beach. Lower or falling water may expose material already delivered and make a smaller area easier to search. That does not prove the fall concentrated amber. Compare wash lines and local pockets; the preceding weather and the coast matter more than one fixed rule about water level. Water level alone guarantees neither finds nor safety.'
  },
  'water-change':{
    da:'Tallet viser i centimeter, hvor meget den beregnede vandstand ændrer sig fra den valgte time til tre timer senere. Plus betyder, at vandstanden er højere tre timer senere, og minus, at den er lavere. Brug tallet som et hurtigt overblik. Under »Vandstand time for time« kan du se, hvornår niveauet ændrer sig, og om det svinger undervejs.',
    de:'Der Wert zeigt in Zentimetern, wie stark sich der vorhergesagte Wasserstand von der gewählten Stunde bis drei Stunden später ändert. Ein Pluswert bedeutet, dass der Wasserstand dann höher liegt, ein Minuswert, dass er niedriger liegt. So siehst du die Änderung auf einen Blick. Unter „Wasserstand stündlich“ siehst du, wann sich der Pegel ändert und ob er zwischendurch schwankt.',
    en:'This value shows in centimetres how much the forecast water level changes from the selected hour to three hours later. A plus sign means the level will be higher at the later hour and a minus sign means it will be lower. Use it for a quick overview. In “Hourly water level” you can see when the level changes and whether it fluctuates in between.'
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
  'landing-precision':{
    da:'Nej. RavRadar bruger vejrprognoser og kystforhold til at pege på lovende områder og tidspunkter. Modellen kan ikke forudsige præcis, hvor et ravstykke skyller op på stranden.',
    de:'Nein. RavRadar nutzt Wettervorhersagen und Küstenbedingungen, um auf vielversprechende Suchgebiete und Zeiten hinzuweisen. Das Modell kann nicht genau vorhersagen, wo ein Stück Bernstein angespült wird.',
    en:'No. RavRadar uses weather forecasts and coastal conditions to suggest promising areas and times to search. The model cannot predict exactly where a piece of amber will wash ashore.'
  },
  beginner:{
    da:'Start med at lære at kende rav fra sten og plast. Søg systematisk i opskylslinjer og lommer med let materiale, og sammenlign frisk og ældre opskyl. Se på vejrforløbet og kysten frem for én vindretning eller vandstand. Kontrollér fund med flere skånsomme tegn; UV alene er ikke bevis. Tilpas udstyr til strand eller vand, og vurder altid forholdene på stedet. En prognose eller RavScore er ingen fund- eller sikkerhedsgaranti.',
    de:'Lerne zunächst, Bernstein von Steinen und Kunststoff zu unterscheiden. Suche systematisch in Spülsäumen und Taschen mit leichtem Material und vergleiche frische und ältere Ablagerungen. Beachte Wetterverlauf und Küste statt nur einer Windrichtung oder eines Wasserstands. Prüfe Funde anhand mehrerer schonender Merkmale; UV allein ist kein Beweis. Passe die Ausrüstung an Strand oder Wasser an und beurteile die Lage vor Ort. Eine Prognose oder ein Score garantiert weder Funde noch Sicherheit.',
    en:'Start by learning to distinguish amber from stone and plastic. Search wash lines and pockets of light material systematically, comparing fresh and older wash. Look at the preceding weather and the coast rather than one wind direction or water level. Check finds using several gentle clues; UV alone is not proof. Choose equipment for the beach or water and assess conditions on site. A forecast or RavScore guarantees neither finds nor safety.'
  },
  daylight:{
    da:'En UV-lygte kan stadig få rav til at lyse i dagslys. Det omgivende lys kan overdøve gløden, så prøv at skærme fundet af eller undersøge det i skygge. Andet materiale kan også fluorescere under UV-lys. Brug gløden som ét spor sammen med fundets vægt og overflade.',
    de:'Eine UV-Lampe kann Bernstein auch bei Tageslicht zum Leuchten bringen. Helles Umgebungslicht kann das Leuchten überstrahlen. Schirme den Fund ab oder prüfe ihn im Schatten. Auch andere Materialien können unter UV-Licht fluoreszieren. Beurteile deshalb auch das Gewicht und die Oberfläche des Fundstücks.',
    en:'A UV lamp can make amber glow in daylight. Bright surroundings can hide the glow, so shield the find from ambient light or check it in the shade. Other materials can fluoresce under UV light too. Use the glow as one clue along with the weight and surface of the piece.'
  },
  'named-equipment':{
    da:'Jeg mangler pålidelige oplysninger om det apparat. Hvis du skriver modelnavnet eller beskriver, hvordan det skulle virke, kan jeg hjælpe med at vurdere metoden.',
    de:'Mir fehlen verlässliche Informationen zu diesem Gerät. Wenn du den Modellnamen nennst oder erklärst, wie es funktionieren soll, kann ich die Methode einordnen.',
    en:'I don’t have reliable information about that device. If you share the model name or describe how it’s meant to work, I can help assess the method.'
  },
  compound:{
    da:'Mener du selve materialet rav, et fund af rav eller et bestemt navn på en app, hjemmeside eller gruppe? Skriv gerne lidt mere, så jeg ikke gætter på betydningen.',
    de:'Meinst du das Material Bernstein, einen Bernsteinfund oder den Namen einer App, Website oder Gruppe? Beschreibe bitte kurz, was du meinst, damit ich nicht rate.',
    en:'Do you mean amber itself, a find of amber, or the name of an app, website or group? Please add a little context so I do not guess what the name means.'
  },
  'sandbar-transport':{
    da:'Ja. Når bølger sætter let materiale ved bunden i bevægelse, kan strømmen flytte det mellem revler og render. Det kan ske uden nyt opskyl på stranden. '+SANDBAR_SURFACE_CLUES.da,
    de:'Ja. Wenn Wellen leichtes Material am Boden aufwirbeln, kann die Strömung es zwischen Sandbänken und Rinnen verlagern. Das ist auch ohne neuen Spülsaum möglich. '+SANDBAR_SURFACE_CLUES.de,
    en:'Yes. When waves stir up light material near the seabed, currents can move it between sandbars and channels. This can happen without fresh wash on the beach. '+SANDBAR_SURFACE_CLUES.en
  }
};
const FORMS={
  'water-change':{
    da:/^(?:(?:hvad (?:betyder|viser) )?vandstandsændring(?:en)? på (?:3|tre) timer(?: sammenlignet med vandstandsprognosen)?|hvad er forskellen (?:på|mellem) vandstandsændring(?:en)? på (?:3|tre) timer og (?:vandstand(?:en)? time for time|vandstandsprognosen)|hvad skal (?:jeg|vi|man) (?:rent praktisk )?bruge (?:(?:3|tre)[- ]timers vandstanden|vandstandsændring(?:en)? på (?:3|tre) timer) til(?: som bruger)?)$/iu,
    de:/^(?:(?:was (?:bedeutet|zeigt) die )?wasserstandsänderung in (?:3|drei) stunden|was ist der unterschied zwischen der wasserstandsänderung in (?:3|drei) stunden und (?:der stündlichen wasserstands(?:vorhersage|prognose)|dem stündlichen wasserstand))$/iu,
    en:/^(?:(?:3|three)[- ]hour water[- ]level change|what does (?:the )?(?:3|three)[- ]hour water[- ]level change (?:mean|show)|what is the difference between the (?:3|three)[- ]hour water[- ]level change and the hourly water[- ]level(?: forecast)?)$/iu,
  },
  creator:{da:/^(?:hvem (?:har )?(?:lavet|udviklet|skabt) ravradar|hvem står bag ravradar)$/iu,de:/^(?:wer (?:hat ravradar (?:entwickelt|gemacht|erstellt)|steht hinter ravradar))$/iu,en:/^(?:who (?:created|made|developed) ravradar|who is behind ravradar)$/iu},
  group:{da:/^(?:har ravradar en facebook[- ]?gruppe|har ravradar en gruppe på facebook|hvor finder (?:jeg|vi) ravradars facebook[- ]?gruppe)$/iu,de:/^(?:hat ravradar eine facebook[- ]?gruppe|gibt es eine facebook[- ]?gruppe für ravradar|wo finde ich die facebook[- ]?gruppe von ravradar)$/iu,en:/^(?:does ravradar have a facebook group|is there a facebook group for ravradar|where can i find ravradar(?:’s|'s) facebook group)$/iu},
  project:{da:/^hvad er ravradar$/iu,de:/^was ist ravradar$/iu,en:/^what is ravradar$/iu},
  beginner:{da:/^hvad (?:skal|bør|behøver) (?:jeg|vi|man) (?:at )?vide om (?:ravjagt|at finde rav|at lede efter rav)$/iu,de:/^was (?:sollte|muss) (?:ich|man) über (?:die )?bernsteinsuche wissen$/iu,en:/^what (?:do i need to|should i|must i) know about (?:amber hunting|looking for amber|finding amber)$/iu},
  'landing-precision':{
    da:/^kan ravradar forudsige (?:(?:det )?(?:præcise|nøjagtige) landings(?:sted|punkt) for rav(?:et)?|(?:præcis|nøjagtig),? hvor (?:ravet|et ravstykke) skyller (?:op|i land))$/iu,
    de:/^kann ravradar (?:die (?:genaue|exakte) landestelle|den (?:genauen|exakten) landeort) von bernstein vorhersagen$/iu,
    en:/^can ravradar predict (?:exactly where (?:a piece of )?amber will wash ashore|the (?:exact|precise) landing (?:spot|place|point) (?:of|for) (?:a piece of )?amber)$/iu,
  },
  'origin-age':{
    da:/^hvor kommer rav(?:et)? fra(?:,? og |[?.] (?:og )?)kan (?:jeg|vi|man) (?:se|bestemme) alderen på et (?:rav)?fund$/iu,
    de:/^woher kommt bernstein(?:,? und |[?.] (?:und )?)kann (?:ich|man) das alter eines (?:bernstein)?fund(?:es|s) bestimmen$/iu,
    en:/^where does amber come from(?:,? and |[?.] (?:and )?)can (?:i|we|one) (?:tell|determine) the age of (?:a find|an amber find|a piece of amber)$/iu,
  },
  'sandbar-transport':{
    da:/^(?:kan (?:hav)?strøm(?:men)? flytte rav|kan rav(?:ansamlinger)? (?:flytte sig|flyttes)) mellem (?:to )?revler(?: uden nyt opskyl)?(?:(?:,? og |[?.] )hvad kan jeg (?:se|observere) fra stranden)?$/iu,
    de:/^(?:kann bernstein zwischen (?:zwei )?sandbänken durch (?:die )?strömung verlagert werden|(?:kann die strömung bernstein|können sich bernsteinansammlungen) zwischen (?:zwei )?sandbänken(?: ohne neuen spülsaum)? verlagern)(?:(?:,? und |[?.] )was kann ich vom strand aus beobachten(?:,? um das zu erkennen)?)?$/iu,
    en:/^(?:can (?:currents?|the current) move amber|can amber(?: accumulations)? (?:shift|move)) between (?:two )?sandbars(?: without (?:new|fresh) wash)?(?:(?:,? and |[?.] )what can i (?:observe|see) from the beach(?: to notice it)?)?$/iu,
  },
};
const WATER={
  da:/^(?:(?:er det bedst(?: til ravjagt)? (?:med|ved)|hvad er bedst(?: til ravjagt)?,?) (?:(?:højvande|højt vand)(?: eller (?:lavvande|lavt vand|lav))?|(?:lavvande|lavt vand)(?: eller (?:højvande|højt vand|høj))?)|er (?:højvande eller lavvande|lavvande eller højvande) bedst(?: til ravjagt)?)$/iu,
  de:/^(?:ist (?:hochwasser oder niedrigwasser|niedrigwasser oder hochwasser) (?:für die bernsteinsuche )?besser|ist es (?:bei hochwasser oder niedrigwasser|bei niedrigwasser oder hochwasser) besser)$/iu,
  en:/^(?:is (?:high tide or low tide|low tide or high tide) better(?: for amber hunting)?|is it better (?:at|with) (?:high tide or low tide|low tide or high tide)|which is (?:better|best)(?: for amber hunting)?,? (?:high tide or low tide|low tide or high tide))$/iu
};
// The whole request asks about UV identification in daylight. Both daylight
// contrast and identification are covered by the public answer.
const UV_DAYLIGHT={
  da:/^kan (?:jeg|man) (?:bruge en uv[- ](?:lygte|lampe) (?:i dagslys til at (?:(?:genkende|identificere) rav|kende rav fra andre fund)|til at (?:genkende|identificere) rav i dagslys)|i dagslys skelne rav fra andre fund med en uv[- ](?:lygte|lampe))$/iu,
  de:/^kann (?:ich|man) (?:bernstein (?:im|bei) tageslicht mit einer uv[- ]lampe (?:erkennen|identifizieren|von anderen fundstücken unterscheiden)|mit einer uv[- ]lampe (?:im|bei) tageslicht bernstein (?:erkennen|identifizieren))$/iu,
  en:/^can (?:i|we|you) (?:use a uv[- ](?:torch|lamp|light) (?:in daylight to (?:identify amber|tell amber from other finds)|to identify amber in daylight)|tell amber from other finds with a uv[- ](?:torch|lamp|light) in daylight)$/iu
};
// Whole questions about why this UV test is inconclusive and harder to see in daylight.
const UV_IDENTIFICATION_DAYLIGHT={
  da:/^hvorfor kan uv[- ]lys alene ikke identificere rav sikkert(?:,? og |[?.] )hvorfor er fluorescensen sværere at se i dagslys$/iu,
  de:/^warum kann uv[- ]licht allein bernstein nicht sicher identifizieren(?:,? und |[?.] )warum ist die fluoreszenz bei tageslicht schlechter zu erkennen$/iu,
  en:/^why can uv[- ]light alone (?:not reliably|not conclusively) identify amber(?:,? and |[?.] )why is (?:the )?fluorescence harder to see in daylight$/iu,
};
// Both clauses must ask about the mechanism and visibility of the same UV test.
const UV_FLUORESCENCE_DAYLIGHT={
  da:/^hvorfor (?:lyser|fluorescerer) rav (?:under|i) (?:(?:en|et) )?uv[- ](?:lys|lygte|lampe)(?:,? og |[?.] )(?:hvad ændrer dagslys ved (?:den test|testen|prøven)|hvordan påvirker dagslys (?:testen|prøven))$/iu,
  de:/^warum (?:leuchtet|fluoresziert) bernstein (?:unter (?:einer )?uv[- ](?:licht|lampe)|im uv[- ]licht)(?:,? und |[?.] )(?:was ändert tageslicht (?:bei|an) (?:diesem test|der prüfung)|wie beeinflusst tageslicht (?:den test|die prüfung))$/iu,
  en:/^why does amber (?:glow|fluoresce) (?:under|in) (?:a )?uv[- ](?:light|lamp|torch)(?:,? and |[?.] )(?:what does daylight change about (?:that|the|this) test|how does daylight affect (?:that|the|this) test)$/iu
};
const UV_FLUORESCENCE={
  da:'Nogle molekyler i rav optager energi fra UV-lyset og afgiver hurtigt en del af den som synligt lys. Det kaldes fluorescens.',
  de:'Bestimmte Moleküle im Bernstein nehmen Energie aus dem UV-Licht auf und geben einen Teil davon rasch als sichtbares Licht ab. Das nennt man Fluoreszenz.',
  en:'Some molecules in amber absorb energy from UV light and quickly release part of it as visible light. This is called fluorescence.'
};
const NAMED_EQUIPMENT={
  da:/^er (?:en|et) rav[- ]?[\p{L}\p{N}-]{0,35}(?:scanner|skanner|sensor|måler|apparat|instrument) et (?:rigtigt|reelt) (?:værktøj|redskab|instrument) til (?:at finde rav|ravjagt)$/iu,
  de:/^ist (?:ein|eine) bernstein[- ]?[\p{L}\p{N}-]{0,35}(?:scanner|sensor|messgerät|messer|instrument) ein (?:echtes|reales) (?:werkzeug|gerät|instrument) (?:zur bernsteinsuche|um bernstein zu finden)$/iu,
  en:/^is (?:an?|the) amber (?:(?!(?:and|or|but|with)\b)[\p{L}\p{N}-]{1,30} ){0,3}(?:scanner|sensor|gauge|meter|detector|instrument) a (?:real|actual) (?:tool|device|instrument) (?:for finding amber|for amber hunting|to find amber)$/iu
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
const BEACH_NET_REFERENTS={
  da:{pronoun:/\bden\b/iu,name:'en ravkese'},
  de:{pronoun:/\bihn\b/iu,name:'einen Bernsteinkescher'},
  en:{pronoun:/\bit\b/iu,name:'an amber net'},
};
function practicalBeachEquipmentHelp(text,language,referent=null){
  const parts=text.split(/,?\s+(?:og|und|and)\s+(?=(?:hvad|worauf|was|what)\b)|[?!.]\s+(?=(?:hvad|worauf|was|what)\b)/iu);
  const [use,precautions]=parts;
  const explicitUse=referent?use.replace(referent.pronoun,referent.name):use;
  if(parts.length>2||(referent&&(!precautions||explicitUse===use))
    ||!BEACH_EQUIPMENT_USE[language].test(explicitUse)
    ||(parts.length===2&&!GENERAL_PRECAUTIONS[language].test(precautions)))return null;
  const units=[localRavKnowledgeAnswer('Hvad er en kesse til ravjagt?',language),
    localRavKnowledgeAnswer('Hvordan leder jeg systematisk på stranden?',language)];
  if(units.some(unit=>typeof unit!=='string'||!unit))return null;
  const answer=units.join('\n\n');
  return answer.length<=900?{kind:'local-public-help',id:'beach-equipment',answer}:null;
}
function publicHelpText(question, language, contextualForm = null) {
  const raw = String(question || '').trim();
  if (!raw || raw.length > 600 || !['da', 'de', 'en'].includes(language)) return null;
  const text = raw.normalize('NFKC').replace(/\s+/gu, ' ').replace(/[?!.]{1,3}$/u, '');
  // A complete, authored followup may name its subject only through the established topic.
  // The English UI label hyphenates "water level". Use the usual scope guard
  // on the same words for these complete public questions.
  const scopeText = language === 'en' && FORMS['water-change'].en.test(text)
    ? text.replace(/\bwater-level\b/giu, 'water level') : raw;
  return contextualForm?.test(text) || routeRavQuestion(scopeText) !== 'fixed-refusal' ? text : null;
}

export function publicRavAssistantEquipmentFollowup(question,topic,language) {
  if(topic!=='public-knowledge:equipment.amber-net')return null;
  const text=publicHelpText(question,language);
  if(!text)return null;
  return practicalBeachEquipmentHelp(text,language,BEACH_NET_REFERENTS[language])?.answer??null;
}

const AMBER_BUBBLE_FORMS = {
  da: /^(?:hvad betyder (?:små )?(?:luft)?bobler i (?:et muligt ravfund|(?:et stykke )?rav)|kan (?:et stykke )?rav have (?:små )?(?:luft)?bobler|kan der være (?:små )?(?:luft)?bobler i (?:et stykke )?rav)$/iu,
  de: /^(?:was bedeuten (?:kleine )?(?:luft)?blasen in (?:einem möglichen bernsteinfund|bernstein)|kann bernstein (?:kleine )?(?:luft)?blasen (?:haben|enthalten)|können (?:kleine )?(?:luft)?blasen in bernstein vorkommen)$/iu,
  en: /^(?:what do (?:small )?(?:air )?bubbles in (?:a possible amber find|amber) mean|can amber (?:have|contain) (?:small )?(?:air )?bubbles|can there be (?:small )?(?:air )?bubbles in amber)$/iu,
};

// The observation, identification and gentle checks must all concern the same find.
const AMBER_BUBBLES_WITH_UV_FORMS = {
  da: /^jeg har fundet et (?:(?:gennemsigtigt|gennemskinneligt) )?stykke (?:ved vandet|på stranden)[.!] det (?:lyser|gløder) under uv(?:[- ]lys)?,? men har (?:små )?(?:luft)?bobler[.!] hvad (?:fortæller det mig|betyder det)(?:,? og hvilke skånsomme tjek kan jeg bruge(?: uden at beskadige det)?)?$/iu,
  de: /^ich habe (?:am strand|am wasser) ein (?:(?:durchsichtiges|durchscheinendes) )?stück gefunden,? das unter uv[- ]licht leuchtet und (?:kleine )?(?:luft)?blasen enthält[.!] kann es bernstein sein(?:,? und wie (?:prüfe|untersuche) ich es schonend(?:,? ohne es zu beschädigen)?)?$/iu,
  en: /^i (?:have )?found a (?:(?:translucent|transparent) )?piece (?:on the beach|by the water)[.!] it (?:glows|fluoresces) under uv(?:[- ]light)? and has (?:small )?(?:air )?bubbles[.!] (?:can|could) it be amber(?:,? and how can i (?:check|examine) it (?:gently|without damage|without damaging it))?$/iu,
};

function amberBubbleHelp(text, language) {
  const includesUv = AMBER_BUBBLES_WITH_UV_FORMS[language].test(text);
  if (!includesUv && !AMBER_BUBBLE_FORMS[language].test(text)) return null;

  const questions = ['Kan glas ligne rav?'];
  if (includesUv) questions.push('Kan UV bevise at rav er baltisk?', 'Skal jeg kombinere flere test af rav?');
  const units = questions.map(question => localRavKnowledgeAnswer(question, language));
  if (!units.every(Boolean)) return null;

  const answer = units.join('\n\n');
  return answer.length <= 900 ? {kind:'local-public-help', id:'amber-bubble-identification', answer} : null;
}

const FIND_IDENTIFICATION_FORMS = Object.freeze({
  da: {
    initial: /^jeg har fundet en (?:gul )?sten(?: med hvide striber)?[.!] hvordan (?:undersøger|tester) jeg den uden at ridse den,? og hvad (?:ville|kan) få dig til at tvivle på,? at den er rav[?!.]*$/iu,
    uvFollowup: /^(?:og )?hvad hvis (?:stenen|fundet|den) (?:næsten er |er (?:næsten )?)(?:gennemsigtig|gennemskinnelig)t?,? og uv[- ](?:lygten|lampen) (?:kun )?får den til at lyse svagt[?!.]*$/iu,
  },
  de: {
    initial: /^ich habe einen (?:gelben )?stein(?: mit weißen streifen)? gefunden[.!] wie (?:prüfe|untersuche) ich ihn ohne kratzer,? und welche (?:merkmale|hinweise) sprechen gegen bernstein[?!.]*$/iu,
    uvFollowup: /^(?:und )?was,? wenn (?:der stein|der fund|er) (?:fast )?(?:durchsichtig|durchscheinend) ist und (?:unter (?:der|einer) uv[- ]lampe|im uv[- ]licht) (?:nur )?schwach leuchtet[?!.]*$/iu,
  },
  en: {
    initial: /^(?:i found|i have found|i['’]ve found) a (?:yellow )?stone(?: with white stripes)?[.!] how (?:can|do) i (?:check|examine|test) it without scratching it,? and what would make you doubt (?:that )?it is amber[?!.]*$/iu,
    uvFollowup: /^(?:and )?what if (?:the stone|the find|it) is (?:almost |nearly )?(?:transparent|translucent) and (?:only )?(?:glows|fluoresces) (?:faintly|weakly) under (?:the )?uv[- ](?:light|lamp|torch)[?!.]*$/iu,
  },
});

const FIND_TOPIC = 'amber-find-identification';

export function publicRavAssistantFindTopic(question, language) {
  const text = publicHelpText(question, language);
  return text && FIND_IDENTIFICATION_FORMS[language].initial.test(text) ? FIND_TOPIC : null;
}

export function publicRavAssistantFindFollowup(question, topic, language) {
  if (topic !== FIND_TOPIC) return null;
  const text = publicHelpText(question, language);
  if (!text || !FIND_IDENTIFICATION_FORMS[language].uvFollowup.test(text)) return null;
  const fluorescence = localRavKnowledgeAnswer('Fluorescerer alt rav ens?', language);
  const transparency = localRavKnowledgeAnswer('Kan glas ligne rav?', language);
  return fluorescence && transparency ? fluorescence + '\n\n' + transparency : null;
}

// Den eksisterende bølgelængde-/mørkereferent identificerer UV-lampen.
// Hele spørgsmålet og de eksisterende sprog- og sikkerhedsgrænser bevares.
const UV_LAMP_DAYLIGHT_FOLLOWUP = Object.freeze({
  da:/^kan den (?:også )?bruges i dagslys(?:,? og hvorfor)?$/iu,
  de:/^kann man sie (?:auch )?bei tageslicht benutzen(?:,? und warum)?$/iu,
  en:/^can it (?:also )?be used in daylight(?:,? and why)?$/iu,
});
export function publicRavAssistantDaylightFollowup(question, topic, language) {
  if (topic !== 'public-knowledge:identification.uv-clue-not-proof') return null;
  const text = publicHelpText(question, language);
  return text && UV_LAMP_DAYLIGHT_FOLLOWUP[language].test(text) ? ANSWERS.daylight[language] : null;
}

const RAMAN_FLUORESCENCE_TOPIC='public-knowledge:raman-fluorescence';
const RAMAN_FLUORESCENCE_FORMS={
  da:/^(?:hvordan påvirker fluorescens raman[- ]spektroskopi (?:af|på) rav|hvordan kan fluorescens forstyrre et raman[- ]spektrum af rav)(?:(?:,? og |[?.] )hvilke begrænsninger (?:er der|er der stadig|har metoden))?$/iu,
  de:/^(?:welchen einfluss hat fluoreszenz auf die raman[- ]spektroskopie bei bernstein|wie (?:stört|beeinflusst) fluoreszenz ein raman[- ]spektrum von bernstein)(?:(?:,? und |[?.] )welche grenzen (?:bleiben|hat die methode))?$/iu,
  en:/^how does fluorescence (?:affect|interfere with) raman[- ]spectroscopy (?:of|for|on) amber(?:(?:,? and |[?.] )what limitations (?:remain|does (?:it|the method) have))?$/iu,
};
const RAMAN_FLUORESCENCE_FOLLOWUP={
  da:/^(?:først fluorescensen|hvad med fluorescensen|hvordan kan (?:man|jeg) mindske den forstyrrelse)$/iu,
  de:/^(?:zuerst die fluoreszenz|was ist mit der fluoreszenz|wie kann man diese störung (?:reduzieren|verringern))$/iu,
  en:/^(?:the fluorescence first|first,? the fluorescence|what about the fluorescence|how can (?:you|we) reduce that interference)$/iu,
};
// Edwards et al., https://pubmed.ncbi.nlm.nih.gov/17320468/
// Baltic amber comparison, https://pubmed.ncbi.nlm.nih.gov/40572580/
const RAMAN_FLUORESCENCE={
  da:{
    effect:'Fluorescens fra ravet kan danne en bred lysbaggrund, der skjuler svage Raman-toppe. I laboratoriet kan man i nogle tilfælde mindske baggrunden ved at vælge en anden laserbølgelængde, for eksempel i det nærinfrarøde. Det afhænger af prøven og udstyret.',
    limit:'Raman-spektret giver spor om ravets kemi. Naturlig variation, forvitring og behandling kan give signaler, der er svære at skelne. Ét spektrum kan ikke alene fastslå en præcis alder eller et bestemt forvitringsstadium. En faglig vurdering kan sammenholde flere spektre med FTIR og prøvens geologiske sammenhæng.',
  },
  de:{
    effect:'Fluoreszenz des Bernsteins kann einen breiten Untergrund erzeugen und schwache Raman-Banden überdecken. Eine andere Anregungswellenlänge, etwa im nahen Infrarot, kann den Untergrund in manchen Fällen verringern. Das hängt von der Probe und vom Gerät ab.',
    limit:'Das Raman-Spektrum gibt Hinweise auf die Chemie des Bernsteins. Natürliche Unterschiede, Verwitterung und Behandlung können ähnliche Signale erzeugen. Ein einzelnes Spektrum bestimmt weder das genaue Alter noch den Verwitterungszustand eindeutig. Fachleute können Vergleichsspektren, FTIR und den geologischen Kontext heranziehen.',
  },
  en:{
    effect:'Fluorescence from amber can create a broad background that obscures weak Raman bands. A different excitation wavelength, such as near-infrared light, can sometimes reduce that background. It depends on the specimen and the instrument.',
    limit:'Raman spectra give clues to amber chemistry. Natural variation, weathering and treatment can produce signals that are hard to tell apart. One spectrum alone cannot establish an exact age or a clear weathering stage. Specialists can compare spectra and use FTIR alongside the specimen’s geological context.',
  },
};

export function publicRavAssistantHelp(question,language,previousTopic=null){
  const raw=String(question||'').trim();
  const ramanFollowupForm=previousTopic===RAMAN_FLUORESCENCE_TOPIC?RAMAN_FLUORESCENCE_FOLLOWUP[language]:null;
  const sandbarFollowupForm=previousTopic===SANDBAR_TRANSPORT_TOPIC?SANDBAR_SURFACE_FOLLOWUP[language]:null;
  const text=publicHelpText(raw,language,ramanFollowupForm??sandbarFollowupForm);
  if(!text)return null;
  const ramanQuestion=RAMAN_FLUORESCENCE_FORMS[language].test(text);
  const ramanFollowup=ramanFollowupForm?.test(text);
  if(ramanQuestion||ramanFollowup){
    const {effect,limit}=RAMAN_FLUORESCENCE[language];
    return {kind:'local-public-help',id:'raman-fluorescence',topic:RAMAN_FLUORESCENCE_TOPIC,
      answer:ramanQuestion?effect+'\n\n'+limit:effect};
  }
  if(sandbarFollowupForm?.test(text)){
    return {kind:'local-public-help',id:'sandbar-transport',topic:SANDBAR_TRANSPORT_TOPIC,
      answer:SANDBAR_SURFACE_CLUES[language]};
  }
  const bubbles=amberBubbleHelp(text,language);
  if(bubbles)return bubbles;
  const practical=practicalBeachEquipmentHelp(text,language);
  if(practical)return practical;
  if(UV_FLUORESCENCE_DAYLIGHT[language].test(text)){
    return {kind:'local-public-help',id:'fluorescence-daylight',
      answer:UV_FLUORESCENCE[language]+'\n\n'+ANSWERS.daylight[language]};
  }
  let id=Object.keys(FORMS).find(key=>FORMS[key][language].test(text));
  if(!id&&WATER[language].test(text))id='water';
  if(!id&&(UV_DAYLIGHT[language].test(text)||UV_IDENTIFICATION_DAYLIGHT[language].test(text)))id='daylight';
  if(!id&&NAMED_EQUIPMENT[language].test(text))id='named-equipment';
  const term=COMPOUND[language].exec(text)?.[1];
  if(!id&&term&&!KNOWN_COMPOUNDS.test(term)&&classifyRavQuestion(raw)==='origin')id='compound';
  if(!id)return null;
  const answer=id==='origin-age'?t('assistant.local.origin',{},language):ANSWERS[id][language];
  return {kind:'local-public-help',id,answer,...(id==='sandbar-transport'?{topic:SANDBAR_TRANSPORT_TOPIC}:{})};
}
