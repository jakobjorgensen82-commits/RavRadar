# RavRadar 4.0.435

## Resultat

4.0.435 retter den normale vejrkørsels DMI-genindtræden. En delvist fyldt,
privat DMI-fil kan nu bruges som arbejdskopi og fortsættes af producenten.
Den bliver ikke kaldt komplet og kan ikke erstatte en allerede bevist aktiv
generation, før de eksisterende READY- og registerkontroller består.

## Observeret produktionsfejl

- 4.0.434 blev exact-head-valideret i `35453677623`, merged gennem PR #379
  som `d4e8844e` og providerfrit deployet i `35454050404`.
- Den efterfølgende almindelige vejrkørsel `35456148104` gendannede den
  beskyttede private runtime og krypterede fremgang, men havde ingen separat
  strict aktiv DMI-generation.
- Workflowet materialiserede derfor `data/live/dmi-bulk-cache.json` og krævede
  straks et gyldigt `currentOperationalLedger`. Filen var en delvis kandidat
  fra den tidligere kørsel, så kontrollen stoppede korrekt med
  `DMI_OPERATIONAL_READY_LEDGER_INVALID` – men stoppet skete fejlagtigt før
  DMI-producenten fik mulighed for at færdiggøre kandidaten.
- Ingen DMI-, Copernicus- eller Open-Meteo-hentning nåede at starte. Den
  mislykkede kørsels krypterede fremgang blev fortsat gemt.

## Rettelse

- En eksisterende `.cache/dmi-active-complete.json` er fortsat strict:
  kompletheds- og registerfejl stopper.
- En eksisterende `.cache/dmi-candidate-progress.json` materialiseres og
  bevares som kandidat uden at udgive sig for at være aktiv.
- En ældre `data/live/dmi-bulk-cache.json` forsøges først valideret som strict
  aktiv. Består den ikke, seedes den som kandidat i stedet for at stoppe før
  producenten.
- Producenten, efterfølgende READY-kontrol, registerkontrol, atomisk snapshot
  og aktive fallbackregler er uændrede. Kun dokumenteret READY kan forfremmes.

## Afgrænsning og åbent bevis

Rettelsen ændrer ikke RavScore, providerprioritet, vandstandsreglen,
geometri, zoner, land-/vandpunkter eller offentlig datakontrakt. Den senest
publicerede runtime har fortsat lokal vind 0/673. Exact-head, merge og én
almindelig vejrkørsel skal bevise, at DMI nu starter, dækningen vokser, og
fallbackkæden fortsætter uden at overskrive gyldig DMI forkert.
