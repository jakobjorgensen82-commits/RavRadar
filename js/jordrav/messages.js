import { registerI18nMessages } from '../i18n.js?v=4.0.541';
import { LANDSCAPES } from './landscape-context.js';

const da = {
  title:'Jordrav – geologiske muligheder | RavRadar', description:'Udforsk geologiske muligheder for jordrav i Danmark med jordarter, landskabsdannelse og luftfoto.',
  brandLine:'Rav i landskabet', navigation:'Kortvisning', coastTab:'Kystprognose', landTab:'Jordrav', eyebrow:'Danmarks geologiske muligheder', heading:'Hvor kan landskabet gemme på rav?',
  intro:'Udforsk mulige transportveje, omlejring og aflejringer. Vælg farver efter geologisk potentiale eller jagtbarhed. Sikkerhed og dybde forklares hver for sig.', prototype:'Forskningsprototype · 0.2', mapTitle:'Jordravkort over Danmark', baseMap:'Baggrundskort', street:'Almindeligt kort', aerial:'Luftfoto', denmark:'Hele Danmark', overlay:'Vis geologiske lag', opacity:'Farvestyrke',
  enhanced:'Forhøjet procespotentiale', possible:'Muligt potentiale', limited:'Begrænset ved overfladen', unresolved:'Uafklaret', loading:'Indlæser geologisk overblik…', overview:'Generaliseret Danmarksoverblik. Zoom ind eller klik for at undersøge jordart og landskabsproces.', loadingDetail:'Indlæser lokale jordarter…', detail:'Lokale detaljer. Klik på en flade for at se begrundelse, sikkerhed og dybde.', zoomMore:'Zoom lidt mere ind for at hente detaljer til hele kortudsnittet.', failed:'Geologidata kunne ikke indlæses. Genindlæs siden for at prøve igen.', detailFailed:'Lokale detaljer kunne ikke hentes. Danmarksoverblikket vises; flyt kortet eller prøv igen.', baseFailed:'Nogle baggrundsfliser kunne ikke hentes. Prøv det andet baggrundskort.',
  selectTitle:'Følg en geologisk mulighed', selectHelp:'Zoom ind og klik på en farvet flade. Her kan du se jordarten, den mulige transportkæde, dybde og kilder.', confidenceTitle:'Ravspecifik sikkerhed: svag', methodNote:'Kortene viser materialer og processer. Vi udleder ravmuligheder uden at kræve tidligere fund. Tilførsel af rav til det enkelte område er endnu ikke verificeret.', method:'Sådan udledes mulighederne', footer:'Foreløbig geologisk model 0.2.0 · Jordravkortet beregner ikke RavScore eller vejrprognoser.',
  selected:'Vurdering på valgt sted', basis:'Jordartsgrundlag', newBasis:'Kortlagt materiale · 1:25.000', oldBasis:'Groft supplement · 1:200.000', surface:'Øvre kortlagte aflejring', depth:'Omkring én meters dybde', depthMissing:'Ikke særskilt beskrevet i det ældre kort', landscape:'Landskabsproces', access:'Overfladerelevans', nearSurface:'Kortet viser samme jordart i symbolfelterne. Det dokumenterer ikke rav i pløjelaget eller aktuel blotlægning.', layered:'Kortet angiver forskellige aflejringer inden for den øverste meter. Dæklagets præcise tykkelse og forbindelsen til pløjelaget er ukendt.', covered:'Flyvesand eller organisk materiale kan dække eller omlejre ældre sedimenter. Fundbarhed på jordoverfladen er uafklaret.', unknownDepth:'Overfladerelevansen kan ikke fastlægges fra dette materialegrundlag.', inference:'Mulig ravhistorie', uncertainty:'Hvad vurderingen ikke afklarer', uncertaintyBody:'Tilførsel, ravmængde og lokal bevaring er ukendte. Grænserne er geologiske kortgrænser, ikke matrikelgrænser eller præcise fundsteder.', original:'Originale GEUS-feltværdier', sources:'Kilder', landscapeMissing:'Landskabsproces ikke kortlagt her', sourceGap:'Intet materialekort på stedet; uafklaret', hypothesis:'Egen geologisk hypotese · model 0.2.0',
  materialGlacialCoarse:'Smeltevandssand / grus', materialGlacialFine:'Fint eller vekslende glacialt sediment', materialTill:'Moræne', materialMarineCoarse:'Marint sand / grus', materialMarineFine:'Fint eller organisk marint sediment', materialFreshCoarse:'Ferskvands- eller deltasand / grus', materialFreshFine:'Fint ferskvandssediment', materialOrganic:'Tørv / gytje', materialAeolian:'Flyvesand / klitsand', materialOlder:'Ældre sediment / mulig omlejringskilde', materialRock:'Fast bjergart / kalk', materialCoarse:'Sand / grus, oprindelse ikke bestemt', materialMixed:'Blandet materiale', materialUnresolved:'Ikke vurderbart materiale',
  processMeltwater:'Smeltevandsaflejring og sortering', processErosion:'Erosion og transport gennem en dal', processPushed:'Mulig opskubning og omlejring ved isrand', processOlderTill:'Ældre glacialt landskab, mulig gentagen omlejring', processMarine:'Tidligere marint aflejringsmiljø', processShore:'Bølgeomlejring og strandvoldsdannelse', processBasin:'Muligt modtagerbassin / delta', processCover:'Yngre dæklag eller organisk bassin', processTill:'Glacial transport og blanding', processRock:'Fast bjergart / strukturelt landskab', processUnresolved:'Ikke et vurderbart markravmiljø', processMissing:'Landskabsproces mangler',
  reasonEnhanced:'Kompatibelt sand/grus i et kortlagt transport- eller sorteringsmiljø giver en relativt stærkere mulighed for omlejret rav. Det er en proceshypotese; en ravførende tilførselsvej er ikke lokalt påvist.', reasonPossible:'Sedimentet kan indgå i transport eller gentagen omlejring af rav. Koncentration og lokal tilførsel er ikke tilstrækkeligt belyst til en stærkere vurdering.', reasonLimited:'Den kortlagte faste bjergart giver begrænset støtte til en overfladenær kæde af løse, omlejrede sedimenter. Små yngre lommer og dæklag kan være udeladt af kortet.', reasonUnresolved:'Datagrundlaget kan ikke bruges til en naturlig, overfladenær markravvurdering her. Uafklaret er ikke lavt ravpotentiale.',
  methodBody:'Potentialet udledes af jordart ved overfladen og det kortlagte landskabs aflejrings- eller erosionsproces. Forhøjet betyder relativt procespotentiale, ikke større dokumenteret ravmængde. Alle ravslutninger i denne første prototype har svag sikkerhed.', methodCover:'Jordartssymbolerne beskriver geologiske aflejringer inden for den øverste meter, under det bearbejdede muldlag. Kortet måler ikke rav eller dæklagstykkelse i pløjelaget.', methodChronology:'Israndslinjer har ikke indgået i klassereglen. Overlap mellem forskellige istider giver ingen bonus. Gentagen omlejring er en mulighed, som kræver regional kronologi for at blive bekræftet.', methodScale:'Overblikket er forenklet ved 100 m; lokale flader ved 20 m med fælles grænser. Jordartsgrænser har yderligere kildeusikkerhed: typisk 50–100 m i det nye kort og omkring 200 m eller mere i det ældre.', methodOld:'Det nyere kort har forrang. Det ældre bruges kun i ukendte X-områder og geografiske huller og beholder sin grovere kildeangivelse.', methodFinds:'Tidligere ravfund er ikke et adgangskrav til potentiale. Litteraturen underbygger mulige mekanismer; den er ikke direkte funddokumentation for hver farvet flade.'
};
const en = {
  title:'Land amber – geological possibilities | RavRadar', description:'Explore geological possibilities for inland amber in Denmark with soils, landforms and aerial imagery.', brandLine:'Amber in the landscape', navigation:'Map view', coastTab:'Coastal forecast', landTab:'Land amber', eyebrow:'Denmark’s geological possibilities', heading:'Where might the landscape hold amber?', intro:'Explore possible transport, reworking and deposits. Choose colours by geological potential or hunting accessibility. Confidence and depth are explained separately.', prototype:'Research prototype · 0.2', mapTitle:'Denmark inland amber map', baseMap:'Background map', street:'Standard map', aerial:'Aerial imagery', denmark:'All Denmark', overlay:'Show geological layers', opacity:'Colour strength', enhanced:'Enhanced process potential', possible:'Possible potential', limited:'Limited near the surface', unresolved:'Unresolved', loading:'Loading geological overview…', overview:'Generalised national overview. Zoom in or click to explore materials and landform processes.', loadingDetail:'Loading local materials…', detail:'Local details. Click a polygon for its reasoning, confidence and depth.', zoomMore:'Zoom in further to load details for the entire view.', failed:'Geological data could not be loaded. Reload the page to try again.', detailFailed:'Local details could not be loaded. The national overview remains visible; move the map or try again.', baseFailed:'Some background tiles could not be loaded. Try the other background map.', selectTitle:'Follow a geological possibility', selectHelp:'Zoom in and click a coloured polygon to see the material, possible transport history, depth and sources.', confidenceTitle:'Amber-specific confidence: weak', methodNote:'The maps describe materials and processes. Amber possibilities are inferred without requiring past finds. Amber supply to each area has not been verified.', method:'How possibilities are inferred', footer:'Provisional geological model 0.2.0 · This map does not calculate AmberScore or weather forecasts.', selected:'Assessment at the selected location', basis:'Material mapping', newBasis:'Mapped material · 1:25,000', oldBasis:'Coarse supplement · 1:200,000', surface:'Upper mapped deposit', depth:'At approximately one metre', depthMissing:'Not separately described in the older map', landscape:'Landform process', access:'Surface relevance', nearSurface:'The map shows the same material in both symbol fields. It does not establish amber in the plough zone or current exposure.', layered:'The map indicates different deposits within the top metre. Exact cover thickness and connection to the plough zone are unknown.', covered:'Wind-blown sand or organic deposits may cover or rework older material. Findability at the ground surface is unresolved.', unknownDepth:'Surface relevance cannot be established from these material data.', inference:'Possible amber history', uncertainty:'What remains unresolved', uncertaintyBody:'Supply, amber quantity and local preservation are unknown. Boundaries are geological mapping boundaries, not property boundaries or precise find locations.', original:'Original GEUS field values', sources:'Sources', landscapeMissing:'Landform process not mapped here', sourceGap:'No material mapping at this location; unresolved', hypothesis:'Geological hypothesis · model 0.2.0', materialGlacialCoarse:'Meltwater sand / gravel', materialGlacialFine:'Fine or alternating glacial sediment', materialTill:'Till', materialMarineCoarse:'Marine sand / gravel', materialMarineFine:'Fine or organic marine sediment', materialFreshCoarse:'Freshwater / delta sand and gravel', materialFreshFine:'Fine freshwater sediment', materialOrganic:'Peat / gyttja', materialAeolian:'Wind-blown / dune sand', materialOlder:'Older sediment / possible source for reworking', materialRock:'Bedrock / chalk', materialCoarse:'Sand / gravel, origin unspecified', materialMixed:'Mixed material', materialUnresolved:'Unassessable material', processMeltwater:'Meltwater deposition and sorting', processErosion:'Erosion and transport through a valley', processPushed:'Possible ice-margin thrusting and reworking', processOlderTill:'Older glacial landscape, possible repeated reworking', processMarine:'Former marine depositional environment', processShore:'Wave reworking and beach-ridge formation', processBasin:'Possible receiving basin / delta', processCover:'Younger cover or organic basin', processTill:'Glacial transport and mixing', processRock:'Bedrock / structural landscape', processUnresolved:'Environment outside this field-amber assessment', processMissing:'Landform process missing', reasonEnhanced:'Compatible sand/gravel in a mapped transport or sorting environment gives a relatively stronger possibility of reworked amber. This is a process hypothesis; a local amber-bearing supply route has not been demonstrated.', reasonPossible:'The sediment may participate in amber transport or repeated reworking. Concentration and local supply are insufficiently understood for a stronger assessment.', reasonLimited:'Mapped bedrock gives limited support for a near-surface sequence of loose reworked deposits. Small younger pockets and covers may be omitted from the map.', reasonUnresolved:'The available data do not support a natural near-surface field-amber assessment here. Unresolved does not mean low amber potential.', methodBody:'Potential is inferred from surface material and the mapped landform’s depositional or erosional process. Enhanced means relative process potential, not a greater documented amber quantity. All amber inferences in this initial prototype have weak confidence.', methodCover:'Material symbols describe geological deposits within the top metre, below the worked topsoil. The map does not measure amber or cover thickness in the plough zone.', methodChronology:'Ice-margin lines are not used in the classification. Overlap between different glaciations earns no bonus. Repeated reworking needs regional chronology to be confirmed.', methodScale:'The overview is simplified at 100 m and local polygons at 20 m with shared boundaries. Source boundary uncertainty adds typically 50–100 m for the newer material map and around 200 m or more for the older map.', methodOld:'The newer map takes priority. The older map supplements unknown X areas and geographical gaps, retaining its coarser source attribution.', methodFinds:'Previous amber finds are not required for potential. Literature supports possible mechanisms, not direct amber evidence for each coloured polygon.'
};
const de = {
  ...en, title:'Landbernstein – geologische Möglichkeiten | RavRadar', description:'Geologische Möglichkeiten für Bernstein im dänischen Binnenland mit Bodenarten, Landschaftsformen und Luftbildern.', brandLine:'Bernstein in der Landschaft', navigation:'Kartenansicht', coastTab:'Küstenprognose', landTab:'Landbernstein', eyebrow:'Dänemarks geologische Möglichkeiten', heading:'Wo könnte die Landschaft Bernstein bergen?', intro:'Erkunden Sie mögliche Transportwege, Umlagerung und Ablagerungen. Wählen Sie Farben nach geologischem Potenzial oder Zugänglichkeit. Sicherheit und Tiefe werden getrennt erklärt.', prototype:'Forschungsprototyp · 0.2', mapTitle:'Karte für Landbernstein in Dänemark', baseMap:'Hintergrundkarte', street:'Normale Karte', aerial:'Luftbild', denmark:'Ganz Dänemark', overlay:'Geologische Schichten anzeigen', opacity:'Farbstärke', enhanced:'Erhöhtes Prozesspotenzial', possible:'Mögliches Potenzial', limited:'An der Oberfläche begrenzt', unresolved:'Ungeklärt', loading:'Geologische Übersicht wird geladen…', overview:'Generalisierte Landesübersicht. Vergrößern oder anklicken, um Material und Landschaftsprozesse zu untersuchen.', loadingDetail:'Lokale Bodenarten werden geladen…', detail:'Lokale Details. Eine Fläche anklicken, um Begründung, Sicherheit und Tiefe zu sehen.', zoomMore:'Weiter vergrößern, um Details für den gesamten Ausschnitt zu laden.', failed:'Geologische Daten konnten nicht geladen werden. Bitte die Seite neu laden.', detailFailed:'Lokale Details konnten nicht geladen werden. Die Landesübersicht bleibt sichtbar; Karte bewegen oder erneut versuchen.', baseFailed:'Einige Hintergrundkacheln fehlen. Versuchen Sie die andere Hintergrundkarte.', selectTitle:'Einer geologischen Möglichkeit folgen', selectHelp:'Vergrößern und eine farbige Fläche anklicken. Hier erscheinen Material, mögliche Transportkette, Tiefe und Quellen.', confidenceTitle:'Bernsteinspezifische Sicherheit: schwach', methodNote:'Die Karten beschreiben Material und Prozesse. Möglichkeiten werden ohne vorausgesetzte Funde abgeleitet. Die Bernsteinzufuhr zu einzelnen Gebieten wurde noch nicht bestätigt.', method:'Wie die Möglichkeiten abgeleitet werden', footer:'Vorläufiges geologisches Modell 0.2.0 · Diese Karte berechnet weder BernsteinScore noch Wetterprognosen.', selected:'Bewertung am ausgewählten Ort', basis:'Materialkartierung', newBasis:'Kartiertes Material · 1:25.000', oldBasis:'Grobe Ergänzung · 1:200.000', surface:'Obere kartierte Ablagerung', depth:'In etwa einem Meter Tiefe', depthMissing:'In der älteren Karte nicht gesondert beschrieben', landscape:'Landschaftsprozess', access:'Oberflächenrelevanz', nearSurface:'Die Karte zeigt in beiden Symbolfeldern dasselbe Material. Bernstein im Pflughorizont oder heutige Freilegung sind damit nicht belegt.', layered:'Die Karte zeigt unterschiedliche Ablagerungen im obersten Meter. Genaue Deckschichtdicke und Verbindung zum Pflughorizont sind unbekannt.', covered:'Flugsand oder organische Ablagerungen können älteres Material bedecken oder umlagern. Die Findbarkeit an der Erdoberfläche ist ungeklärt.', unknownDepth:'Die Oberflächenrelevanz lässt sich aus diesen Materialdaten nicht bestimmen.', inference:'Mögliche Bernsteingeschichte', uncertainty:'Was ungeklärt bleibt', uncertaintyBody:'Zufuhr, Bernsteinmenge und örtliche Erhaltung sind unbekannt. Grenzen sind geologische Kartierungsgrenzen, keine Grundstücksgrenzen oder genauen Fundorte.', original:'Originale GEUS-Feldwerte', sources:'Quellen', landscapeMissing:'Landschaftsprozess hier nicht kartiert', sourceGap:'Keine Materialkartierung am Ort; ungeklärt', hypothesis:'Geologische Hypothese · Modell 0.2.0', materialGlacialCoarse:'Schmelzwassersand / Kies', materialGlacialFine:'Feines oder wechselndes glaziales Sediment', materialTill:'Moräne', materialMarineCoarse:'Meeressand / Kies', materialMarineFine:'Feines oder organisches Meeressediment', materialFreshCoarse:'Süßwasser- / Deltasand und Kies', materialFreshFine:'Feines Süßwassersediment', materialOrganic:'Torf / Mudde', materialAeolian:'Flugsand / Dünensand', materialOlder:'Älteres Sediment / mögliche Umlagerungsquelle', materialRock:'Festgestein / Kalk', materialCoarse:'Sand / Kies, Herkunft unbestimmt', materialMixed:'Gemischtes Material', materialUnresolved:'Nicht bewertbares Material', processMeltwater:'Schmelzwasserablagerung und Sortierung', processErosion:'Erosion und Transport durch ein Tal', processPushed:'Mögliche Aufschiebung und Umlagerung am Eisrand', processOlderTill:'Ältere glaziale Landschaft, mögliche wiederholte Umlagerung', processMarine:'Früheres marines Ablagerungsmilieu', processShore:'Wellenumlagerung und Strandwallbildung', processBasin:'Mögliches Aufnahmebecken / Delta', processCover:'Jüngere Deckschicht oder organisches Becken', processTill:'Glazialer Transport und Mischung', processRock:'Festgestein / strukturelle Landschaft', processUnresolved:'Umfeld außerhalb dieser Feldbernsteinbewertung', processMissing:'Landschaftsprozess fehlt', reasonEnhanced:'Passender Sand/Kies in einem kartierten Transport- oder Sortierungsumfeld bietet eine relativ stärkere Möglichkeit für umgelagerten Bernstein. Dies ist eine Prozesshypothese; eine örtliche bernsteinführende Zufuhr ist nicht nachgewiesen.', reasonPossible:'Das Sediment kann an Transport oder wiederholter Umlagerung beteiligt sein. Konzentration und örtliche Zufuhr sind für eine stärkere Bewertung nicht ausreichend geklärt.', reasonLimited:'Kartiertes Festgestein bietet begrenzte Unterstützung für eine oberflächennahe Folge lockerer umgelagerter Sedimente. Kleine jüngere Taschen und Deckschichten können in der Karte fehlen.', reasonUnresolved:'Die Daten erlauben hier keine natürliche oberflächennahe Feldbernsteinbewertung. Ungeklärt bedeutet nicht geringes Bernsteinpotenzial.', methodBody:'Das Potenzial folgt aus dem Oberflächenmaterial und dem kartierten Ablagerungs- oder Erosionsprozess. Erhöht bezeichnet relatives Prozesspotenzial, keine größere nachgewiesene Bernsteinmenge. Alle Bernsteinschlüsse dieses Prototyps haben schwache Sicherheit.', methodCover:'Materialsymbole beschreiben geologische Ablagerungen im obersten Meter, unter dem bearbeiteten Oberboden. Die Karte misst weder Bernstein noch Deckschichtdicke im Pflughorizont.', methodChronology:'Eisrandlinien gehen nicht in die Klassifizierung ein. Überlappungen verschiedener Eiszeiten geben keinen Bonus. Wiederholte Umlagerung braucht regionale Chronologie zur Bestätigung.', methodScale:'Die Übersicht wird bei 100 m und lokale Flächen bei 20 m mit gemeinsamen Grenzen vereinfacht. Dazu kommt Quellenunsicherheit: meist 50–100 m bei der neueren Materialkarte, etwa 200 m oder mehr bei der älteren.', methodOld:'Die neuere Karte hat Vorrang. Die ältere ergänzt unbekannte X-Gebiete und geografische Lücken und behält ihre gröbere Quellenangabe.', methodFinds:'Frühere Bernsteinfunde sind keine Voraussetzung für Potenzial. Literatur stützt mögliche Mechanismen, nicht direkte Bernsteinbelege für jede farbige Fläche.'
};
registerI18nMessages(Object.fromEntries(Object.entries({da, de, en}).map(([lang, entries]) =>
  [lang, Object.fromEntries(Object.entries(entries).map(([key, value]) => [`jordrav.${key}`, value]))])));
export const messageKeys = Object.keys(da);
registerI18nMessages({
  da:{'jordrav.materialGlacialBasinCoarse':'Issøsand / grus','jordrav.aerialSource':'World Imagery: luft- og satellitbilleder fra forskellige år.'},
  de:{'jordrav.materialGlacialBasinCoarse':'Eisstauseesand / Kies','jordrav.aerialSource':'World Imagery: Luft- und Satellitenbilder aus verschiedenen Jahren.'},
  en:{'jordrav.materialGlacialBasinCoarse':'Glacial lake sand / gravel','jordrav.aerialSource':'World Imagery: aerial and satellite imagery from different years.'}
});
messageKeys.push('materialGlacialBasinCoarse','aerialSource');
const stories={
  da:{
    storyGlacialCoarse:'En mulig kæde er, at is eller smeltevand frigør rav fra ældre sedimenter og flytter det videre med sand, grus og organisk letmateriale. Lokale lag og strømskift kan give steder, hvor det omlejrede materiale samles.',
    storyGlacialBasinCoarse:'Sand og grus i et tidligere issøbassin kan modtage materiale fra smeltevand og eroderede ældre lag. En mulig ravvej følger tilførsel til bassinet og aflejring i lokale lag.',
    storyGlacialFine:'Fine eller vekslende glaciale lag kan være modtagere for omlejret rav og organisk materiale. De historiske beskrivelser af rav i yngre ferskvandsler gør lag og bassinrande relevante at undersøge.',
    storyTill:'Isen kan optage ældre sedimenter og sprede eller flytte dem som lagpakker i morænen. Muligheden ligger i den omlejrede blanding og lokale indslag; koncentrationen kan variere meget inden for samme moræneflade.',
    storyMarineCoarse:'En mulig ravvej går fra ældre sedimenter gennem havets transport og ind i sandede eller grusede aflejringer. Gamle kystmiljøer kan have modtaget og omlejret materialet flere gange.',
    storyMarineFine:'Fint marint sediment kan være et modtagerlag i en længere omlejringskæde. Sandede indslag og lagkontakter kan være interessante forbindelser til materiale, der er tilført fra ældre aflejringer.',
    storyFreshCoarse:'Vandløb kan erodere ældre sedimenter og flytte rav videre til sandlag, gruslag eller et delta. Den kortlagte dal eller bassin kan derfor være en mulig modtager i en lokal sedimentkæde.',
    storyFreshFine:'Et ferskt bassin kan modtage materiale, som vand har frigjort fra ældre lag. Ravbeskrivelser fra yngre danske leraflejringer støtter muligheden for denne form for genaflejring.',
    storyOrganic:'Tørv og gytje kan ligge over et ældre sedimentlager eller rumme senere tilført materiale. En mulighed for jordrav afhænger her især af kontakten til ældre lag og den aktuelle overfladerelevans.',
    storyAeolian:'Flyvesand kan dække et ældre muligt lager. Senere erosion, blanding eller blotlagte lagkontakter kan skabe en forbindelse mellem det begravede materiale og jordoverfladen.',
    storyOlder:'Ældre sedimenter kan være et tilførselsled, hvis erosion eller isens omlejring har flyttet relevante dele videre. Den konkrete oprindelse, lagtype og senere historie afgør, hvor interessant forbindelsen er.',
    storyRock:'Muligheder på et område med fast bjergart vil især være knyttet til yngre sedimentlommer eller dæklag. Sådanne små forekomster kan være under kortets detaljeringsniveau.',
    storyCoarse:'Sand og grus giver et muligt værtsmateriale for omlejring. Landskabsprocessen kan hjælpe med at undersøge, hvor materialet kan være kommet fra, og hvor det kan være aflejret igen.',
    storyMixed:'Den kortlagte blanding rummer flere mulige værtsmaterialer. Lagkontakter og lokale aflejringsmiljøer kan være interessante, mens kortet giver begrænset viden om rækkefølge og koncentration.',
    storyUnresolved:'Dette område kræver et mere præcist materialegrundlag for at udlede en lokal sedimentkæde.',
    cardConfidence:'Kortlagt materiale og proces støtter hypotesen. Lokal ravtilførsel og bevaring er uafklaret.'
  },
  en:{
    storyGlacialCoarse:'One possible chain is that ice or meltwater releases amber from older sediments and transports it with sand, gravel and light organic material. Local beds and changes in flow may provide places where reworked material accumulates.',
    storyGlacialBasinCoarse:'Sand and gravel in a former ice-dammed lake can receive material from meltwater and eroded older beds. A possible amber route follows supply to the basin and deposition in local layers.',
    storyGlacialFine:'Fine or alternating glacial layers can receive reworked amber and organic material. Historical descriptions of amber in younger freshwater clay make beds and basin margins relevant to examine.',
    storyTill:'Ice can incorporate older sediments and disperse or move them as packages within till. The possibility lies in this reworked mixture and local interbeds; concentration may vary substantially across one mapped till plain.',
    storyMarineCoarse:'A possible amber route leads from older sediments through marine transport into sandy or gravelly deposits. Former coastal environments may have received and reworked this material repeatedly.',
    storyMarineFine:'Fine marine sediment can be a receiving layer in a longer reworking chain. Sandy interbeds and layer contacts may connect to material supplied from older deposits.',
    storyFreshCoarse:'Streams can erode older sediment and transport amber into sand beds, gravel or a delta. A mapped valley or basin can therefore be a possible receiver in a local sediment chain.',
    storyFreshFine:'A freshwater basin can receive material released by water from older layers. Amber descriptions from younger Danish clay deposits support the possibility of this type of redeposition.',
    storyOrganic:'Peat and gyttja may overlie an older sediment reservoir or contain material supplied later. The possibility of land amber particularly depends on contact with older beds and current surface relevance.',
    storyAeolian:'Wind-blown sand may cover an older possible reservoir. Later erosion, mixing or exposed layer contacts can connect buried material with the ground surface.',
    storyOlder:'Older sediment can supply material if erosion or glacial reworking has transported relevant parts onward. Its origin, bed type and subsequent history determine how interesting that connection is.',
    storyRock:'Possibilities in bedrock areas mainly relate to younger sediment pockets or cover. Such small deposits may be below the map’s detail level.',
    storyCoarse:'Sand and gravel provide a possible host for reworking. The landform process can help investigate where material may have originated and where it may have been deposited again.',
    storyMixed:'The mapped mixture contains several possible host materials. Layer contacts and local depositional environments can be interesting, while the map gives limited information on sequence and concentration.',
    storyUnresolved:'A more specific material basis is needed to infer a local sediment chain here.',
    cardConfidence:'Mapped material and process support the hypothesis. Local amber supply and preservation remain unresolved.'
  },
  de:{
    storyGlacialCoarse:'Eine mögliche Kette beginnt damit, dass Eis oder Schmelzwasser Bernstein aus älteren Sedimenten freisetzt und mit Sand, Kies und leichtem organischem Material weitertransportiert. Lokale Schichten und wechselnde Strömung können Umlagerungsmaterial sammeln.',
    storyGlacialBasinCoarse:'Sand und Kies eines früheren Eisstausees können Material aus Schmelzwasser und erodierten älteren Schichten aufnehmen. Eine mögliche Bernsteinroute folgt der Zufuhr ins Becken und Ablagerung in lokalen Schichten.',
    storyGlacialFine:'Feine oder wechselnde glaziale Schichten können umgelagerten Bernstein und organisches Material aufnehmen. Historische Bernsteinbeschreibungen in jüngerem Süßwasserlehm machen Schichten und Beckenränder interessant.',
    storyTill:'Eis kann ältere Sedimente aufnehmen und als Schichtpakete in Moränen verteilen oder verschieben. Die Möglichkeit liegt in dieser umgelagerten Mischung und lokalen Einschaltungen; Konzentration kann innerhalb derselben Moränenfläche stark schwanken.',
    storyMarineCoarse:'Eine mögliche Bernsteinroute führt aus älteren Sedimenten über Meertransport in sandige oder kiesige Ablagerungen. Frühere Küstenmilieus können dieses Material wiederholt aufgenommen und umgelagert haben.',
    storyMarineFine:'Feines Meeressediment kann eine aufnehmende Schicht einer längeren Umlagerungskette sein. Sandige Einschaltungen und Schichtkontakte können zu Material aus älteren Ablagerungen führen.',
    storyFreshCoarse:'Bäche und Flüsse können ältere Sedimente erodieren und Bernstein in Sand-, Kieslagen oder ein Delta transportieren. Ein kartiertes Tal oder Becken kann damit ein möglicher Empfänger einer lokalen Sedimentkette sein.',
    storyFreshFine:'Ein Süßwasserbecken kann Material aufnehmen, das Wasser aus älteren Schichten freigesetzt hat. Bernsteinbeschreibungen aus jüngeren dänischen Tonablagerungen stützen diese Möglichkeit der Wiederablagerung.',
    storyOrganic:'Torf und Mudde können über einem älteren Sedimentlager liegen oder später zugeführtes Material enthalten. Möglichkeiten für Landbernstein hängen besonders vom Kontakt zu älteren Schichten und der heutigen Oberflächenrelevanz ab.',
    storyAeolian:'Flugsand kann ein älteres mögliches Lager bedecken. Spätere Erosion, Mischung oder freigelegte Schichtkontakte können begrabenes Material mit der Erdoberfläche verbinden.',
    storyOlder:'Ältere Sedimente können Material liefern, wenn Erosion oder glaziale Umlagerung relevante Teile weitertransportiert haben. Herkunft, Schichttyp und spätere Geschichte bestimmen die Bedeutung dieser Verbindung.',
    storyRock:'Möglichkeiten in Festgesteinsgebieten betreffen vor allem jüngere Sedimenttaschen oder Deckschichten. Kleine Vorkommen können unterhalb des Kartendetails liegen.',
    storyCoarse:'Sand und Kies bieten mögliches Wirtsmaterial für Umlagerung. Der Landschaftsprozess hilft zu untersuchen, woher Material stammen und wo es wieder abgelagert worden sein könnte.',
    storyMixed:'Die kartierte Mischung enthält mehrere mögliche Wirtsmaterialien. Schichtkontakte und lokale Ablagerungsmilieus können interessant sein; Reihenfolge und Konzentration sind nur begrenzt beschrieben.',
    storyUnresolved:'Für eine lokale Sedimentkette wird hier eine genauere Materialgrundlage benötigt.',
    cardConfidence:'Kartiertes Material und Prozess stützen die Hypothese. Örtliche Bernsteinzufuhr und Erhaltung bleiben ungeklärt.'
  }
};
registerI18nMessages(Object.fromEntries(Object.entries(stories).map(([lang,entries])=>[lang,Object.fromEntries(Object.entries(entries).map(([key,value])=>[`jordrav.${key}`,value]))])));
messageKeys.push(...Object.keys(stories.da));
registerI18nMessages({
  da:{'jordrav.hiddenOverlay':'Potentialelaget er skjult.','jordrav.confidenceUnresolved':'Ravmuligheden kan ikke vurderes her.','jordrav.cardUnresolved':'Materialegrundlaget eller landskabets relevans for markrav er uafklaret.'},
  de:{'jordrav.hiddenOverlay':'Die Potenzialebene ist ausgeblendet.','jordrav.confidenceUnresolved':'Die Bernsteinmöglichkeit ist hier nicht bewertbar.','jordrav.cardUnresolved':'Die Materialgrundlage oder die Bedeutung des Landschaftsmilieus für Feldbernstein ist ungeklärt.'},
  en:{'jordrav.hiddenOverlay':'The potential layer is hidden.','jordrav.confidenceUnresolved':'The amber possibility cannot be assessed here.','jordrav.cardUnresolved':'The material basis or the environment’s relevance to field amber is unresolved.'}
});
messageKeys.push('hiddenOverlay','confidenceUnresolved','cardUnresolved');
const regionalMessages = {
  da:{focus:'Vis kun forhøjet procespotentiale',focusNote:'Fokus skjuler også mulige bassin- og marine miljøer. Deres potentiale er uændret. Dybe punkter styres særskilt.',regionalTitle:'Undersøg regionale ravhistorier',regionalIntro:'Forskellige geologiske kæder giver konkrete muligheder at undersøge. Vælg et område for at følge forklaringen.',regionalChoose:'Område',regionalPlaceholder:'Vælg en regional mulighed',regionalGo:'Vis på kortet',regionalBasis:'Geologisk støtte',regionalChain:'Mulig ravkæde',regionalFocus:'Hvad er interessant at undersøge?',regionalChallenge:'Hvad kan ændre vurderingen?',regionalNote:'Regionsvalget flytter kun kortvisningen. Det tegner ingen ravgrænse og ændrer ikke farveklassernes vurderinger.'},
  de:{focus:'Nur erhöhtes Prozesspotenzial zeigen',focusNote:'Der Fokus blendet auch mögliche Becken- und Meeresmilieus aus. Ihr Potenzial bleibt unverändert. Tiefe Punkte werden separat gesteuert.',regionalTitle:'Regionale Bernsteingeschichten untersuchen',regionalIntro:'Unterschiedliche geologische Ketten bieten konkrete Untersuchungsmöglichkeiten. Wählen Sie eine Region für die Erklärung.',regionalChoose:'Region',regionalPlaceholder:'Regionale Möglichkeit wählen',regionalGo:'Auf der Karte zeigen',regionalBasis:'Geologische Grundlage',regionalChain:'Mögliche Bernsteinkette',regionalFocus:'Was ist interessant zu untersuchen?',regionalChallenge:'Was könnte die Bewertung ändern?',regionalNote:'Die Regionswahl verschiebt nur den Kartenausschnitt. Sie zeichnet keine Bernsteingrenze und verändert die Farbklassen nicht.'},
  en:{focus:'Show only enhanced process potential',focusNote:'Focus also hides possible basin and marine environments. Their potential is unchanged. Deep points are controlled separately.',regionalTitle:'Explore regional amber histories',regionalIntro:'Different geological chains offer concrete possibilities to investigate. Choose a region to follow its explanation.',regionalChoose:'Region',regionalPlaceholder:'Choose a regional possibility',regionalGo:'Show on map',regionalBasis:'Geological support',regionalChain:'Possible amber chain',regionalFocus:'What is interesting to investigate?',regionalChallenge:'What could change the assessment?',regionalNote:'Choosing a region only moves the map view. It draws no amber boundary and does not change the colour classes.'}
};
registerI18nMessages(Object.fromEntries(Object.entries(regionalMessages).map(([lang,entries])=>[lang,Object.fromEntries(Object.entries(entries).map(([key,value])=>[`jordrav.${key}`,value]))])));
messageKeys.push(...Object.keys(regionalMessages.da));
const fieldMessages = {
  da:{fieldTitle:'Markrav efter pløjning og regn',fieldPlough:'Pløjning kan bringe rav, som allerede ligger i det bearbejdede jordlag, frem i overfladen.',fieldRain:'Regn kan vaske jord af blotlagt rav, så det bliver lettere at se. Det ændrer synligheden; det tilfører ikke i sig selv rav til marken.',fieldDepth:'GEUS beskriver geologiske aflejringer omkring én meters dybde, under pløjelaget. Jordartskortet angiver ikke ravindholdet i pløjelaget eller dæklagets præcise tykkelse.',fieldUse:'Vurder først den mulige sedimentkæde. Se derefter efter en mark med blotlagt jord og forbindelse til det relevante lag. Luftfoto giver landskabskontekst; dagens pløjning, regn og vegetation er ikke kontrolleret.'},
  de:{fieldTitle:'Feldbernstein nach Pflügen und Regen',fieldPlough:'Pflügen kann Bernstein, der bereits im bearbeiteten Boden liegt, an die Oberfläche bringen.',fieldRain:'Regen kann Erde von freigelegtem Bernstein abwaschen und ihn sichtbarer machen. Das verändert die Sichtbarkeit; dadurch gelangt nicht von selbst Bernstein auf das Feld.',fieldDepth:'GEUS beschreibt geologische Ablagerungen in etwa einem Meter Tiefe, unter dem Pflughorizont. Die Karte zeigt weder Bernstein im Pflughorizont noch die genaue Deckschichtdicke.',fieldUse:'Zuerst die mögliche Sedimentkette prüfen. Dann nach einem Feld mit freiliegendem Boden und Verbindung zur relevanten Schicht suchen. Luftbilder zeigen den Landschaftskontext; heutiges Pflügen, Regen und Vegetation sind nicht geprüft.'},
  en:{fieldTitle:'Field amber after ploughing and rain',fieldPlough:'Ploughing can bring amber already within the worked soil layer to the surface.',fieldRain:'Rain can wash soil off exposed amber, making it easier to see. This changes visibility; it does not by itself supply amber to the field.',fieldDepth:'GEUS describes geological deposits at about one metre depth, below the plough zone. The map does not show amber content in the plough zone or exact cover thickness.',fieldUse:'First assess the possible sediment history. Then look for a field with exposed soil and a connection to the relevant layer. Aerial imagery provides landscape context; current ploughing, rain and vegetation have not been checked.'}
};
registerI18nMessages(Object.fromEntries(Object.entries(fieldMessages).map(([lang,entries])=>[lang,Object.fromEntries(Object.entries(entries).map(([key,value])=>[`jordrav.${key}`,value]))])));
messageKeys.push(...Object.keys(fieldMessages.da));
const accessibilityMessages = {
  da:{colourMode:'Kortfarver',colourPotential:'Geologisk potentiale',colourAccess:'Jagtbarhed',deepToggle:'Vis dybe lag',
    huntUnknown:'Jagtbarhed uafklaret',deepLegend:'Dybt lag · ikke umiddelbart jagtbart',deepNotHuntable:'Dyb lagregistrering · ikke umiddelbart jagtbart',
    potentialColourNote:'Potentialefarver dokumenterer ikke jagtbarhed. Lilla punkter viser dybe lag, som ikke er umiddelbart tilgængelige.',
    accessColourNote:'Gråblå flader: jagtbarhed uafklaret. Lilla punkter: dybe lag. Ingen af de nuværende flader er verificeret som blotlagt eller tilgængelig ved pløjning.',
    huntabilityMapNote:'Et muligt ravførende lag skal være blotlagt eller nås af jordbearbejdningen for at være jagtbart. Tilgængeligheden i pløjelaget er endnu uafklaret for de farvede flader.',
    surfaceHuntabilityNote:'Jordartskortet beskriver geologisk materiale. Det fastlægger ikke, om et relevant lag ligger i pløjelaget eller er blotlagt nu. Et dæklag bliver ikke automatisk kaldt dybt.',
    huntability:'Jagtbarhed',recordedDepth:'Registreret dybde under boringens terræn',deepMaterial:'Registreret materiale',deepSand:'Ældre marint sand i borebeskrivelsen',borehole:'Offentlig geologisk boring',
    deepPointOnly:'Punktvis geologisk registrering. Intet ravfund eller kortlagt ravlag; punktsymbolets størrelse angiver ingen udbredelse.',
    exposureTitle:'Hvis laget blotlægges',deepExposure:'Blotlægning af netop disse intervaller er ikke dokumenteret her. Et sådant lag kan blive relevant, hvis erosion, omlejring eller anden blotlægning bringer materialet frem. Det kræver en lokal lagforbindelse; pløjning og regn afklarer ikke den registrerede dybde.',
    deepInference:'Lagene kan indgå i en mulig geologisk tilførsels- eller omlejringshistorie. Ravtilførsel og en forbindelse til dagens overflade er uafklarede. Tidligere ravfund er ikke et krav til denne hypotese.',
    deepCodeNote:'Dybderne er historiske boreintervaller. Materiale, formation og ravindhold er forskellige spørgsmål; jordartskortets symbolforklaring anvendes ikke automatisk på boringskoder.',
    deepConfidence:'Dybdeintervallerne er registreret i Jupiter. Ravindhold, lokal blotlægning og arealudbredelse er ikke eftervist.'},
  de:{colourMode:'Kartenfarben',colourPotential:'Geologisches Potenzial',colourAccess:'Zugänglichkeit',deepToggle:'Tiefe Schichten anzeigen',
    huntUnknown:'Zugänglichkeit ungeklärt',deepLegend:'Tiefe Schicht · nicht direkt zugänglich',deepNotHuntable:'Tiefe Schichtaufnahme · nicht direkt zugänglich',
    potentialColourNote:'Potenzialfarben belegen keine Zugänglichkeit. Violette Punkte zeigen tiefe Schichten, die nicht unmittelbar erreichbar sind.',
    accessColourNote:'Graublaue Flächen: Zugänglichkeit ungeklärt. Violette Punkte: tiefe Schichten. Keine der aktuellen Flächen ist als freigelegt oder durch Pflügen erreichbar bestätigt.',
    huntabilityMapNote:'Eine möglicherweise bernsteinführende Schicht muss freiliegen oder durch Bodenbearbeitung erreichbar sein. Die Verbindung zum Pflughorizont ist für die farbigen Flächen noch ungeklärt.',
    surfaceHuntabilityNote:'Die Bodenkarte beschreibt geologisches Material. Das belegt weder eine relevante Schicht im Pflughorizont noch heutige Freilegung. Eine Deckschicht wird nicht automatisch als tief eingestuft.',
    huntability:'Zugänglichkeit',recordedDepth:'Registrierte Tiefe unter dem Bohrgelände',deepMaterial:'Registriertes Material',deepSand:'Älterer Meeressand in der Bohrbeschreibung',borehole:'Öffentliche geologische Bohrung',
    deepPointOnly:'Geologische Punktaufnahme. Kein Bernsteinfund oder kartiertes Bernsteinlager; die Symbolgröße zeigt keine Schichtausdehnung.',
    exposureTitle:'Falls die Schicht freigelegt wird',deepExposure:'Eine Freilegung genau dieser Intervalle ist hier nicht dokumentiert. Erosion, Umlagerung oder andere Freilegung kann das Material zugänglich machen. Dazu muss der lokale Schichtzusammenhang geklärt werden; Pflügen und Regen erklären die registrierte Tiefe nicht.',
    deepInference:'Die Schichten können Teil einer möglichen geologischen Zufuhr- oder Umlagerungsgeschichte sein. Bernsteinzufuhr und Verbindung zur heutigen Oberfläche sind ungeklärt. Frühere Bernsteinfunde sind keine Voraussetzung für diese Hypothese.',
    deepCodeNote:'Die Tiefen sind historische Bohrintervalle. Material, Formation und Bernsteingehalt sind unterschiedliche Fragen; die Legende der Oberflächengeologie wird nicht automatisch auf Bohrcodes angewendet.',
    deepConfidence:'Die Tiefenintervalle sind in Jupiter registriert. Bernsteingehalt, lokale Freilegung und flächenhafte Ausdehnung sind nicht nachgewiesen.'},
  en:{colourMode:'Map colours',colourPotential:'Geological potential',colourAccess:'Hunting accessibility',deepToggle:'Show deep layers',
    huntUnknown:'Hunting accessibility unresolved',deepLegend:'Deep layer · not readily huntable',deepNotHuntable:'Deep layer record · not readily huntable',
    potentialColourNote:'Potential colours do not establish hunting accessibility. Purple points show deep layers that are not readily accessible.',
    accessColourNote:'Blue-grey areas: hunting accessibility unresolved. Purple points: deep layers. None of the current areas has verified exposure or access through ploughing.',
    huntabilityMapNote:'A potentially amber-bearing layer must be exposed or reached by soil cultivation to be huntable. Access within the plough zone remains unresolved for the coloured areas.',
    surfaceHuntabilityNote:'The soil map describes geological material. This does not establish a relevant layer in the plough zone or current exposure. Cover is not automatically classified as deep.',
    huntability:'Hunting accessibility',recordedDepth:'Recorded depth below the borehole terrain',deepMaterial:'Recorded material',deepSand:'Older marine sand in the borehole description',borehole:'Public geological borehole',
    deepPointOnly:'Point geological record. No amber find or mapped amber deposit; symbol size does not show a layer extent.',
    exposureTitle:'If the layer becomes exposed',deepExposure:'Exposure of these specific intervals is not documented here. Erosion, reworking or other exposure may bring the material within reach. A local layer connection must be established; ploughing and rain do not resolve the recorded burial depth.',
    deepInference:'The layers may form part of a possible geological supply or reworking history. Amber supply and connection to today’s surface are unresolved. Previous amber finds are not required for this hypothesis.',
    deepCodeNote:'Depths are historical borehole intervals. Material, formation and amber content are separate questions; the surface-map legend is not automatically applied to borehole codes.',
    deepConfidence:'The depth intervals are registered in Jupiter. Amber content, local exposure and spatial extent have not been verified.'}
};
registerI18nMessages(Object.fromEntries(Object.entries(accessibilityMessages).map(([lang,entries])=>[lang,Object.fromEntries(Object.entries(entries).map(([key,value])=>[`jordrav.${key}`,value]))])));
messageKeys.push(...Object.keys(accessibilityMessages.da));

// The broad model category is geological context, not a map recommendation.
// Keep the model/data identity intact while stating what an uncoloured area
// does and does not mean. It does not encode the depth of regional research.
const designationMessages = {
  da:{
    possible:'Generel geologi · ingen særskilt udpegning',
    selectHelp:'Zoom ind og klik på kortet, også i ufarvede områder. Her kan du se jordart, mulig transportkæde, dybde og kilder.',
    reasonPossible:'Området har geologiske grunddata, men den brede modelkategori giver ingen særskilt udpegning. Den angiver ikke, hvor grundigt den lokale ravkæde er undersøgt, og er ikke en negativ vurdering af ravmulighederne.',
    potentialColourNote:'Ufarvede områder har ingen særskilt udpegning; det betyder ikke, at ravmuligheder er udelukket. Zoom ind og klik for geologi. Farver dokumenterer ikke jagtbarhed; lilla punkter viser dybe lag.'
  },
  de:{
    possible:'Allgemeine Geologie · keine gesonderte Ausweisung',
    selectHelp:'Hineinzoomen und auf die Karte klicken, auch auf ungefärbte Gebiete. Hier erscheinen Material, mögliche Transportkette, Tiefe und Quellen.',
    reasonPossible:'Für das Gebiet liegen geologische Grunddaten vor, doch die breite Modellkategorie ergibt keine gesonderte Ausweisung. Sie beschreibt nicht, wie gründlich die örtliche Bernsteinkette untersucht wurde, und ist keine negative Bewertung der Bernsteinmöglichkeiten.',
    potentialColourNote:'Ungefärbte Gebiete haben keine gesonderte Ausweisung; Bernsteinmöglichkeiten sind damit nicht ausgeschlossen. Hineinzoomen und für Geologie klicken. Farben belegen keine Zugänglichkeit; violette Punkte zeigen tiefe Schichten.'
  },
  en:{
    possible:'General geology · no specific designation',
    selectHelp:'Zoom in and click the map, including uncoloured areas. See the material, possible transport history, depth and sources.',
    reasonPossible:'Geological source data exist here, but the broad model category provides no specific designation. It does not state how thoroughly the local amber history has been studied and is not a negative assessment of amber possibilities.',
    potentialColourNote:'Uncoloured areas have no specific designation; amber possibilities are not ruled out. Zoom in and click for geology. Colours do not establish hunting accessibility; purple points show deep layers.'
  }
};
registerI18nMessages(Object.fromEntries(Object.entries(designationMessages).map(([lang,entries])=>[lang,Object.fromEntries(Object.entries(entries).map(([key,value])=>[`jordrav.${key}`,value]))])));

// National 0.2: colours identify mechanisms, not ranked find probabilities.
const nationalMessages = {
  da:{
    prototype:'Landsdækkende geologisk model · 0.2',
    enhanced:'Transport og sortering', coastal:'Marine aflejringer', basin:'Ferskvands- og bassinmodtagere', reworked:'Omlejringsmiljøer', coveredCategory:'Dæklag i muligt modtagermiljø',
    footer:'Geologisk model 0.2.0 · Hele Danmark er gennemgået. Ravmængde og adgang ved pløjning er ikke verificeret.', hypothesis:'Egen geologisk udledning · model 0.2.0',
    focus:'Vis kun mulighedsudpegninger', focusNote:'Viser orange, blå, rosa, okker og turkise muligheder. Generel geologi og uafklarede flader skjules; dybe punkter styres særskilt.',
    reasonEnhanced:'Sand eller grus i et kortlagt transport- eller sorteringsmiljø giver en mulig kæde for frigørelse og omlejring af rav. Ravtilførsel og lokal koncentration er ikke påvist.',
    reasonCoastal:'Det øvre kortlagte materiale er marint. Hav og tidligere kystmiljøer kan modtage og omlejre rav, også i finere eller blandede aflejringer. Blå betyder en marin mulighed, ikke en bestemt ravmængde eller adgang i pløjelaget.',
    reasonBasin:'Ferskvands- eller issømateriale, eller kompatibelt materiale i et bassin, kan have modtaget omlejret rav. Fine lag kan også være modtagere. Tilførsel, bevaring og forbindelse til dagens overflade er uafklaret.',
    reasonReworked:'Kortlagt erosion, smeltevand eller istryk giver en konkret mulighed for at frigøre, blande eller flytte det øvre sediment. Klassen er en omlejringshypotese uden automatisk bonus for alder eller kulindhold.',
    reasonCovered:'Flyvesand eller organisk materiale ligger i et muligt modtagermiljø eller over relevant materiale i en konkret proceskæde. Dæklaget kan skjule eller selv rumme omlejret materiale. Ved blandede symboler kan materialerne også ligge side om side. Tykkelsen er ukendt; turkis dokumenterer hverken rav eller adgang ved pløjning.',
    reasonPossible:'Områdets kortlagte materiale og landskab er vurderet i den landsdækkende model. Kombinationen giver ingen særskilt procesudpegning efter de aktuelle kriterier. Det er ikke en negativ vurdering af ravmulighederne.',
    methodBody:'Alle kortlagte materiale- og landskabskombinationer i Danmark er gennemgået. Farver viser transport, marine modtagere, sø-/bassinaflejringer, omlejring eller dæklag. De er forskellige geologiske spor, ikke en rangorden af fundchancer. Ravspecifik sikkerhed er svag.',
    potentialColourNote:'Farver viser geologiske muligheder i hele landet. Turkis med stiplet kant viser dæklag med ukendt adgang; lilla punkter er dokumenterede dybe lag. Ufarvet betyder ingen særskilt procesudpegning og betyder ikke, at ravmuligheder er udelukket.'
  },
  de:{
    prototype:'Landesweites geologisches Modell · 0.2', enhanced:'Transport und Sortierung', coastal:'Marine Ablagerungen', basin:'Süßwasser- und Beckenablagerungen', reworked:'Umlagerungsmilieus', coveredCategory:'Deckschichten im möglichen Ablagerungsraum',
    footer:'Geologisches Modell 0.2.0 · Ganz Dänemark wurde untersucht. Bernsteinmenge und Erreichbarkeit beim Pflügen sind nicht verifiziert.', hypothesis:'Eigene geologische Ableitung · Modell 0.2.0',
    focus:'Nur ausgewiesene Möglichkeiten zeigen', focusNote:'Zeigt orange, blaue, rosa, ockerfarbene und türkise Möglichkeiten. Allgemeine Geologie und ungeklärte Flächen werden ausgeblendet; tiefe Punkte separat gesteuert.',
    reasonEnhanced:'Sand oder Kies in einem kartierten Transport- oder Sortierungsmilieu ermöglicht eine Kette der Freisetzung und Umlagerung von Bernstein. Örtliche Zufuhr und Konzentration sind nicht belegt.',
    reasonCoastal:'Das obere kartierte Material ist marin. Meer und frühere Küsten können Bernstein aufnehmen und umlagern, auch in feinen oder gemischten Ablagerungen. Blau bedeutet eine marine Möglichkeit; Bernsteinmenge und Erreichbarkeit beim Pflügen sind ungeklärt.',
    reasonBasin:'Süßwasser- oder Eisstausedimente beziehungsweise kompatible Sedimente in einem Becken können umgelagerten Bernstein aufgenommen haben. Auch feine Schichten können Empfänger sein. Zufuhr, Erhaltung und Verbindung zur heutigen Oberfläche sind ungeklärt.',
    reasonReworked:'Kartierte Erosion, Schmelzwasser oder Eisdruck ermöglichen die Freisetzung, Mischung oder Bewegung des oberen Sediments. Alter oder Kohleinhalt allein ergeben keinen Bonus.',
    reasonCovered:'Flugsand oder organisches Material liegt in einem möglichen Ablagerungsraum oder über relevantem Material in einer konkreten Prozesskette. Es kann Material verdecken oder Umlagerungsmaterial enthalten. Bei gemischten Symbolen können Materialien auch nebeneinander liegen. Mächtigkeit ist unbekannt; Türkis belegt weder Bernstein noch Erreichbarkeit beim Pflügen.',
    reasonPossible:'Material und Landschaft wurden landesweit bewertet. Ihre Kombination ergibt nach den aktuellen Kriterien keine besondere Prozessausweisung. Das ist keine negative Bewertung der Bernsteinmöglichkeiten.',
    methodBody:'Alle kartierten Material- und Landschaftskombinationen Dänemarks wurden untersucht. Farben zeigen Transport, marine Empfänger, See-/Beckenablagerungen, Umlagerung oder Deckschichten. Sie sind verschiedene geologische Ansätze, keine Rangfolge der Fundchancen. Bernsteinspezifische Sicherheit ist gering.',
    potentialColourNote:'Farben zeigen geologische Möglichkeiten im ganzen Land. Türkis mit gestricheltem Rand zeigt Deckschichten mit unbekannter Zugänglichkeit; violette Punkte zeigen dokumentierte tiefe Schichten. Ungefärbt bedeutet keine besondere Prozessausweisung; Bernsteinmöglichkeiten sind nicht ausgeschlossen.'
  },
  en:{
    prototype:'Nationwide geological model · 0.2', enhanced:'Transport and sorting', coastal:'Marine deposits', basin:'Freshwater and basin receivers', reworked:'Reworking environments', coveredCategory:'Cover in a possible receiving environment',
    footer:'Geological model 0.2.0 · All Denmark assessed. Amber quantity and access through ploughing are unverified.', hypothesis:'Our geological inference · model 0.2.0',
    focus:'Show designated possibilities only', focusNote:'Shows orange, blue, pink, ochre and turquoise possibilities. General geology and unresolved areas are hidden; deep points are controlled separately.',
    reasonEnhanced:'Sand or gravel in a mapped transport or sorting environment gives a possible chain for releasing and reworking amber. Local supply and concentration have not been demonstrated.',
    reasonCoastal:'The upper mapped material is marine. Sea and former coastal environments may receive and rework amber, including finer and mixed deposits. Blue denotes a marine possibility, not a particular amber quantity or access through ploughing.',
    reasonBasin:'Freshwater or ice-lake material, or compatible material in a basin, may have received reworked amber. Fine layers may also be receivers. Supply, preservation and connection to today’s surface remain unresolved.',
    reasonReworked:'Mapped erosion, meltwater or ice thrusting provides a concrete possibility for releasing, mixing or moving the upper sediment. Age or coal content alone earns no bonus.',
    reasonCovered:'Wind-blown sand or organic material occurs in a possible receiving environment or above relevant material in a concrete process chain. Cover may conceal or contain reworked material. Mixed symbols may also describe side-by-side materials. Thickness is unknown; turquoise proves neither amber nor access through ploughing.',
    reasonPossible:'The mapped material and landscape have been assessed in the nationwide model. Their combination provides no specific process designation under the current criteria. This is not a negative assessment of amber possibilities.',
    methodBody:'All mapped material and landscape combinations in Denmark have been assessed. Colours identify transport, marine receivers, lake/basin deposits, reworking or cover. These are different geological leads, not ranked find probabilities. Amber-specific confidence is weak.',
    potentialColourNote:'Colours show geological possibilities nationwide. Turquoise with a dashed edge shows cover with unknown access; purple points show documented deep layers. Uncoloured means no specific process designation; amber possibilities are not ruled out.'
  }
};
registerI18nMessages(Object.fromEntries(Object.entries(nationalMessages).map(([lang,entries])=>[lang,Object.fromEntries(Object.entries(entries).map(([key,value])=>[`jordrav.${key}`,value]))])));
messageKeys.push(...Object.keys(nationalMessages.da));

const searchMessages = {
  da:{
    searchTitle:'Hvad bør du undersøge her?', searchMaterial:'Materiale at skelne mellem', searchLayers:'Kortets lagoplysning', searchMissingLink:'Det afgørende åbne led',
    physical_variant:'Marint materiale · underkode uafklaret', task_variant:'Den marine underkode er ikke særskilt forklaret i den kontrollerede kortlegende. Afklar lokal materialetype og variation; der udledes hverken et blandingsforhold eller en lagtykkelse fra underkoden.',
    physical_coarse:'Sand og grus', physical_fine:'Silt og ler', physical_organic:'Tørv og gytje', physical_aeolian:'Flyvesand og klitsand', physical_alternating:'Vekslende sedimentlag', physical_till:'Morænemateriale', physical_chemical:'Kalk- eller jernudfældninger', physical_older:'Ældre sedimenter', physical_rock:'Fast bjergart', physical_broad:'Bredt beskrevet aflejring', physical_unknown:'Materiale uafklaret',
    relationship_same:'Samme øvre og dybere symbol. Ingen laggrænse er særskilt registreret; adgang i pløjelaget er stadig ukendt.',
    relationship_different:'Forskellige øvre og dybere aflejringer inden for den øverste meter. Laggrænsens præcise dybde er ikke angivet.',
    relationship_old:'Det ældre kort beskriver ikke øvre og dybere lag særskilt.', relationship_unknown:'Lagforholdet kan ikke udledes sikkert af de registrerede symboler.',
    searchMixture:'Bindestreg mellem jordartssymboler beskriver materialer i samme kortflade, som ikke er adskilt finere. De kan ligge side om side. Det er ikke i sig selv et lodret dæklag.',
    task_coarse:'Undersøg blotlagt sand og grus samt lokale sedimentkontakter. Rav følger ikke nødvendigvis størrelsen på sandkornene; rent sand er ikke i sig selv et ravbevis.',
    task_fine:'Undersøg blotlagt fint sediment og eventuelle organiske striber. Ler og silt kan være modtagere af omlejret rav, men klumper og jordbelægning kan skjule det. Regn hjælper først, når materialet er blotlagt.',
    task_organic:'Skeln mellem blotlagt tørv/gytje og organisk materiale, der dækker andre lag. Plantemateriale kan belyse en aflejringskæde; organisk indhold beviser hverken rav eller et sandlag, som kan nås ved pløjning.',
    task_aeolian:'Undersøg, om flyvesandet er et dække over et relevant ældre sediment, og om dette faktisk er åbent. Vindaflejret sand giver ikke i sig selv evidens for vindtransporteret rav.',
    task_alternating:'Undersøg hvilke delmaterialer og lag der er blotlagt. Et symbol for vekslende lag fastlægger ikke lagtykkelse, indbyrdes ravindhold eller adgang ved jordbearbejdning.',
    task_till:'Undersøg lokal omlejring, erosionsspor og kontakt til sand eller andre modtagere. Morænemateriale kan indeholde indført materiale, men kortet viser ingen ensartet ravkoncentration.',
    task_chemical:'Kalk- eller jernudfældning viser et aflejringsmiljø. Undersøg kontakten til omgivende sedimenter; udfældningen alene giver ikke et ravlager.',
    task_older:'Undersøg om erosion eller senere omlejring forbinder det ældre sediment med dagens blotlagte jord. Alder, glimmer og kul er ikke i sig selv evidens for ravtilførsel.',
    task_rock:'Undersøg lokale lommer af løse yngre sedimenter. De kan være mindre end kortets opløsning; selve den faste bjergart er ikke udpeget som et løst markravlager.',
    task_broad:'Det grove supplement samler flere materialer eller miljøer. Afklar først den lokale sammensætning og lagkontakt, før det bruges til at vælge en mark.',
    task_unknown:'Kortgrundlaget afgør ikke et naturligt, tilgængeligt sedimentlag her. Lokal beskrivelse af materiale og blotlægning er nødvendig, før en ravkæde kan vurderes.',
    missing_supply:'Rav skal være tilført netop dette sediment, og det relevante materiale skal nå den blotlagte jord eller det bearbejdede lag. Begge led er lokale hypoteser; tidligere fund er ikke et krav.',
    missing_cover:'Afklar både mulig ravtilførsel og lokal lagkontakt. Kortet angiver ikke dækkets tykkelse eller dokumenteret adgang til et underliggende lag.',
    missing_general:'En konkret lokal tilførsels- eller omlejringskæde mangler i kortkombinationen. Undersøg lagkontakter og blotlægning; ufarvet betyder ikke, at rav er udelukket.',
    missing_rock:'En løs sedimentlomme og dens forbindelse til dagens overflade skal afklares lokalt.', missing_unknown:'Materiale, aflejringsforløb og aktuel blotlægning skal afklares; ingen ravslutning udledes af ukendt kode eller konflikt.',
    fieldsToggle:'Markgrænser 2026 · hele Danmark', fieldsSource:'Offentlig markkilde',
    fieldsZoom:'Markgrænser 2026 er valgt. Zoom til niveau 12 eller nærmere. Registrering er ikke bevis for bar jord eller pløjeadgang.',
    fieldsLoading:'Indlæser registrerede markgrænser 2026…', fieldsReady:'Sort/hvide linjer: registrerede markgrænser 2026. Dagens pløjning, vegetation og lagadgang er uafklaret.',
    fieldsFailed:'Marklaget kunne ikke indlæses fuldt. Slå det fra og til for at prøve igen. Manglende linjer må ikke fortolkes som fravær af marker.',
    fieldsNote:'Markgrænser 2026 viser offentligt registrerede markflader. Registreringen fastlægger ikke dagens afgrøde, pløjning, bar jord eller adgang til ravlaget. Markgrænser bliver ikke til ravgrænser.'
  },
  de:{
    searchTitle:'Was sollte hier untersucht werden?', searchMaterial:'Zu unterscheidende Materialien', searchLayers:'Schichtangabe der Karte', searchMissingLink:'Der entscheidende offene Zusammenhang',
    physical_variant:'Marines Material · Untercode ungeklärt', task_variant:'Der marine Untercode ist in der geprüften Kartenlegende nicht gesondert erklärt. Lokalen Materialtyp und Variation klären; Mischungsverhältnis und Mächtigkeit werden nicht aus dem Untercode abgeleitet.',
    physical_coarse:'Sand und Kies', physical_fine:'Schluff und Ton', physical_organic:'Torf und Gyttja', physical_aeolian:'Flug- und Dünensand', physical_alternating:'Wechselnde Sedimentschichten', physical_till:'Moränenmaterial', physical_chemical:'Kalk- oder Eisenausfällungen', physical_older:'Ältere Sedimente', physical_rock:'Festgestein', physical_broad:'Grob beschriebene Ablagerung', physical_unknown:'Material ungeklärt',
    relationship_same:'Gleiches oberes und tieferes Symbol. Keine gesonderte Schichtgrenze registriert; Zugang im Pflughorizont bleibt unbekannt.',
    relationship_different:'Verschiedene obere und tiefere Ablagerungen im obersten Meter. Die genaue Tiefe der Schichtgrenze ist nicht angegeben.',
    relationship_old:'Die ältere Karte beschreibt obere und tiefere Schichten nicht getrennt.', relationship_unknown:'Der Schichtzusammenhang lässt sich aus den registrierten Symbolen nicht sicher ableiten.',
    searchMixture:'Ein Bindestrich zwischen Bodensymbolen beschreibt Materialien innerhalb derselben Kartierungsfläche, die nicht feiner getrennt wurden. Sie können nebeneinander liegen; das belegt keine vertikale Deckschicht.',
    task_coarse:'Freigelegten Sand und Kies sowie lokale Sedimentkontakte untersuchen. Bernstein folgt nicht zwingend der Korngröße des Sandes; reiner Sand allein belegt keinen Bernstein.',
    task_fine:'Freigelegtes feines Sediment und mögliche organische Streifen untersuchen. Ton und Schluff können umgelagerten Bernstein aufnehmen; Klumpen und Erde können ihn verdecken. Regen hilft erst nach Freilegung.',
    task_organic:'Freigelegten Torf/Gyttja von organischen Deckschichten unterscheiden. Pflanzenmaterial kann einen Ablagerungszusammenhang erklären; organischer Inhalt belegt weder Bernstein noch beim Pflügen erreichbaren Sand.',
    task_aeolian:'Prüfen, ob Flugsand ein relevantes älteres Sediment überdeckt und ob dieses freiliegt. Windabgelagerter Sand allein belegt keinen durch Wind transportierten Bernstein.',
    task_alternating:'Prüfen, welche Materialien und Schichten freiliegen. Ein Wechsellagensymbol bestimmt weder Mächtigkeit, Bernsteininhalt noch Erreichbarkeit durch Bodenbearbeitung.',
    task_till:'Lokale Umlagerung, Erosion und Kontakt zu Sand oder anderen Ablagerungen untersuchen. Moränenmaterial kann eingetragenes Material enthalten; die Karte zeigt keine gleichmäßige Bernsteinkonzentration.',
    task_chemical:'Kalk- oder Eisenausfällungen beschreiben ein Ablagerungsmilieu. Kontakt zu benachbarten Sedimenten prüfen; die Ausfällung allein ergibt kein Bernsteinlager.',
    task_older:'Prüfen, ob Erosion oder spätere Umlagerung das ältere Sediment mit heute freiliegendem Boden verbindet. Alter, Glimmer und Kohle allein belegen keine Bernsteinzufuhr.',
    task_rock:'Lokale Taschen jüngerer Lockersedimente untersuchen. Sie können unter der Kartenauflösung liegen; Festgestein selbst ist nicht als loses Feldbernsteinlager ausgewiesen.',
    task_broad:'Die grobe Ergänzung fasst mehrere Materialien oder Milieus zusammen. Vor Auswahl eines Feldes lokale Zusammensetzung und Schichtkontakt klären.',
    task_unknown:'Die Kartengrundlage bestimmt hier keine natürliche zugängliche Sedimentschicht. Material und Freilegung müssen lokal beschrieben werden, bevor eine Bernsteinkette beurteilt werden kann.',
    missing_supply:'Bernstein muss in genau dieses Sediment gelangt sein, und relevantes Material muss die freiliegende Erde oder den bearbeiteten Horizont erreichen. Beide Zusammenhänge sind lokale Hypothesen; frühere Funde sind keine Voraussetzung.',
    missing_cover:'Mögliche Bernsteinzufuhr und lokalen Schichtkontakt klären. Die Karte bestimmt weder Deckmächtigkeit noch nachgewiesenen Zugang zur darunterliegenden Schicht.',
    missing_general:'Eine konkrete lokale Zufuhr- oder Umlagerungskette fehlt in der Kartenkombination. Schichtkontakte und Freilegung prüfen; ungefärbt schließt Bernstein nicht aus.',
    missing_rock:'Eine Lockersedimenttasche und ihre Verbindung zur heutigen Oberfläche müssen lokal geklärt werden.', missing_unknown:'Material, Ablagerungsgeschichte und aktuelle Freilegung klären; aus unbekannten Codes oder Konflikten wird kein Bernsteinvorkommen abgeleitet.',
    fieldsToggle:'Feldgrenzen 2026 · ganz Dänemark', fieldsSource:'Öffentliche Feldquelle',
    fieldsZoom:'Feldgrenzen 2026 ausgewählt. Auf Stufe 12 oder näher zoomen. Registrierung belegt weder offenen Boden noch Erreichbarkeit durch Pflügen.',
    fieldsLoading:'Registrierte Feldgrenzen 2026 werden geladen…', fieldsReady:'Schwarz-weiße Linien: registrierte Feldgrenzen 2026. Heutiges Pflügen, Vegetation und Schichtzugang sind ungeklärt.',
    fieldsFailed:'Die Feldkarte konnte nicht vollständig geladen werden. Aus- und einschalten, um erneut zu versuchen. Fehlende Linien bedeuten nicht, dass keine Felder vorhanden sind.',
    fieldsNote:'Feldgrenzen 2026 zeigen öffentlich registrierte Feldflächen. Registrierung bestimmt nicht heutige Kultur, Pflügen, offenen Boden oder Zugang zur Bernsteinschicht. Feldgrenzen sind keine Bernsteingrenzen.'
  },
  en:{
    searchTitle:'What should you investigate here?', searchMaterial:'Materials to distinguish', searchLayers:'Mapped layer relationship', searchMissingLink:'The critical unresolved link',
    physical_variant:'Marine material · unresolved subcode', task_variant:'The marine subcode is not separately explained in the checked map legend. Establish the local material and variation; neither a mixing ratio nor bed thickness is inferred from the subcode.',
    physical_coarse:'Sand and gravel', physical_fine:'Silt and clay', physical_organic:'Peat and gyttja', physical_aeolian:'Wind-blown and dune sand', physical_alternating:'Alternating sediment beds', physical_till:'Till material', physical_chemical:'Calcareous or iron precipitates', physical_older:'Older sediments', physical_rock:'Bedrock', physical_broad:'Broadly described deposit', physical_unknown:'Unresolved material',
    relationship_same:'Same upper and lower symbol. No separate layer boundary is recorded; access within the plough zone remains unknown.',
    relationship_different:'Different upper and lower deposits within the top metre. The exact depth of the boundary is not given.',
    relationship_old:'The older map does not describe upper and lower layers separately.', relationship_unknown:'The recorded symbols do not securely establish the layer relationship.',
    searchMixture:'A hyphen between soil symbols describes materials within one mapped area that were not separated in finer detail. They may occur side by side; this alone does not establish vertical cover.',
    task_coarse:'Inspect exposed sand and gravel and local sediment contacts. Amber does not necessarily follow sand grain size; clean sand alone is not evidence of amber.',
    task_fine:'Inspect exposed fine sediment and any organic streaks. Clay and silt may receive reworked amber, while clods and soil coatings may hide it. Rain helps only after exposure.',
    task_organic:'Distinguish exposed peat/gyttja from organic cover over other beds. Plant material may help explain a depositional chain; organic content establishes neither amber nor sand within ploughing reach.',
    task_aeolian:'Check whether wind-blown sand covers relevant older sediment and whether that sediment is actually exposed. Wind-deposited sand alone is not evidence of wind-transported amber.',
    task_alternating:'Check which materials and beds are exposed. An alternating-bed symbol establishes neither thickness, relative amber content nor access through cultivation.',
    task_till:'Inspect local reworking, erosion and contacts with sand or other receivers. Till may contain introduced material; the map does not show a uniform amber concentration.',
    task_chemical:'Calcareous or iron precipitation describes a depositional setting. Check contacts with surrounding sediments; precipitation alone does not establish an amber store.',
    task_older:'Check whether erosion or later reworking connects older sediment to today’s exposed soil. Age, mica and coal alone are not evidence of amber supply.',
    task_rock:'Inspect local pockets of younger loose sediment. They may lie below map resolution; the bedrock itself is not designated as a loose field-amber store.',
    task_broad:'The coarse supplement combines several materials or settings. Establish local composition and layer contact before selecting a field.',
    task_unknown:'The map does not establish a natural accessible sediment layer here. Material and exposure need local description before an amber chain can be assessed.',
    missing_supply:'Amber must have entered this specific sediment, and relevant material must reach exposed soil or the cultivated layer. Both links are local hypotheses; previous finds are not required.',
    missing_cover:'Establish both possible amber supply and local layer contact. The map gives neither cover thickness nor demonstrated access to an underlying layer.',
    missing_general:'A concrete local supply or reworking chain is absent from this map combination. Inspect contacts and exposure; uncoloured does not rule out amber.',
    missing_rock:'A loose sediment pocket and its connection to today’s surface need local assessment.', missing_unknown:'Establish material, deposition history and current exposure; no amber inference is drawn from an unknown code or conflict.',
    fieldsToggle:'Field boundaries 2026 · all Denmark', fieldsSource:'Public field source',
    fieldsZoom:'Field boundaries 2026 selected. Zoom to level 12 or closer. Registration establishes neither bare soil nor ploughing access.',
    fieldsLoading:'Loading registered field boundaries 2026…', fieldsReady:'Black/white lines: registered field boundaries 2026. Current ploughing, vegetation and layer access are unresolved.',
    fieldsFailed:'The field layer could not load completely. Toggle it off and on to retry. Missing lines must not be read as an absence of fields.',
    fieldsNote:'Field boundaries 2026 show publicly registered field areas. Registration establishes neither today’s crop, ploughing, bare soil nor access to an amber-bearing layer. Field boundaries are not amber boundaries.'
  }
};
registerI18nMessages(Object.fromEntries(Object.entries(searchMessages).map(([lang,entries])=>[lang,Object.fromEntries(Object.entries(entries).map(([key,value])=>[`jordrav.${key}`,value]))])));
messageKeys.push(...Object.keys(searchMessages.da));

const viewMessages={
  da:{
    traceLabel:'Undersøg et spor', traceAll:'Alle geologiske spor', copyView:'Kopiér link til visningen',
    selectionHidden:'Valget er bevaret i panelet, men fremhævningen er skjult med de aktuelle lagvalg.',
    viewLinkLabel:'Link til den gemte kortvisning',
    viewRestored:'Kortsted og lagvalg er gendannet fra linket.',
    viewDatasetChanged:'Kortsted og lagvalg er gendannet. Geologidata har ændret sig; det tidligere polygon- eller dybdevalg er ikke gendannet.',
    viewInvalid:'Linkets kortvisning kunne ikke læses. Vælg sted og lag i kortet.',
    viewSelectionMissing:'Kortsted og lagvalg er gendannet, men det gemte valg findes ikke her. Klik på kortet for en ny vurdering.',
    viewSelectionWaiting:'Det gemte polygonvalg afventer synlige geologiske detaljer. Slå geologilaget til og zoom ind.',
    viewSelectionFailed:'Det gemte polygonvalg kunne ikke indlæses. Kortets overblik er stadig tilgængeligt; prøv igen ved at flytte kortet.',
    viewCopied:'Link kopieret. Det husker sted, lagvalg og et eventuelt valgt område.',
    viewCopiedWithoutSelection:'Link kopieret med sted og lagvalg. Det tidligere polygonvalg lå uden for detailvisningen og er ikke med.',
    viewManualCopy:'Linket er klar i tekstfeltet. Markér og kopiér det manuelt.',
    viewManualCopyWithoutSelection:'Linket er klar i tekstfeltet. Det tidligere polygonvalg lå uden for detailvisningen og er ikke med. Markér og kopiér linket manuelt.',
    viewCannotSave:'Denne kortvisning kunne ikke gemmes. Flyt kortet tilbage til Danmark og prøv igen.'
  },
  de:{
    traceLabel:'Einen Ansatz untersuchen', traceAll:'Alle geologischen Ansätze', copyView:'Link zur Ansicht kopieren',
    selectionHidden:'Die Auswahl bleibt im Infobereich erhalten; ihre Hervorhebung ist durch die aktuellen Ebeneneinstellungen verborgen.',
    viewLinkLabel:'Link zur gespeicherten Kartenansicht',
    viewRestored:'Kartenposition und Ebeneneinstellungen aus dem Link wiederhergestellt.',
    viewDatasetChanged:'Kartenposition und Ebenen wiederhergestellt. Die Geologiedaten haben sich geändert; die frühere Polygon- oder Tiefenauswahl wurde nicht wiederhergestellt.',
    viewInvalid:'Die Kartenansicht im Link konnte nicht gelesen werden. Ort und Ebenen in der Karte auswählen.',
    viewSelectionMissing:'Kartenposition und Ebenen wiederhergestellt, aber die gespeicherte Auswahl wurde hier nicht gefunden. Für eine neue Beurteilung auf die Karte klicken.',
    viewSelectionWaiting:'Die gespeicherte Polygonauswahl wartet auf sichtbare Geologiedetails. Geologie einschalten und näher zoomen.',
    viewSelectionFailed:'Die gespeicherte Polygonauswahl konnte nicht geladen werden. Die Übersicht bleibt verfügbar; zum erneuten Versuch die Karte bewegen.',
    viewCopied:'Link kopiert. Er speichert Ort, Ebenen und einen eventuell ausgewählten Bereich.',
    viewCopiedWithoutSelection:'Link mit Ort und Ebenen kopiert. Die frühere Polygonauswahl lag außerhalb der Detailansicht und ist nicht enthalten.',
    viewManualCopy:'Der Link steht im Textfeld bereit. Markieren und manuell kopieren.',
    viewManualCopyWithoutSelection:'Der Link steht im Textfeld bereit. Die frühere Polygonauswahl lag außerhalb der Detailansicht und ist nicht enthalten. Den Link markieren und manuell kopieren.',
    viewCannotSave:'Diese Kartenansicht konnte nicht gespeichert werden. Die Karte nach Dänemark verschieben und erneut versuchen.'
  },
  en:{
    traceLabel:'Investigate a lead', traceAll:'All geological leads', copyView:'Copy link to this view',
    selectionHidden:'The selection remains in the information panel, but its highlight is hidden by the current layer settings.',
    viewLinkLabel:'Link to the saved map view',
    viewRestored:'Map location and layer settings restored from the link.',
    viewDatasetChanged:'Map location and layers restored. The geology dataset has changed; the earlier polygon or deep-layer selection was not restored.',
    viewInvalid:'The map view in this link could not be read. Choose a location and layers on the map.',
    viewSelectionMissing:'Map location and layers restored, but the saved selection was not found here. Click the map for a new assessment.',
    viewSelectionWaiting:'The saved polygon selection is waiting for visible geology details. Enable geology and zoom in.',
    viewSelectionFailed:'The saved polygon selection could not be loaded. The overview remains available; move the map to try again.',
    viewCopied:'Link copied. It remembers the location, layers and any selected area.',
    viewCopiedWithoutSelection:'Link copied with location and layers. The earlier polygon selection was outside the detail view and is not included.',
    viewManualCopy:'The link is ready in the text field. Select and copy it manually.',
    viewManualCopyWithoutSelection:'The link is ready in the text field. The earlier polygon selection was outside the detail view and is not included. Select and copy the link manually.',
    viewCannotSave:'This map view could not be saved. Move the map back to Denmark and try again.'
  }
};
registerI18nMessages(Object.fromEntries(Object.entries(viewMessages).map(([lang,entries])=>[lang,Object.fromEntries(Object.entries(entries).map(([key,value])=>[`jordrav.${key}`,value]))])));
messageKeys.push(...Object.keys(viewMessages.da));

const layerAccessMessages = {
  da:{
    layerAccessTitle:'Hvordan kan laget nå overfladen?',
    layerAccessUpper:'Øvre kortlagte materiale', layerAccessLower:'Materiale omkring én meter',
    layerAccessMethod:'GEUS: kortlægning under pløjelaget · metode',
    'layerCase_unresolved':'Lagforløbet er uafklaret. Begynd med at identificere materialet og dets lokale dybde.',
    'layerCase_legacy':'Det ældre supplement har ingen lodret lagbeskrivelse. Det kræver en lokal profil at forbinde aflejringen med søgbar jord.',
    'layerCase_variant':'En marin underkode er ikke særskilt forklaret. Afklar materialet, før en bestemt lagopbygning lægges til grund.',
    'layerCase_repeated':'Samme jordartssymbol gentages. GEUS kortlægger materiale omkring én meter, valgt for at komme under pløjelaget. Den bearbejdede jord skal stadig sammenholdes med aflejringen.',
    'layerCase_cover-contact':'Der er forskellige aflejringer med organisk materiale eller flyvesand øverst. Undersøg både det øvre materiales egen ravmulighed og adgangen til laget under det.',
    'layerCase_mixed-cover-contact':'Det øvre symbol samler flere materialer, herunder organisk materiale eller flyvesand. De kan ligge side om side; et sammenhængende dæklag over hele fladen er ikke fastlagt.',
    'layerCase_sediment-contact':'Kortet beskriver en lodret forskel inden for den øverste meter. Selv når begge lag kaldes sand, kan de have forskellig aflejringshistorie og ravtilførsel.',
    'layerStep_resolve-record':'Afklar de originale symboler eller den modstridende registrering. Et kendt dybere symbol løser ikke et ukendt øvre materiale.',
    'layerStep_local-profile':'Find en lokal beskrivelse med materiale, dybder, sted og dato. Dybderne skal kunne knyttes til det aktuelle terræn og den jord, der kan ses eller bearbejdes.',
    'layerStep_resolve-variant':'Afklar den marine underkode og beskriv, hvilke materialer der faktisk forekommer. Underkoden angiver ikke i sig selv lagtykkelse.',
    'layerStep_compare-worked':'Sammenhold den blotlagte eller bearbejdede jord med det relevante lag og den faktiske bearbejdningsdybde. Regn kan rense rav, som allerede er kommet frem.',
    'layerStep_check-identity':'Skeln mellem ens kornstørrelse og samme aflejring. Ravtilførsel og omlejring skal forbindes med netop det materiale, der ligger fremme.',
    'layerStep_upper-receiver':'Afklar, om ravhypotesen gælder det øvre materiale, laget under det eller begge. Hvert lag skal have sin egen mulige tilførsels- eller omlejringskæde.',
    'layerStep_locate-contact':'Fastlæg, hvor lagkontakten ligger i forhold til dagens overflade. Sammenhold den med blotlægning eller bearbejdning; kortet giver ingen præcis dybde til kontakten.',
    'layerStep_separate-patches':'Skeln først mellem materialernes lokale delområder i de sammensatte symboler. Brug derefter en lokal profil til at afklare den lodrette lagkontakt.'
  },
  de:{
    layerAccessTitle:'Wie kann die Schicht an die Oberfläche gelangen?',
    layerAccessUpper:'Oberes kartiertes Material', layerAccessLower:'Material in etwa einem Meter Tiefe',
    layerAccessMethod:'GEUS: Kartierung unter dem Pflughorizont · Methode',
    'layerCase_unresolved':'Der Schichtverlauf ist ungeklärt. Zuerst Material und lokale Tiefe bestimmen.',
    'layerCase_legacy':'Die ältere Ergänzung enthält keine vertikale Schichtbeschreibung. Eine lokale Beschreibung ist nötig, um die Ablagerung mit durchsuchbarem Boden zu verbinden.',
    'layerCase_variant':'Ein mariner Untercode ist nicht gesondert erklärt. Das Material klären, bevor ein bestimmter Schichtaufbau angenommen wird.',
    'layerCase_repeated':'Derselbe Bodencode wird wiederholt. GEUS kartiert Material in etwa einem Meter Tiefe, um unter den Pflughorizont zu gelangen. Der bearbeitete Boden muss weiterhin mit der Ablagerung verglichen werden.',
    'layerCase_cover-contact':'Verschiedene Ablagerungen, oben organisches Material oder Flugsand. Sowohl die eigene Bernsteinmöglichkeit des oberen Materials als auch den Zugang zur darunterliegenden Schicht untersuchen.',
    'layerCase_mixed-cover-contact':'Der obere Code umfasst mehrere Materialien, darunter organisches Material oder Flugsand. Sie können nebeneinander liegen; eine durchgehende Deckschicht ist nicht belegt.',
    'layerCase_sediment-contact':'Die Karte beschreibt einen vertikalen Unterschied innerhalb des obersten Meters. Auch zwei Sandschichten können unterschiedliche Ablagerungsgeschichten und Bernsteinzufuhr haben.',
    'layerStep_resolve-record':'Originalcodes oder widersprüchliche Angaben klären. Ein bekannter tieferer Code erklärt kein unbekanntes oberes Material.',
    'layerStep_local-profile':'Eine lokale Beschreibung mit Material, Tiefen, Ort und Datum suchen. Die Tiefen müssen auf das heutige Gelände und den sichtbaren oder bearbeitbaren Boden bezogen werden können.',
    'layerStep_resolve-variant':'Den marinen Untercode klären und tatsächlich vorkommende Materialien beschreiben. Der Untercode bestimmt allein keine Schichtmächtigkeit.',
    'layerStep_compare-worked':'Freigelegten oder bearbeiteten Boden mit der relevanten Schicht und der tatsächlichen Bearbeitungstiefe vergleichen. Regen kann bereits freigelegten Bernstein reinigen.',
    'layerStep_check-identity':'Gleiche Korngröße von derselben Ablagerung unterscheiden. Bernsteinzufuhr und Umlagerung mit genau dem freiliegenden Material verbinden.',
    'layerStep_upper-receiver':'Klären, ob die Bernsteinhypothese das obere Material, die darunterliegende Schicht oder beide betrifft. Jede Schicht braucht eine eigene mögliche Zufuhr- oder Umlagerungskette.',
    'layerStep_locate-contact':'Die Lage des Schichtkontakts zur heutigen Oberfläche bestimmen und mit Freilegung oder Bearbeitung vergleichen. Die Karte gibt keine genaue Kontakttiefe an.',
    'layerStep_separate-patches':'Zuerst die lokalen Teilflächen der Materialien in zusammengesetzten Codes unterscheiden. Danach mit einer lokalen Beschreibung den vertikalen Schichtkontakt klären.'
  },
  en:{
    layerAccessTitle:'How can the layer reach the surface?',
    layerAccessUpper:'Upper mapped material', layerAccessLower:'Material at about one metre',
    layerAccessMethod:'GEUS: mapping below the plough zone · method',
    'layerCase_unresolved':'The layer sequence is unresolved. Start by identifying the material and its local depth.',
    'layerCase_legacy':'The older supplement has no vertical layer description. A local profile is needed to connect the deposit to searchable soil.',
    'layerCase_variant':'A marine subcode is not separately explained. Establish the material before assuming a particular layer sequence.',
    'layerCase_repeated':'The same soil code is repeated. GEUS maps material at about one metre, chosen to reach below the plough zone. Cultivated soil still needs to be compared with the deposit.',
    'layerCase_cover-contact':'Different deposits have organic material or wind-blown sand above. Investigate both the upper material’s own amber possibility and access to the layer beneath.',
    'layerCase_mixed-cover-contact':'The upper code combines materials, including organic material or wind-blown sand. They may occur side by side; continuous cover across the entire area is not established.',
    'layerCase_sediment-contact':'The map describes a vertical difference within the top metre. Even two sand layers may have different depositional histories and amber supply.',
    'layerStep_resolve-record':'Resolve the original codes or conflicting record. A known deeper code does not resolve an unknown upper material.',
    'layerStep_local-profile':'Find a local description with materials, depths, location and date. Depths must relate to the present terrain and the soil that is visible or can be cultivated.',
    'layerStep_resolve-variant':'Resolve the marine subcode and describe the materials actually present. The subcode alone does not give bed thickness.',
    'layerStep_compare-worked':'Compare exposed or cultivated soil with the relevant layer and actual cultivation depth. Rain can clean amber that has already been brought out.',
    'layerStep_check-identity':'Distinguish the same grain size from the same deposit. Connect amber supply and reworking to the specific material exposed.',
    'layerStep_upper-receiver':'Establish whether the amber hypothesis concerns the upper material, the lower layer or both. Each layer needs its own possible supply or reworking chain.',
    'layerStep_locate-contact':'Locate the layer contact relative to today’s surface and compare it with exposure or cultivation. The map gives no exact depth to the contact.',
    'layerStep_separate-patches':'First distinguish the local patches of materials in combined codes. Then use a local profile to establish the vertical layer contact.'
  }
};
registerI18nMessages(Object.fromEntries(Object.entries(layerAccessMessages).map(([lang,entries])=>[lang,Object.fromEntries(Object.entries(entries).map(([key,value])=>[`jordrav.${key}`,value]))])));
messageKeys.push(...Object.keys(layerAccessMessages.da));

const landscapeNames = {
  lake:['See','Lake'], tillPlain:['Grundmoränenfläche','Till plain'], drumlin:['Drumlin','Drumlin'],
  tunnelValley:['Tunneltal','Tunnel valley'], esker:['Os','Esker'], deadIce:['Toteislandschaft','Dead-ice landscape'],
  kettle:['Toteisloch','Kettle hole'], lakeHill:['Eisstauseehügel','Glacial lake hill'],
  moraine:['Endmoränenhügel','Marginal moraine hill'], overridden:['Überfahrene Endmoräne','Overridden marginal moraine'],
  olderTill:['Ältere Moränenfläche','Older till plain'], outwash:['Sanderfläche','Outwash plain'],
  raisedPlain:['Gehobene spätglaziale Fläche','Raised Late Glacial plain'],
  hummockyOutwash:['Sanderfläche mit Toteisformen','Hummocky outwash plain'], erosionValley:['Erosionstal','Erosion valley'],
  iceLake:['Eisstauseefläche','Glacial lake plain'], raisedRidge:['Gehobener spätglazialer Strandwall','Raised Late Glacial beach ridge'],
  marine:['Marine Fläche','Marine plain'], marsh:['Marsch','Marsh'], ridge:['Strandwall','Beach ridge'],
  delta:['Delta','Delta'], lakePlain:['Seeboden','Lake plain'], bog:['Moor','Bog'], dune:['Düne','Dune'],
  windPlain:['Flugsandfläche','Aeolian plain'], tectonic:['Tektonisches Tal','Tectonic valley'],
  reclaimedLake:['Trockengelegter Süßwassersee','Drained freshwater lake'],
  reclaimedMarine:['Trockengelegtes marines Vorland','Drained marine foreland'],
  human:['Anthropogene Landschaft','Anthropogenic landscape'], tidalFlat:['Gezeitenfläche','Tidal flat'],
  tidalInlet:['Gezeitenrinne','Tidal inlet'], bedrock:['Grundgebirge','Bedrock'], chalk:['Kalkmassiv','Chalk massif'],
  missing:['Nicht kartiert','Not mapped']
};
const landscapeMessages = {
  da:{
    landscape:'Kortlagt landskabsform', landscapeRouteTitle:'Landskabets spor mod overfladen',
    landscapeUpperHistory:'Øvre aflejrings dannelse', landscapeMethod:'GEUS: landskabsformer og lokale lagprofiler', sedimentHistoryMethod:'GEUS: aflejringernes dannelse',
    'landscapeRoute_water':'Kortlagt sø: Undersøg eventuelle tørre bredaflejringer særskilt. Søformen dokumenterer ingen jagtbar markoverflade.',
    'landscapeRoute_till':'Undersøg omlejrede indslag i morænen og senere løse aflejringer. En strømlinet eller ældre moræneform beviser ingen lokal ravkoncentration.',
    'landscapeRoute_tunnel-valley':'Skeln mellem den gamle dals nedskæring og senere fyld. Muligt rav i dalsidens lag og i bundens yngre sedimenter har forskellige tilførselsveje.',
    'landscapeRoute_esker':'Undersøg de lokale lag i smeltevandsryggen. Sand og grus kan være sorteret, men rygformen angiver hverken ravtilførsel eller blotlægning.',
    'landscapeRoute_dead-ice':'Undersøg bakker og lavninger hver for sig. Senere bassin- eller dæklag kan have en anden ravhistorie end materialet i bakkerne.',
    'landscapeRoute_kettle':'Undersøg fyldet i den gamle dødislavning og tilførslen fra dens sider. Organisk fyld kan være modtager eller dække; lagkontakten skal afklares.',
    'landscapeRoute_lake-hill':'Undersøg lagdelingen i issøbakkens materiale og eventuelt yngre dække. Bakken giver ikke samme lagforløb som en nuværende søbund.',
    'landscapeRoute_ice-margin':'Undersøg, om sedimenter er afsat, opskubbet eller senere overkørt. Randmoræneformen alene viser ikke en opskubbet ravførende lagpakke ved overfladen.',
    'landscapeRoute_outwash':'Undersøg lokale smeltevandslag og yngre dalfyld eller flyvesand. Sandfladens udstrækning gør ikke hele aflejringen lige ravførende eller tilgængelig.',
    'landscapeRoute_erosion-valley':'Undersøg hvilket materiale senere vandløb eller skråningsprocesser kan have omlejret. En kortlagt erosionsdal beviser ikke aktiv erosion eller bar jord i dag.',
    'landscapeRoute_ice-lake':'Undersøg skift mellem bassinets fine lag og grovere tilførsel. Et tidligere issøbassin kan have andre overfladelag end dem, der dannede fladen.',
    'landscapeRoute_raised-plain':'Undersøg både den gamle havflade og senere aflejringer ovenpå. At fladen er hævet, gør ikke dens oprindelige materiale blotlagt eller pløjet.',
    'landscapeRoute_raised-ridge':'Undersøg den gamle bølgebyggede ryg, mellemrummene og yngre dække særskilt. Mulig samling af rav kræver en tilførselsvej til det relevante lag.',
    'landscapeRoute_marine':'Undersøg tidligere kyst-, lagune- eller havbundslag og senere dække. En bred marin flade skal ikke behandles som én strandvold med ens sortering.',
    'landscapeRoute_marsh':'Undersøg vekslende tidevands-, storm- og organiske lag særskilt. Muligt omlejret rav skal forbindes med det lag, der faktisk når overfladen.',
    'landscapeRoute_beach-ridge':'Undersøg bølgebyggede rygge og lavninger mellem dem hver for sig. Historisk kystsortering er en mulighed, men dokumenterer ingen nutidig ravmængde.',
    'landscapeRoute_delta':'Undersøg aflejringslag, løbsskift og modtagerbassin. Tilførsel fra vandløb og eventuel marin omlejring skal knyttes til det aktuelle materiale.',
    'landscapeRoute_lake-plain':'Undersøg bassinets tilførselslag og senere organisk eller mineralsk dække. Søbundsformen giver ingen præcis kontakt til den bearbejdede jord.',
    'landscapeRoute_bog':'Undersøg mosens eget modtagermateriale og lagene under det. Tørv kan både rumme omlejret materiale og skjule et andet muligt ravlag.',
    'landscapeRoute_dune':'Undersøg klittens sand og det underliggende landskab særskilt. Vindaflejret sand beviser hverken rav i sandet eller adgang til laget nedenunder.',
    'landscapeRoute_wind-plain':'Undersøg flyvesandets lokale tykkelse og det dækkede materiale. En flad overflade kan skjule en ældre hav- eller smeltevandsaflejring.',
    'landscapeRoute_bedrock':'Undersøg eventuelle løse aflejringer og lokale lommer særskilt. Fast bjergart eller en strukturel dal er ikke en ravførende sedimentkæde i sig selv.',
    'landscapeRoute_reclaimed-lake':'Undersøg tidligere sølag, senere tørv og eventuel påført jord. Tørlægning er ikke bevis for, at et muligt ravlag når pløjelaget.',
    'landscapeRoute_reclaimed-marine':'Undersøg tidligere fjord- eller havbundslag, senere dække og ændret terræn. Inddæmning og tørlægning giver ingen automatisk pløjeadgang til et muligt ravlag.',
    'landscapeRoute_human':'Undersøg fyld, flyttet jord og oprindeligt underlag særskilt. Et naturligt ravpotentiale kan ikke overføres direkte til et ændret terræn.',
    'landscapeRoute_tidal':'Undersøg sediment og eventuelt tørt land særskilt. Tidevandsformen dokumenterer ikke en tilgængelig mark og får ingen særskilt ravopgradering.',
    'landscapeRoute_unknown':'Landskabsformens navn og kode er ikke tilstrækkeligt afklaret i dette datagrundlag. Brug en lokal beskrivelse til at forbinde materialet med overfladen.',
    sedimentHistory_freshwater:'Postglacialt ferskvandsmateriale.', sedimentHistory_delta:'Postglacialt deltamateriale med ferskvands- og marin påvirkning.',
    sedimentHistory_marine:'Postglacialt marint materiale; underkoders fysiske variation kan stadig være uafklaret.',
    sedimentHistory_aeolian:'Postglacialt vindaflejret sand.', sedimentHistory_other:'Andre symboler; denne vejledning bestemmer ikke deres alder.',
    'sedimentHistory_late-marine':'Senglacialt marint materiale.', sedimentHistory_mixed:'Flere dannelsesgrupper eller andre symboler kombineret; afklar lokale delområder.',
    sedimentHistory_legacy:'Ældre kortsymbol; ingen automatisk alderstolkning fra den nyere symboloversigt.',
    sedimentHistory_unresolved:'Uafklaret materiale eller modstridende registrering.',
    'landscapeChronology_younger-on-raised':'Landformen er senglacial, mens det øvre symbol tilhører en postglacial gruppe. Undersøg en mulig senere aflejring eller omlejring; alderen på formen er ikke alderen på dagens øverste jord. Kortgrænser og registrering kan også spille ind.',
    'landscapeChronology_late-on-raised':'Den hævede form og det marine symbol har samme brede senglaciale tilknytning. Det beviser ikke samme lokale lag, ravtilførsel eller adgang til pløjelaget.',
    landscapeChronology_legacy:'Den ældre materialeoversigt og landskabskortet har forskellig detaljegrad. Formens alder daterer ikke det groft beskrevne materiale.',
    landscapeChronology_unresolved:'En kendt landskabsform løser ikke en ukendt jordart. Materiale og lagkontakt skal først afklares.',
    landscapeChronology_separate:'Landform og øvre aflejring beskriver forskellige forhold. Undersøg afsætning, senere omlejring og dække hver for sig; en gammel form beviser ingen aktuel blotlægning.'
  },
  de:{
    landscape:'Kartierte Landschaftsform', landscapeRouteTitle:'Der Weg von der Landschaft zur Oberfläche',
    landscapeUpperHistory:'Entstehung der oberen Ablagerung', landscapeMethod:'GEUS: Landschaftsformen und lokale Schichtprofile', sedimentHistoryMethod:'GEUS: Entstehung der Ablagerungen',
    'landscapeRoute_water':'Kartierter See: Trockene Uferablagerungen gesondert untersuchen. Die Seeform belegt keine durchsuchbare Feldoberfläche.',
    'landscapeRoute_till':'Umlagerte Einschlüsse in der Moräne und spätere Lockersedimente untersuchen. Eine ältere oder stromlinienförmige Moräne belegt keine lokale Bernsteinkonzentration.',
    'landscapeRoute_tunnel-valley':'Alten Taleinschnitt und spätere Füllung unterscheiden. Möglicher Bernstein in Hangschichten und jüngeren Bodensedimenten hat verschiedene Zufuhrwege.',
    'landscapeRoute_esker':'Lokale Schichten im Schmelzwasserrücken untersuchen. Sand und Kies können sortiert sein; die Rückenform belegt weder Bernsteinzufuhr noch Freilegung.',
    'landscapeRoute_dead-ice':'Hügel und Senken getrennt untersuchen. Spätere Becken- oder Deckschichten können eine andere Bernsteingeschichte als das Hügelmaterial haben.',
    'landscapeRoute_kettle':'Füllung der alten Toteissenke und Zufuhr von ihren Hängen untersuchen. Organische Füllung kann Empfänger oder Deckschicht sein; den Schichtkontakt klären.',
    'landscapeRoute_lake-hill':'Schichtung des Eisstauseehügels und jüngere Deckschichten untersuchen. Der Hügel hat nicht dieselbe Schichtfolge wie ein heutiger Seeboden.',
    'landscapeRoute_ice-margin':'Prüfen, ob Sedimente abgelagert, aufgeschoben oder später überfahren wurden. Die Endmoränenform allein belegt kein aufgeschobenes Bernsteinlager an der Oberfläche.',
    'landscapeRoute_outwash':'Lokale Schmelzwasserschichten, jüngere Talfüllungen und Flugsand untersuchen. Die große Sandfläche macht nicht die gesamte Ablagerung gleich zugänglich oder bernsteinführend.',
    'landscapeRoute_erosion-valley':'Material untersuchen, das spätere Wasserläufe oder Hangprozesse umgelagert haben könnten. Ein kartiertes Erosionstal belegt keine heutige Erosion oder nackten Boden.',
    'landscapeRoute_ice-lake':'Wechsel zwischen feinen Beckenschichten und gröberer Zufuhr untersuchen. Ein ehemaliges Eisstaubecken kann jüngere Oberflächenschichten haben.',
    'landscapeRoute_raised-plain':'Alte Meeresfläche und spätere Ablagerungen darüber untersuchen. Hebung belegt weder Freilegung noch Pflügen des ursprünglichen Materials.',
    'landscapeRoute_raised-ridge':'Alten Wellenrücken, Zwischenräume und jüngere Deckschichten gesondert untersuchen. Mögliche Bernsteinanreicherung benötigt eine Zufuhr zur betreffenden Schicht.',
    'landscapeRoute_marine':'Ehemalige Küsten-, Lagunen- oder Meeresbodenschichten und spätere Deckschichten untersuchen. Eine marine Fläche ist kein einheitlich sortierter Strandwall.',
    'landscapeRoute_marsh':'Gezeiten-, Sturm- und organische Schichten getrennt untersuchen. Möglichen umgelagerten Bernstein mit der tatsächlich oberflächennahen Schicht verbinden.',
    'landscapeRoute_beach-ridge':'Wellengeformte Rücken und Senken dazwischen getrennt untersuchen. Frühere Küstensortierung ist eine Möglichkeit, aber kein Beleg für heutige Bernsteinmengen.',
    'landscapeRoute_delta':'Ablagerungsschichten, Laufverlagerungen und Becken untersuchen. Flusszufuhr und mögliche marine Umlagerung auf das heutige Material beziehen.',
    'landscapeRoute_lake-plain':'Zufuhrschichten des Beckens und spätere organische oder mineralische Deckschichten untersuchen. Die Seebodenform bestimmt keinen Kontakt zum bearbeiteten Boden.',
    'landscapeRoute_bog':'Eigenes Empfängermaterial des Moors und darunterliegende Schichten untersuchen. Torf kann umgelagertes Material enthalten oder eine andere mögliche Bernsteinschicht verdecken.',
    'landscapeRoute_dune':'Dünensand und darunterliegende Landschaft getrennt untersuchen. Windabgelagerter Sand belegt weder Bernstein im Sand noch Zugang zur unteren Schicht.',
    'landscapeRoute_wind-plain':'Lokale Flugsandmächtigkeit und bedecktes Material untersuchen. Eine ebene Oberfläche kann ältere marine oder Schmelzwasserschichten verdecken.',
    'landscapeRoute_bedrock':'Lockersedimente und lokale Taschen gesondert untersuchen. Festgestein oder ein tektonisches Tal ist allein keine bernsteinführende Sedimentfolge.',
    'landscapeRoute_reclaimed-lake':'Frühere Seeschichten, jüngeren Torf und aufgetragenen Boden untersuchen. Trockenlegung belegt keinen Zugang zu einer möglichen Bernsteinschicht durch Pflügen.',
    'landscapeRoute_reclaimed-marine':'Frühere Fjord- oder Meeresbodenschichten, Deckschichten und verändertes Gelände untersuchen. Eindeichung und Trockenlegung belegen keinen Pflugzugang zu einer möglichen Bernsteinschicht.',
    'landscapeRoute_human':'Füllmaterial, versetzten Boden und ursprünglichen Untergrund getrennt untersuchen. Natürliches Bernsteinpotenzial gilt nicht automatisch für verändertes Gelände.',
    'landscapeRoute_tidal':'Sediment und gegebenenfalls trockenes Land gesondert untersuchen. Die Gezeitenform belegt kein zugängliches Feld und erhält keine zusätzliche Bernsteinbewertung.',
    'landscapeRoute_unknown':'Name und Code der Landschaftsform sind in dieser Datengrundlage nicht ausreichend geklärt. Das Material mit einer lokalen Beschreibung zur Oberfläche in Beziehung setzen.',
    sedimentHistory_freshwater:'Postglaziales Süßwassermaterial.', sedimentHistory_delta:'Postglaziales Deltamaterial mit Süßwasser- und Meereseinfluss.',
    sedimentHistory_marine:'Postglaziales marines Material; die physische Variation von Untercodes kann ungeklärt bleiben.',
    sedimentHistory_aeolian:'Postglazialer windabgelagerter Sand.', sedimentHistory_other:'Andere Codes; diese Anleitung bestimmt ihr Alter nicht.',
    'sedimentHistory_late-marine':'Spätglaziales marines Material.', sedimentHistory_mixed:'Mehrere Entstehungsgruppen oder andere Codes kombiniert; lokale Teilflächen klären.',
    sedimentHistory_legacy:'Code der älteren Karte; keine automatische Altersdeutung mit dem neueren Codeverzeichnis.',
    sedimentHistory_unresolved:'Ungeklärtes Material oder widersprüchlicher Eintrag.',
    'landscapeChronology_younger-on-raised':'Die Form ist spätglazial, der obere Code gehört zu einer postglazialen Gruppe. Spätere Ablagerung oder Umlagerung prüfen: Das Alter der Form datiert nicht den heutigen obersten Boden. Kartengrenzen und Einträge können ebenfalls eine Rolle spielen.',
    'landscapeChronology_late-on-raised':'Gehobene Form und mariner Code haben dieselbe breite spätglaziale Zuordnung. Das belegt weder dieselbe örtliche Schicht noch Bernsteinzufuhr oder Zugang zum Pflughorizont.',
    landscapeChronology_legacy:'Ältere Materialkarte und Landschaftskarte haben unterschiedliche Detailgrade. Das Formalter datiert das grob beschriebene Material nicht.',
    landscapeChronology_unresolved:'Eine bekannte Landschaftsform erklärt kein unbekanntes Material. Zuerst Material und Schichtkontakt klären.',
    landscapeChronology_separate:'Landschaftsform und obere Ablagerung beschreiben verschiedene Dinge. Ablagerung, spätere Umlagerung und Bedeckung getrennt untersuchen; eine alte Form belegt keine heutige Freilegung.'
  },
  en:{
    landscape:'Mapped landform', landscapeRouteTitle:'The landscape’s route to the surface',
    landscapeUpperHistory:'Upper deposit’s formation group', landscapeMethod:'GEUS: landforms and local layer profiles', sedimentHistoryMethod:'GEUS: deposit formation',
    'landscapeRoute_water':'Mapped lake: Investigate any dry shoreline deposits separately. A lake landform establishes no searchable field surface.',
    'landscapeRoute_till':'Investigate reworked inclusions in till and later loose deposits. A streamlined or older till landform establishes no local amber concentration.',
    'landscapeRoute_tunnel-valley':'Distinguish the old valley incision from later fill. Possible amber in slope layers and younger floor sediments has different supply routes.',
    'landscapeRoute_esker':'Investigate local layers in the meltwater ridge. Sand and gravel may be sorted, but the ridge establishes neither amber supply nor exposure.',
    'landscapeRoute_dead-ice':'Investigate hills and depressions separately. Later basin fills or cover may have a different amber history from the hill material.',
    'landscapeRoute_kettle':'Investigate the old kettle’s fill and supply from its sides. Organic fill may receive material or cover it; establish the layer contact.',
    'landscapeRoute_lake-hill':'Investigate bedding in the glacial lake hill and any younger cover. The hill does not have the same layer sequence as a present lake floor.',
    'landscapeRoute_ice-margin':'Establish whether sediments were deposited, thrust or later overridden. The marginal moraine alone does not prove a thrust amber-bearing stack at the surface.',
    'landscapeRoute_outwash':'Investigate local meltwater beds, later valley fill and wind-blown sand. A widespread sand plain does not make the entire deposit equally amber-bearing or accessible.',
    'landscapeRoute_erosion-valley':'Investigate material that later streams or slope processes may have reworked. A mapped erosion valley proves neither active erosion nor bare ground today.',
    'landscapeRoute_ice-lake':'Investigate changes between fine basin beds and coarser inflow. A former glacial lake basin may have different present surface layers.',
    'landscapeRoute_raised-plain':'Investigate both the old marine plain and later deposits above it. Uplift does not establish exposure or ploughing of its original material.',
    'landscapeRoute_raised-ridge':'Investigate the old wave-built ridge, gaps and younger cover separately. Possible amber accumulation requires supply to the relevant bed.',
    'landscapeRoute_marine':'Investigate former coastal, lagoon or seabed layers and later cover. A broad marine plain is not one uniformly sorted beach ridge.',
    'landscapeRoute_marsh':'Investigate tidal, storm and organic layers separately. Connect possible reworked amber with the layer that actually reaches the surface.',
    'landscapeRoute_beach-ridge':'Investigate wave-built ridges and depressions between them separately. Historic coastal sorting is a possibility, but establishes no present amber quantity.',
    'landscapeRoute_delta':'Investigate depositional beds, channel changes and receiving basin. Relate river supply and any marine reworking to the present material.',
    'landscapeRoute_lake-plain':'Investigate basin supply beds and later organic or mineral cover. The lake-floor landform establishes no exact contact with cultivated soil.',
    'landscapeRoute_bog':'Investigate the bog’s own receiving material and layers beneath. Peat may hold reworked material or conceal another possible amber bed.',
    'landscapeRoute_dune':'Investigate dune sand and the underlying landscape separately. Wind-blown sand proves neither amber in the sand nor access to the lower bed.',
    'landscapeRoute_wind-plain':'Investigate local wind-blown sand thickness and covered material. A flat surface may conceal older marine or meltwater deposits.',
    'landscapeRoute_bedrock':'Investigate loose deposits and local pockets separately. Bedrock or a structural valley alone is not an amber-bearing sediment chain.',
    'landscapeRoute_reclaimed-lake':'Investigate former lake beds, later peat and any imported soil. Drainage does not prove that a possible amber bed reaches cultivated soil.',
    'landscapeRoute_reclaimed-marine':'Investigate former fjord or seabed layers, later cover and changed terrain. Embankment and drainage do not give automatic plough access to a possible amber bed.',
    'landscapeRoute_human':'Investigate fill, moved soil and original substrate separately. Natural amber potential cannot be transferred directly to altered terrain.',
    'landscapeRoute_tidal':'Investigate sediment and any dry land separately. The tidal landform establishes no accessible field and receives no additional amber upgrade.',
    'landscapeRoute_unknown':'The landform name and code are not sufficiently resolved in this dataset. Use a local description to connect the material to the surface.',
    sedimentHistory_freshwater:'Postglacial freshwater material.', sedimentHistory_delta:'Postglacial delta material with freshwater and marine influence.',
    sedimentHistory_marine:'Postglacial marine material; physical variation of subcodes may remain unresolved.',
    sedimentHistory_aeolian:'Postglacial wind-blown sand.', sedimentHistory_other:'Other symbols; this guide does not determine their age.',
    'sedimentHistory_late-marine':'Late Glacial marine material.', sedimentHistory_mixed:'Several depositional groups or other symbols combined; establish the local patches.',
    sedimentHistory_legacy:'Older map symbol; no automatic age inference from the newer symbol list.',
    sedimentHistory_unresolved:'Unresolved material or conflicting record.',
    'landscapeChronology_younger-on-raised':'The landform is Late Glacial, while the upper symbol belongs to a postglacial group. Investigate possible later deposition or reworking: the form’s age does not date today’s uppermost soil. Map boundaries and records may also play a role.',
    'landscapeChronology_late-on-raised':'The raised form and marine symbol share a broad Late Glacial association. This does not prove the same local bed, amber supply or access to cultivated soil.',
    landscapeChronology_legacy:'The older material map and landform map have different levels of detail. The landform’s age does not date the broadly described material.',
    landscapeChronology_unresolved:'A known landform does not resolve unknown soil material. Establish the material and layer contact first.',
    landscapeChronology_separate:'Landform and upper deposit describe different things. Investigate deposition, later reworking and cover separately; an old form proves no present exposure.'
  }
};
for(const [key,definition] of Object.entries(LANDSCAPES)) {
  landscapeMessages.da[`landscapeName_${key}`]=definition.name;
  landscapeMessages.de[`landscapeName_${key}`]=landscapeNames[key][0];
  landscapeMessages.en[`landscapeName_${key}`]=landscapeNames[key][1];
}
registerI18nMessages(Object.fromEntries(Object.entries(landscapeMessages).map(([lang,entries])=>[lang,Object.fromEntries(Object.entries(entries).map(([key,value])=>[`jordrav.${key}`,value]))])));
messageKeys.push(...Object.keys(landscapeMessages.da));
