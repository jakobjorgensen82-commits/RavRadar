# DEC-0032 – Kystgeometri v2, lokale kystdele og sikker migration

**Status:** AKTIV / GODKENDT TIL SCORE-NEUTRAL PILOT
**Registreret:** 2026-08-08
**Prioritet:** P1, før landsdækkende geometriændring

## Formål
RavRadars nuværende zoner, navne og kystlinjer er ikke tilstrækkeligt geografisk konsistente. Der findes fejlnavngivne og fejlplacerede zoner, utilsigtede overlap og kystlinjer, som er for grove eller bygger videre på ældre AI-tegnet geometri. Systemet skal derfor have en reproducerbar, revisionsbar og administratorredigerbar geometri v2.

## Produktdefinition
1. Den synlige kystlinje repræsenterer relevante ravsøgningsstrækninger, ikke enhver fysisk vandkant.
2. Linjen må springe over havne, åudløb og andre strækninger uden relevant ravstrand. Kunstige moler og havnebassiner skal ikke tvinge den lokale kystretning.
3. Indre fjorde udelukkes. Limfjorden er den eneste fjord, der indgår som ravområde. Afgrænsningen ved fjordmundinger og andre tvivlsomme indre farvande skal være eksplicit og revisionsbar, ikke skjult i en heuristik.
4. Kystlinjen placeres på landsiden af den anvendte kystreference inden for et dokumenteret lokalt afstandsbånd. En universel påstand om præcis samme meterafstand langs hele Danmark er ikke tilladt.
5. Zoner skal følge geografisk meningsfulde kystafsnit. Utilsigtede overlap, fuldt indlejrede zoner og geografiske huller er fejl. Bevidste undtagelser kræver en navngiven begrundelse.
6. De eksisterende tekniske zone-ID'er bevares som udgangspunkt. Navn, geometri og placering må korrigeres. Hvis et ID ændrer geografisk betydning væsentligt, kræves en eksplicit migrationspost, så historik, observationer, regler og modeltilpasning ikke blandes ukritisk.
7. Zonenavne skal kontrolleres mod zonens faktiske geografi og autoritative danske stednavne. Eksisterende navn er ikke facit.

## Lokale kystdele og datapunkter
En zone kan have flere navngivne kystdele, når kystretning, eksponering, vind eller strøm gør ét fælles punkt misvisende. Navne skal være lokalt forståelige, eksempelvis `Sydøst for <sted>` og `Sydvest for <sted>`.

Hver kystdel skal mindst kunne bære:

- stabilt del-ID og navn;
- den tilhørende kystgeometri eller kædelængdeinterval;
- landpunkt, marint forespørgselspunkt og lokal pålandsretning;
- vægt/udstrækning med forklaring;
- kilde, genereringstid, kvalitetsstatus og eventuel administratoroverride;
- separat DMI-/fallback-proveniens, hvis kystdelen får sin egen vejrsampling.

Den nuværende multi-ankerfunktion er ikke i sig selv tilstrækkelig som ny datamodel. Den kan vælge mellem lokale retninger, men den almindelige vejrpipeline bygger fortsat primært én zoneserie. En v2-pilot må derfor ikke fremstille flere ankre som selvstændige vind-/strømmålinger, før sampling, merge, provenance, score og UI faktisk er ført igennem pr. kystdel.

## Høfder, moler og andre ravfælder
Høfder, læsider af konstruktioner, odder og andre lokale koncentrationssteder kan være relevante ravfælder. De registreres som en separat, score-neutral morfologi-/featurehypotese med placering og evidensstatus. De må ikke automatisk tegnes ind som fysisk kystlinje, og de må ikke ændre RavScore under geometriarbejdet. Eventuel scorevirkning hører under DEC-0029 og kræver særskilt forskning, godkendelse og validering.

## Autoritativ kilde og licens
GeoDanmarks objekttype `Kyst` er pilotens primære grundreference. Den officielle model definerer den som grænsen mellem hav og land, leverer kurvegeometri i EPSG:25832 og udstiller aktuelle data via den entitetsbaserede GeoDanmark Vektor WFS. Adgangen kræver Datafordeler API-key eller OAuth. Frie GeoDanmark-data er under CC BY 4.0 og skal krediteres. Den permanente kilde- og adgangsaudit findes i `docs/research/COASTAL_GEOMETRY_V2_SOURCE_AUDIT.md`.

RavRadar er gratis og må ikke afhænge af betalte geodata, købte filudtræk eller en betalingsplan. En gratis bruger/API-nøgle er acceptabel som teknisk adgang, men kilden skal fortsat være gratis at anvende, cache og aflede efter sine vilkår. Kildeadapteren skal være udskiftelig, og manglende gratis adgang skal stoppe genereringen frem for at aktivere en betalt eller ringere skjult fallback.

GeoDanmark må ikke forespørges i RavRadars hyppige vejr-/deployloop. Det køres kun som et særskilt `geometry-v2-pilot`-job ved en eksplicit manuel workflow_dispatch. Jobbet hydrerer først central admingeometri og tombstones, læser kun `DATAFORDELER_API_KEY` fra GitHub Secrets og uploader kun et privat pilotartifact uden nøgle. Jobbet har ikke Pages-skriverettigheder og kan ikke ændre RavScore eller offentlig produktion.

Ortofoto må bruges som kontrolkilde, men en automatisk billedfortolkning må ikke uden kvalitetsbevis kaldes autoritativ kystlinje. Kildens fysiske kyst, RavRadars fravalgsmasker og den afledte ravstrandlinje skal bevares separat.

## Ikke-destruktiv arbejdsform
1. Produktionsfilen `data/zones.geojson` og centralt gemte adminændringer ændres ikke i pilotens analysefase.
2. Piloten bygges i et parallelt, tydeligt markeret v2-arbejdsdatasæt med kilde- og generationsmanifest.
3. Centralt gemte administratorændringer er runtime-sandhed. En national generator må aldrig overskrive dem tavst. V2 skal kunne anvende dem som et eksplicit sidste overlay eller sende konflikter til review.
4. Admin skal fortsat kunne ændre navn, kystlinje, land-/vandpunkter, lokale kystdele og retninger samt bruge historik og rollback.
5. Ingen v2-geometri må aktiveres i produktion, før admin-roundtrip, DMI-kæder, vandstandsrouting, score/state, regler, feedback, public runtime, tests, artifact og deployment er valideret samlet.

## Pilot og stopregel
Piloten skal mindst dække tre forskellige miljøer: en åben vestkyst/Vadehavstype, en kompleks Limfjordsstrækning og en ø-/østkyst med kendt navne- eller placeringsfejl. Den skal måle:

- kystdækning én gang og kun én gang;
- overlap, indlejring, huller og selvkryds;
- lokal afstand og korrekt side af kystreferencen;
- korrekt spring over fravalgte havne/åer og korrekt fjordeksklusion;
- navne- og ID-migration;
- land-/vandpunkter mod faktisk land/vand og gyldige DMI-celler;
- forskelle i vejrkomponenter mellem lokale kystdele;
- central admin-readback og konfliktfri override;
- uændret RavScore, medmindre en senere særskilt beslutning godkender andet.

Efter piloten skal resultat, undtagelser og resterende manuel reviewmængde fremlægges. Landsdækkende omskrivning må ikke begynde automatisk. Den kræver en særskilt go/no-go-beslutning.
