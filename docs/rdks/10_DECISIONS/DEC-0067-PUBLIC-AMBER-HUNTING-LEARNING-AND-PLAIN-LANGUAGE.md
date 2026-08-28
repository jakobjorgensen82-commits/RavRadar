# DEC-0067: Det offentlige læringsmodul er en grundbog i ravjagt

**Status:** PRODUKTIONSVERIFICERET I 4.0.268

**Dato:** 2026-08-24

**Scorepåvirkning:** Nej. Candidate G, `20/50/30`, vejrdata, geometri, land-/vandpunkter og privat datakontrakt ændres ikke.

## Ejerens retning

Læringsmodulet skal ikke først og fremmest lære brugeren at bruge RavRadar. Det skal lære begyndere og øvede alt det, projektet aktuelt ved om ravjagt: ravets egenskaber, mobilisering, transport, vind, bølger, strøm, vandstand, kystformer, felttegn, strandjagt, vandkant, waders, UV-lys og hændelsesforløb. RavRadar og RavScore må forklares bagefter som et værktøj, der omsætter en del af denne viden.

## Beslutning

- `learn.html` er et selvstændigt offentligt modul fra **havbund til fund**.
- Fagligheden kommer før appen: ravets og havets processer, kysten, felttegn og selve jagten står før RavScore.
- Den kausale hovedforklaring er: **Bølger kan mobilisere. Strøm transporterer. Kysten sorterer og samler.** Vind virker især gennem bølger, overfladelag, vandstand og søgeforhold.
- Modulet må ikke lære én universel dansk vind- eller strømretning. Alle retninger skal forstås i forhold til den konkrete kyst og det forudgående forløb.
- Myten om, at vinterens kolde vand i sig selv får det meste rav til at flyde, afvises. Densitet, størrelse, form, saltindhold og bundkontakt beskrives som et spænd.
- Felttegn som frisk opskyl, tang, træ, frø, kul, skaller og sorterede linjer forklares som spor, ikke som fundgaranti.
- Praktiske metoder dækker strand, vandkant, waders og UV omkring 395 nm. UV er et spor, ikke et endeligt ægthedsbevis; ødelæggende hjemmetests frarådes. Bølgelængden er korrigeret af DEC-0103.
- Candidate G forklares til sidst med den aktive `20/50/30`-vægtning, waders-vindkurven og den ejerbesluttede udtransportregel. Det fremgår, at disse er RavRadars testede arbejdsregler og ikke universelle naturgrænser.
- Direkte forskning i naturlig ravtransport er begrænset. Modulet skal synligt skelne dokumenteret viden, stærk kystfysisk analogi, praktisk erfaring og åbne spørgsmål.
- RavRadars grænse i forhold til sikkerhed forklares ét samlet sted. Der bygges ingen særskilt offentlig sikkerhedsscore, og delscoreforklaringerne må ikke gentage advarslen.

## Kildegrundlag

Grundbogen genbruger projektets kvalitetssikrede evidensregister og er suppleret med primære kilder om:

- kontrollerede forsøg med ravs bundtransport,
- lavdensitetspartikler gennem revle og brændingszone,
- baltisk strandopskyl gennem stormens opbygnings- og aftagende faser,
- bølgeretning og langsgående kysttransport,
- baltisk ravs massefylde og UV-fluorescens,
- DMI's WAM-/DKSS-kontrakter og Kystdirektoratets kystdynamik.

Kildelinks vises i modulet. Formuleringer om lokale danske revler, render og jægerens feltmetode markeres ikke som eksakte naturgrænser.

## Almindeligt dansk

Den samtidige sproggennemgang erstatter blandt andet offentlig standardtekst om `fallback`, `datasæt`, databaseleverandør og interne scoreposter med forklaringer af, hvad brugeren oplever. Bevidst tekniske admin- og debugværktøjer er ikke omskrevet til almindelig brugerflade.

## Gates

- `test:public-learning` kræver emnedækningen, rækkefølgen, den aktive scoreforklaring, mobilopsætning og fravær af gammel vægtning og internt standardsprog.
- `test:huntability-safety-copy` kræver én samlet sikkerhedsafgrænsning og ingen gentaget offentlig sikkerhedsscore.
- Releasegaten kører læringstesten, og ændringen kræver exact-head, frisk produktion samt relevant desktop-/mobil- og 210/673-onlinekontrol.
- PR #116 bestod exact-head `32670857438` på source-head `c810155b` og blev merged som `5a2f7796`.
- Første produktion `32670920742` stoppede korrekt før release og deploy: den fulde validering fandt, at den gamle rangeringstest stadig krævede den tidligere tekniske hjælpetekst, selv om brugerfladen nu viste den besluttede almindelige forklaring.
- Gatekorrektionen kræver den nye almindelige sætning og kører rangeringstesten allerede i `validate:source`, så samme kontraktbrud fremover opdages før vejropbygningen.
- PR #117 bestod exact-head `32671863965` på `fa2d23dd` og blev merged som `21acb0a2`. Produktion `32671924885` kom forbi rangeringstesten, men stoppede fortsat før deploy på en anden ældre ordret kontrakt: stateforklaringstesten krævede overskriften **Hvad skete før nu?** i stedet for den nye **De seneste timers betydning**.
- Den anden testkontrakt rettes tilsvarende og føjes til `validate:source`. Hele testsamlingen, der direkte læser de ændrede offentlige moduler, køres målrettet før næste PR for at undgå én produktionskørsel pr. forældet formulering.
- Den målrettede gennemgang omfatter 29 direkte UI-/auth-/konto-/assistent-/startup-tests. Den fandt også den historiske, ikke-gatede 4.0.240-sikkerhedstest, som krævede gentagne advarsler i strid med den nye ejerbeslutning; den historiske indgang viderestiller nu til den gældende 4.0.268-kontrakt. Hele den direkte testgruppe er grøn.
- PR #118 bestod den samlede exact-head-kildegate i kørsel `32672522334` på source-head `8faccce3` og blev merged som `3c22e40b`.
- Frisk produktion `32672578127` bestod central hydrering, DMI/Copernicus, frisk vejr, fuld projektvalidering, releasegate, supportartifact, Pages-artifact og deploy.
- Live datasæt `rr-20260823230848-210` er version 4.0.268 med 210 zoner og 673 kystdele. Den fulde offentlige browseraudit bestod 420 aktuelle visninger, 2.100 femdøgnsvisninger og 673 kystdelsreferencer med nul kontrol-, konsol-, side- eller HTTP-fejl.
- Den lokale desktop- og 390×844-kontrol bestod uden vandret overløb. Den midlertidige browservisning blev nulstillet efter kontrollen.

De to stoppede produktionsforsøg var ikke udgivelser. De beviser, at de fulde gates afviste modstridende gamle testkontrakter før artifact og deploy. 4.0.268 er først produktionsverificeret ved merge `3c22e40b` og kørsel `32672578127`.
