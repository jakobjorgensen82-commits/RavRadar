# Current truth – gældende projektviden

Denne fil er første opslag ved en ny chat. Den indeholder kun gældende sandhed og udtrykkeligt planlagte næste skridt. Historik findes andre steder i RDKS.

## Projekt og evidens
- RavRadar er beslutningsstøtte til ravjagt og lover ikke fund.
- Faglige udsagn mærkes som dokumenterede, observerede, hypoteser eller validerede i RavRadar.
- Nye idéer må ikke blive produktionslogik uden test, forklaring og versionsspor.

## Data
- DMI er autoritativ dansk kilde. Open-Meteo er fallback.
- Forecastkomponenter behandles separat og merges på canonical UTC-timer.
- Timevis pendlen mellem udbydere er uacceptabel.
- 118–119 timer er en gyldig femdøgnshorisont.
- Store Vadehavssvingninger kan være tidevand og må ikke automatisk udglattes.

## Retninger og geometri
- Vindretning er hvor vinden kommer fra.
- Strømretning er hvor vandet bevæger sig hen.
- Pålandsretning går fra hav mod land.
- Hver zones geometri kan stadig være lokalt forkert, selv om konventionen er korrekt.
- Hav-/landpunktsfunktionen må ikke ændres på baggrund af en forklarende diskussion alene.

## Zoner og kyst
- Ét officielt detaljeret zoneregister bruges overalt.
- Brede førstegenerationszoner er udfaset.
- Als Odde og Helberskov ligger nord for Mariager Fjord mod Øster Hurup.
- Kysteditoren skal bevare præcisionsredigering, lokale krumninger, historik og rollback.

## Stationer
- Alle kendte DMI-stationer bevares med status; midlertidigt tavse stationer skjules ikke.
- DMI-registerstatus, observationsstatus og prognose-/cachestatus er forskellige.
- Automatisk routing kræver dokumenteret brugbarhed og må ikke uden videre bruge historiske/inaktive stationer.
- Adminoverride erstatter automatik, når override opfylder de valgte leveringskrav.
- Nye stationer, udfald, genoptagelse og potentielt bedre routing skal skabe meningsfulde tilstandsnotifikationer.
- En station kan fortsat være prognosebrugbar, så længe dens cachedata er gyldige, selv om en ny observation mangler. Admin viser observationsstatus, cacheudløb og samlet anvendelighed.

## RavScore
- Scoren skal kunne forklares fra rådata til slutscore.
- Transport, frigivelse, koncentration/aflejring og jagtbarhed skal holdes begrebsligt adskilt.
- Statiske kystforhold må ikke skabe en høj score uden dynamisk transportgrundlag.
- Mistænkelige høje scorer og naboforskelle auditeres.

## Admin
- Admin er menneskeførst og skal kunne bruges uden intern systemviden.
- Regelbyggeren skal forklare felt, effekt, eksempel, geografi, prioritet og konflikt.
- Dialoger skal kunne lukkes via kryds, Annuller, Escape og klik udenfor.
- Centrale ændringer skal have versionshistorik og rollback.

## Projektarbejdsgang
- Læs RDKS og håndbog før analyse og kodeændringer.
- Ved hver ny version importeres samtaledeltaet automatisk til RDKS, changelog og relevante håndbogsafsnit.
- Gamle chats er historiske kilder; forældede løsninger må ikke genindføres.
- Ved konflikt gælder: brugerens aktuelle instruktion > aktiv RDKS > verificeret aktuel kode > håndbog > changelog > historiske chats.
## Release Governance
- En version må ikke erklæres færdig eller leveres som ZIP, før `npm run validate` og `npm run release:gate` er grønne.
- GitHub-secrets bevares i repository-indstillinger og må aldrig medtages i kode eller ZIP.
- CI-fejl skal føre til samlet audit af hele releasekæden.
- Leverancepakker må aldrig indeholde `.git`.

## Eget domæne
- Den planlagte offentlige adresse er `https://ravradar.dk`.
- GitHub Pages kan fortsat hoste siden; koden skal være domæneagnostisk.
- CNAME og DNS aktiveres først efter Supabase redirect- og domænetest.

## Accepttest og håndbogssprog
- Admin har en samlet funktionstest, som kontrollerer deploy, aktuelle data og central Supabase-readback med oprydning.
- Håndbogen skal skrives i almindeligt dansk. Fagord forklares, og ekspertens opgave skal altid være konkret.

- Diagnostik skal navngive konkrete fejl og må ikke kalde browsercache eller en bevidst sprunget observationskørsel for datatab.

## Strømpile og modelproveniens
- En strømretning er en oceanografisk mod-retning: 0° nord, 90° øst.
- DMI-strømpile må kun stå ved det marine gitterpunkt, som leverede både current-u og current-v.
- Kunstige pilekopier omkring zoner er forbudt, fordi de antyder målinger, som ikke findes, og kan placere pile på land.
- DMI-pile uden dokumenteret gitterpunkt skjules. Fallback må kun vises ved det punkt, fallbackudbyderen faktisk blev forespurgt på.
- Rå u/v-komponenter skal bevares i den fulde diagnosekæde, så hastighed og retning kan efterprøves.

## Admininitialisering og sitetest
- Oversigt skal renderes straks efter godkendt adgang og opdateres efter fuld dataindlæsning.
- Sitetesten må først skifte faner efter eksplicit admin-ready-markør.
- Browserdialoger fra den isolerede test må ikke vises på den synlige adminside.

## Strømproveniens og manglende værdier
- Manglende `current-u` eller `current-v` er ukendt data, ikke fysisk nulstrøm.
- En time kaldes kun verificeret, når begge DMI-komponenter kan knyttes til samme gitterpunkt og gyldigt tidspunkt.
- Ikke-verificerbare timer bevarer deres eksisterende viste strøm, men må ikke bære rå u/v-felter eller fremstilles som videnskabeligt verificerede.

## Strømvektor og scorekonsistens – 4.0.85
- DMI `current-u/current-v` er den autoritative fysiske strømvektor, når proveniensen er `verified`.
- Der findes kun én kanonisk lagret vektor pr. time: `currentUMps/currentVMps` afrundet til den aftalte præcision.
- `currentSpeedMps` og `currentDirectionDeg` skal altid afledes fra præcis de lagrede komponenter, ikke fra en skjult højere præcision.
- RavScore, kortpil, debug og audit skal derfor kunne genskabe samme hastighed og retning fra de samme felter.
- Strømretning ved næsten nul hastighed er fysisk og numerisk svagt bestemt; den må ikke få særskilt autoritet frem for komponenterne.
