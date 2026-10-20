# User Data & Analytics 1.0

## 20. oktober 2026 – leveret kontofundament, statistik fortsat OFF

4.0.585's kontrollerede metadata-, Worker-, serverfunktions- og offentlige levering er gennemført. Den normale browserprøve bekræfter default ON, gemt OFF, bevaret OFF efter genindlæsning og gendannet ON med serverkvittering. Det er ikke logout/login-, fuldt tur-/eksport- eller anonymitetsbevis. Statistikpræferencen aktiverer ikke i sig selv statistisk behandling, og 004/005 er ikke installeret af leveringen.

Den nye sletteadgangsrettelse er en særskilt lokal kildekandidat med normal CLI-regression, ikke udført tur-/konto-/backup-sletning. Samlet statistik og automatisk retention forbliver inaktive; mailafsender, varsel, login-redning og backupfrister skal stadig færdiggøres. Alle fem hovedmål er åbne til 18. november 2026. Den følgende lokale forberedelsesstatus bevares som historik; dens drifts- og anonymitetskrav består.

## 20. oktober 2026 — lokal varig forberedelse, ikke aktiveret statistik

Den eksisterende private, signerede operatørkalder forbereder input i afgrænsede trin med de uændrede tids-, række-, byte- og forespørgselsgrænser. Et kvitteret, faktisk gemt job kan fortsætte over månedsskifte. Serveren vælger det ældste ventende job gennem den normale kontrollagerlæsning; klienten kan ikke bestille oprettelse af vilkårlige gamle perioder. En gammel periode i verify er alene en locator til et eksisterende færdigt job og dets allerede frosne forslag.

Friske konto-/samtykkeinventarer, slettebarrieren, modelbinding og inputgrundlag kontrolleres igen. Kun en gyldig, strengt nyere fremdriftskvittering tillader næste trin. Timeout, ukendt skriveudfald eller afslag stopper uden automatisk gentagelse; senere normal fortsættelse skal afklare den varigt gemte tilstand. Sidste scan-kvittering er fortsat pending; reduktion og forslag må først ske i en separat afgrænset kaldelse.

Dette er lokal kildeintegration med bestået afgrænset regression, ikke en installeret 004/005, offentlig statistik, påvist anonymitet eller målt Worker-kapacitet. Præcis samlet kildekontrol og de særskilte drifts-/frigivelseskrav mangler. Automatisk sletning forbliver fra uden fungerende mailvarsel; en kontaktadresse er ikke en installeret afsender. Originale ture, udstedte migrationsfiler og tidligere offentliggjorte scorer bevares.

## Formål
At kunne undersøge hvor, hvornår og under hvilke forløb rav registreres, samt forbedre algoritmen uden at gøre enkeltbrugeres adfærd offentlig.

## Analyseprincipper

- Skeln mellem fund og manglende fund; begge er værdifulde, men manglende fund er ikke sikkert bevis på manglende rav.
- Registrér søgeindsats, når muligt: varighed, jagtform og dækket strækning.
- Undgå leakage: en regel må ikke evalueres på de samme observationer, som den blev udledt fra.
- Brug tidsopdelte datasæt og geografiske kontrolzoner.
- Rapportér datamængde og usikkerhed sammen med resultater.

## Standardudtræk
Se `schemas/analysis-export.schema.json`. Udtrækket kan efterfølgende gives til en analysemodel sammen med en beskrivelse af den konkrete hypotese.

## Fysisk lager og identitetsgrænse

Supabase er fortsat identitetssandhed. Normal turdata ligger i ti EU-låste D1-shards under et versionsbåret HMAC-pseudonym. Direkte bruger-id, anonym-id, mail, navn, JWT, GPS, rute, fri tekst og billeder må ikke nå D1. Analyse må aldrig forsøge at vende pseudonymet eller koble det til Supabase-identitet.

En brugerhenvendelse om sletning håndteres med den eksplicit bekræftede driftskommando, som sletter og verificerer både D1 og Supabase uden payloadlog. Se DEC-0082.
