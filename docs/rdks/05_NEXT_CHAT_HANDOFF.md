# RavRadar – overlevering til næste chat

## Start her

Læs `AGENTS.md`, `docs/ai/CODEX_START_HERE.md`, den obligatoriske RDKS-kæde samt DEC-0024, DEC-0030, DEC-0031, DEC-0037, DEC-0038 og DEC-0039. Kontrollér derefter gitstatus, seneste commit og GitHub Actions.

## Aktuel sandhed

- 4.0.227 er produktionsverificeret i #31908498204/#2824 med 210 zoner, 673 kyststrækninger, frisk DMI, fulde gates, Supabase og Pages.
- 4.0.228-kandidaten viser fra zoomniveau 9 flere lokale vind- og strømpile, men kun ved kystdelenes egne eksakt parrede DMI-U/V-gitterpunkter. Vindkilden kan være HARMONIE eller den faktisk anvendte DKSS-`wind-tail`-serie og mærkes særskilt.
- Fjernzoom bevarer hovedzonernes oversigtspile. Fallbackankre og kunstige kopier må ikke skabe ekstra tæthed.
- Den fulde detaljepakke opdaterer automatisk pilelaget. DMI-værdier, forecast, RavScore, historik og geometri er uændrede.
- Produktcommit `bb1892e4072deb77dbc83a203587221c666013d2` er pushed. #31911509244/#2830 forsøg 1 stoppede på en delvis Limfjordshentning med 629/673 lokale strømpunkter. Forsøg 2 nåede 670/673 og bestod fulde gates, men stoppede før Pages på gentaget Supabase `57014`.
- Artifactauditten fandt derefter, at DKSS-`wind-tail-u/v` ikke blev ført til lokale vindpunkter. Rettelsen er implementeret og testet lokalt; ny produktion, artifactaudit og livekontrol mangler.

## Ejerens parallelle arbejde

- Ejeren gennemgår land-/vandpunkter zone for zone. Centralt godkendte punkter er autoritative og skal hydreres før hvert frisk produktionsbuild.
- Fem-døgnsdækning og historikanalyse er midlertidigt udsat, indtil mere naturligt datagrundlag er opsamlet. Dataopsamling og eksisterende gates fortsætter; intet må bagudfyldes eller skjules.

## Første opgave i næste chat

1. Hvis 4.0.228 ikke er udgivet: færdiggør lokale gates, push, fuld central produktion, artifactaudit og livekontrol.
2. Hvis 4.0.228 er produktionsverificeret: kontrollér at projekthukommelsen indeholder run-, artifact-, datasæt- og livebeviset, før et nyt roadmapafsnit startes.
3. Lad ejerens manuelle punktreview fortsætte sideløbende uden automatisk national genopdeling.

## Beskyttede beslutninger

- Ét autoritativt land-/havpunktpar pr. aktiv kyststrækning; bugtede kyster vurderes repræsentativt af ejeren.
- Flere kortpile kræver flere faktiske dokumenterede DMI-gitterpunkter; pile må ikke kopieres eller flyttes.
- Central adminstatus er autoritativ, `missing` forbliver `missing`, og ingen gate må svækkes for at få grønt.
- Kritisk arbejde udføres med GPT-5.6 Sol og Ekstra høj indsats.
