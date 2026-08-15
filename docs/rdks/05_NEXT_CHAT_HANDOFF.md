# RavRadar – overlevering til næste chat

## Start her

Læs `AGENTS.md`, `docs/ai/CODEX_START_HERE.md`, den obligatoriske RDKS-kæde samt DEC-0024, DEC-0030, DEC-0031, DEC-0037, DEC-0038 og DEC-0039. Kontrollér derefter gitstatus, seneste commit og GitHub Actions.

## Aktuel sandhed

- 4.0.228 er produktionsverificeret i #31913779486/#2835 på commit `93b8c0216821d02bf913f7aab369406ba2365fe9` med central adminhydrering, frisk DMI, fulde gates, Supabase og Pages.
- Fra zoomniveau 9 viser kortet flere lokale vind- og strømpile, men kun ved kystdelenes egne eksakt parrede DMI-U/V-gitterpunkter. Vindkilden kan være HARMONIE eller den faktisk anvendte DKSS-`wind-tail`-serie og mærkes særskilt.
- Fjernzoom bevarer hovedzonernes oversigtspile. Fallbackankre og kunstige kopier må ikke skabe ekstra tæthed.
- Den fulde detaljepakke opdaterer automatisk pilelaget. DMI-værdier, forecast, RavScore, historik og geometri er uændrede.
- Produktcommit `bb1892e4072deb77dbc83a203587221c666013d2` førte først til #2830: forsøg 1 stoppede på en delvis Limfjordshentning med 629/673 lokale strømpunkter; forsøg 2 nåede 670/673, men stoppede før Pages på gentaget Supabase `57014`.
- Artifactauditten fandt derefter, at DKSS-`wind-tail-u/v` ikke blev ført til lokale vindpunkter. Commit `93b8c021` rettede transporten. #2835-artifact og livefiler har 670 eksakte strøm- og vindpunkter uden mismatch, 461/544 unikke gitterpunkter og matchende manifesthashes.
- Livebrowseren havde nul konsolfejl og viste 54 pile på oversigten mod 87 efter to zoomtrin.

## Ejerens parallelle arbejde

- Ejeren gennemgår land-/vandpunkter zone for zone. Centralt godkendte punkter er autoritative og skal hydreres før hvert frisk produktionsbuild.
- Fem-døgnsdækning og historikanalyse er midlertidigt udsat, indtil mere naturligt datagrundlag er opsamlet. Dataopsamling og eksisterende gates fortsætter; intet må bagudfyldes eller skjules.

## Første opgave i næste chat

1. Kontrollér at evidenscommitten efter #2835 er på `main`, og at dens normale opfølgningskørsel ikke har afsløret en regression.
2. Lad ejerens manuelle punktreview fortsætte sideløbende uden automatisk national genopdeling.
3. Vælg næste uafhængige roadmapopgave; fem-døgns-/historikanalysen forbliver midlertidigt udsat efter ejerbeslutningen.

## Beskyttede beslutninger

- Ét autoritativt land-/havpunktpar pr. aktiv kyststrækning; bugtede kyster vurderes repræsentativt af ejeren.
- Flere kortpile kræver flere faktiske dokumenterede DMI-gitterpunkter; pile må ikke kopieres eller flyttes.
- Central adminstatus er autoritativ, `missing` forbliver `missing`, og ingen gate må svækkes for at få grønt.
- Kritisk arbejde udføres med GPT-5.6 Sol og Ekstra høj indsats.
