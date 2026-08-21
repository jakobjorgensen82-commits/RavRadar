# Historisk DMI-vind til RavScore-piloten

## Formaal

Den historiske sammenligning af RavScore mangler timevis vind. Uden vind kan kandidat E og F sammenlignes som en isoleret vaegtningsanalyse, men den aktive scoremotor kan ikke afspilles aerligt.

Denne pilot supplerer kun de 12 allerede udvalgte boelgehaendelser ved Kjul, Holmsland, Langeland syd og Dueodde. Den er ikke en national helaarshentning og paavirker ikke produktionens scorer.

## Kilde og metode

- Kilde: DMI Open Data `metObs`.
- Vindfart: `wind_speed_past1h`, seneste times middelvind i 10 meters hoejde.
- Vindretning: `wind_dir_past1h`, meteorologisk fra-retning for seneste time.
- Valg: naermeste station inden for 60 km, naar mindst 75 procent af haendelsens tidspunkter har parret fart og retning.
- Tid: eksakt tidspunkt eller hoejst 10 minutters afvigelse.
- Datapunkt: det eksisterende, centralt godkendte kystdels-vandpunkt laeses uden at blive aendret eller gemt i artefaktet.

## Sikkerhedsafgraensning

- Ingen land- eller vandpunkter flyttes.
- Ingen DMI-noegle er noedvendig paa DMI's aktuelle officielle domaene.
- Ra API-svar og stationskoordinater gemmes ikke.
- Stations-id pseudonymiseres i det private artefakt.
- Det private artefakt gemmer kun de parrede vindvaerdier og aggregeret kvalitetsinformation.
- Vindens retning omsaettes desuden til en afledt ind-mod-land-vaerdi, saa scoreafspilningen kan bruge den korrekte lokale kystretning uden at gemme punktet.
- `scoreImpact=false` og `publicRuntime=false` er bindende kontraktfelter.

## Beslutningsport

Piloten er kun egnet til den fulde score-sammenligning, hvis alle 12 haendelser bestaar afstands-, tids- og daekningskravene. Ellers skal datamanglen beskrives; den maa ikke udfyldes med opdigtede eller stiltiende interpolerede vaerdier.
