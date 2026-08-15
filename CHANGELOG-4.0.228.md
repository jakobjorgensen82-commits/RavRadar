# RavRadar 4.0.228

## Flere pile ved indzoomning

- Landsoversigten viser fortsat de repræsentative vind- og strømpile for hovedzonerne.
- Fra zoomniveau 9 kan kortet vise flere lokale pile, når kystdelene faktisk bruger forskellige dokumenterede DMI-gitterpunkter.
- Pilelaget opdateres automatisk, når den fulde kystdelsdetaljepakke er hentet, og når kortet zoomes eller flyttes.

## Ingen kunstig tæthed

- En lokal strømpil kræver strøm-U og strøm-V fra præcis samme DMI-koordinat.
- En lokal vindpil kræver vind-U og vind-V fra præcis samme DMI-koordinat.
- Fallbackankre, ufuldstændig provenance og kopier eller forskydninger af en eksisterende pil bruges ikke som ekstra pile.

## Uændret faglig model

- DMI-værdier, kildevalg, forecast, interpolation, fallback, RavScore, historik, zoner, kyster og land-/vandpunkter er uændrede.
- Antallet af synlige pile afhænger af kortudsnit, zoom, unikke dokumenterede gitterpunkter og overlapkontrollen.

## Validering

- En ny målrettet regression beviser uændret oversigt ved fjernzoom, flere fysisk adskilte DMI-pile ved nærzoom og afvisning af uverificerede lokale punkter.
- Eksisterende zoom-, strømproveniens-, null-safety-, DMI-bulk- og progressiv-runtime-tests består lokalt.
- Den fulde lokale `validate` gennemførte geometri-v2-kæden og stoppede derefter forventet fail-closed på repositoryets kendte historiske 209/211-vejrsnapshot før central adminhydrering. Lokal releasegate består.
- Frisk central 210-zoneproduktion, fuld validering, releasegate, supportartifact, Pages-deploy og direkte livekontrol er næste gate.

## Aktuel prioritering

- Ejeren fortsætter den manuelle gennemgang af land-/vandpunkter sideløbende.
- Fem-døgnsdækning og historikanalyse er midlertidigt udsat, indtil flere naturlige data er opsamlet; de er ikke annulleret.
