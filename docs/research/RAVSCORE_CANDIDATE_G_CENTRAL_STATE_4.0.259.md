# Candidate G 4.0.259 – central state og fallback-kompatibel shadow

## Formål

Dette checkpoint flytter den allerede valgte Candidate G-mekanik ind i RavRadars centrale 673-deles pipeline. Det er en score-neutral produktionsforberedelse, ikke endnu en modelvariant og ikke en aktivering af den synlige RavScore.

## Central beregning

Hver kystdel bruger de samme kontrollerede timelinjer, som den aktive lokale score allerede får fra DMI-first-kæden med Copernicus og godkendte proxier. Kandidaten beregnes med:

- jagtbarhed 20 procent efter DEC-0054;
- strømstyret transport/levering 50 procent efter DEC-0055;
- bølgeenergistyret mobilisering 30 procent efter DEC-0056.

Den persistérede tilstand er valgt ved zonens fælles aktuelle referencetime. Fremtidige prognoser kan beregnes i samme kørsel, men bliver ikke næste kørsels historiske startpunkt.

## Dataminimeret fortsættelse

Tilstanden indeholder model-/profilversion, en hash af kystkonteksten, tidspunkt, transportpotentiale, effektive udtransporttimer og mobiliseringspotentiale. Den indeholder ikke rå U/V, vind, strømretning, bølgehøjde, bølgeperiode, koordinater eller private replayrækker.

Kontrollen sammenligner model, profil og konteksthash før warm start. Ved forskel startes fail-closed fra 0. En prøve på samme tidspunkt som den persistérede tilstand har nul varighed og holder begge tilstande. Missing holder ligeledes seneste afledte værdi.

## Ny national shadow

Den tidligere aktive shadow genhentede native DMI-data og kunne kun score 243 dele. Det var en gyldig, snæver forskningsprøve, men ikke almindelig produktdækning. 4.0.259-auditen læser i stedet den producerede `public-condition-details.json`, som allerede er resultatet af produktionskædens provenance- og fallbackgates.

Auditen kræver 210 zoner, 673 dele og både waders og strand. Den genberegner Candidate G fra komponentbidragene, kontrollerer waders-loftet og udtransportgaten og skriver kun dataminimerede aggregater. Ingen part-id'er, koordinater eller rå vejrserier kommer i rapporten.

## Bootstrap og fortolkning

Den første kørsel har ingen tidligere central Candidate G-tilstand og starter derfor på 0. Dette er ærligt fail-closed, men ikke en observeret 48-timershistorik. Første produktionsfordeling må kun bruges til at kontrollere kontrakt og coverage. En senere aktiveringsvurdering skal oplyse state-alder og bruge naturligt videreført tilstand.

## Rollback

Den aktive score beregnes fortsat separat med 25/40/35 og ignorerer Candidate G-navnerummet. En fejl i den diagnostiske kæde kan derfor rulles tilbage ved at fjerne navnerummet eller genudgive forrige release uden at ændre den aktive score. En senere reel aktivering skal indføre en særskilt versionsbundet omskifter med testet tilbagekobling til 25/40/35.

## Afgrænsning

Arbejdet ændrer ikke UI, farver, zonevindere, geometri, land-/vandpunkter, bundmodel, adgang eller sikkerhedsbetydning. Private cachedata, artifact og protected-dirty-data er urørte. Kandidaten er fortsat en ikke-fundkalibreret produktprior.
