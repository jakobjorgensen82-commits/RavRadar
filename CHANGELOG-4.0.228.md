# RavRadar 4.0.228

## Flere pile ved indzoomning

- Landsoversigten viser fortsat de repræsentative vind- og strømpile for hovedzonerne.
- Fra zoomniveau 9 kan kortet vise flere lokale pile, når kystdelene faktisk bruger forskellige dokumenterede DMI-gitterpunkter.
- Pilelaget opdateres automatisk, når den fulde kystdelsdetaljepakke er hentet, og når kortet zoomes eller flyttes.

## Ingen kunstig tæthed

- En lokal strømpil kræver strøm-U og strøm-V fra præcis samme DMI-koordinat.
- En lokal vindpil kræver vind-U og vind-V fra præcis samme DMI-koordinat.
- Både det primære atmosfæriske DMI-vindpunkt og DKSS-havmodellens faktiske `wind-tail`-punkt kan bruges. Kilden mærkes særskilt og må kun vælges, når prognosen faktisk bruger den pågældende serie.
- Fallbackankre, ufuldstændig provenance og kopier eller forskydninger af en eksisterende pil bruges ikke som ekstra pile.

## Uændret faglig model

- DMI-værdier, kildevalg, forecast, interpolation, fallback, RavScore, historik, zoner, kyster og land-/vandpunkter er uændrede.
- Antallet af synlige pile afhænger af kortudsnit, zoom, unikke dokumenterede gitterpunkter og overlapkontrollen.

## Validering

- En ny målrettet regression beviser uændret oversigt ved fjernzoom, flere fysisk adskilte DMI-pile ved nærzoom og afvisning af uverificerede lokale punkter.
- Eksisterende zoom-, strømproveniens-, null-safety-, DMI-bulk- og progressiv-runtime-tests består lokalt.
- Den fulde lokale `validate` gennemførte geometri-v2-kæden og stoppede derefter forventet fail-closed på repositoryets kendte historiske 209/211-vejrsnapshot før central adminhydrering. Lokal releasegate består.
- Første centrale forsøg stoppede korrekt, da en delvis Limfjordshentning kun gav 629/673 verificerede aktuelle kystdele mod kravet 640.
- Uændret genforsøg med den gemte progressive cache gav 670/673 og bestod fuld `validate` og releasegate, men stoppede efter én snæver genprøvning på Supabase HTTP 500/PostgreSQL `57014`; Pages blev ikke deployet.
- Artifactefterkontrollen fandt samtidig, at alle 670 lokale vindpunkter endnu stod som zoneankre, fordi transporten kun genkendte de primære vindfelter og ikke de faktisk anvendte DKSS-`wind-tail`-felter. Read-only replay af DMI-cachen finder eksakte vindhalepar til 670/673 dele på 507 unikke gitterpunkter. Den lokale rettelse bevarer begge ægte kildetyper og afventer ny fuld produktion.

## Aktuel prioritering

- Ejeren fortsætter den manuelle gennemgang af land-/vandpunkter sideløbende.
- Fem-døgnsdækning og historikanalyse er midlertidigt udsat, indtil flere naturlige data er opsamlet; de er ikke annulleret.
