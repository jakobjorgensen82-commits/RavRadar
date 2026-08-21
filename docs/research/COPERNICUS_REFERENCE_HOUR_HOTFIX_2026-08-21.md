# Copernicus og DMI-strømtime - 2026-08-21

## Observeret fejl

PR #35 blev merged som `b461e7a5`. Den præcise produktion `32465245055` gennemførte frisk DMI, men stoppede før livefletning, fuld validering, release og deploy i målregistertrinnet.

Supportartifactets sikre metadata viste:

- Den ønskede 08:00-time fandtes i cachetabellen, men havde 0/673 gyldige lokale DMI-strømme.
- 06:00 havde 622/673 lokale DMI-strømme.
- 09:00, 10:00, 11:00 og 12:00 havde hver 622/673.
- DMI-opdateringen var frisk og uden rapporteret indsamlingsfejl.

Fejlen var derfor ikke en tom eller gammel DMI-cache. Triggerens vægtime var ikke en DMI-understøttet lokal strømtime.

## 4.0.246-regel

1. Kontrollér først den ønskede eksakte time.
2. Har den lokal DMI-strøm, beholdes den.
3. Har den nul, søges kun inden for tre timer.
4. Vælg størst verificeret lokal DMI-dækning, derefter mindst tidsafstand.
5. Ved fuld lighed foretrækkes en fremtidig prognosetime frem for en ældre time.
6. Bind målregister, Copernicus, livefletning, vejr, score og forklaring til den valgte time.
7. Findes ingen nærliggende DMI-strømtime, stop uden landsdækkende Copernicus-hentning.

Reglen flytter ingen punkter og ændrer ingen U/V-værdier, afstande, kildeprioriteter, proxyer eller RavScore-regler. Den eksisterende fulde 673/673-gate er fortsat den endelige datakontrol.
