# Test og validering - cost/benefit 2026-08-21

## Kort konklusion

RavRadar skal ikke testes mindre dér, hvor friske eksterne data kan ændre resultatet. Vi skal stoppe med at teste den samme uændrede kildekode flere gange uden ny information.

## Observeret tidsforbrug

- Fire målrettede lokale regressioner tog samlet cirka 8,5 sekunder.
- Den fulde lokale kildekodegate tog cirka 68 sekunder.
- GitHubs exact-head PR-kildegate tog cirka 22 sekunder.
- Den fulde produktionskørsel tog cirka 7 minutter og 39 sekunder. Det meste var DMI, vejr, dataopbygning og deploy, ikke tests.

Den lokale og GitHub-baserede fulde kildekodegate kontrollerede i høj grad det samme. Planlagte vejropdateringer gentog derefter kontrollen på samme main-kode. Det gav kun lidt ekstra fejlfindingsværdi.

## Hvad der faktisk fandt den seneste fejl

4.0.245 havde grøn kildekodekontrol, men frisk produktion viste, at den ønskede time havde DMI-data for andre felter og ingen lokal strøm. Det var den fulde kontrol efter frisk DMI, som stoppede deployet. En ny lille regression låser nu netop denne tidsregel.

## Ny praktisk matrix

| Situation | Kontrol |
| --- | --- |
| Mens vi udvikler | Målrettede tests for det ændrede område |
| Før/ved PR | RDKS/version/releasekrav og én fuld exact-head validate:source i GitHub |
| Push eller manuel produktion | Tidlig kildekodegate før dyre datatrin |
| Planlagt vejropdatering på samme kode | Ingen gentaget kildekodegate |
| Hvert nyt produktionsartifact | Fuld validering og releasegate efter friske data |
| Browser | Fuld 210/673 ugentligt eller ved UI/score/offentlig datakontrakt; ellers målrettet |

## Forventet gevinst

Koden er enklere end et særskilt SHA-cache-/artifactsystem og kan derfor betale sig hurtigt. Vi sparer gentagne GitHub-minutter og lokale dobbeltkørsler, mens det stærkeste sikkerhedsnet omkring de friske produktionsdata er uændret.

## Ikke ændret

Ingen RavScore, DMI/Copernicus-prioritet, geometri, U/V, kystdel eller land-/vandpunkt ændres.
