# DEC-0203 – Eksakt komplet offentlig kilde må samles med central tilstand

**Status:** Aktiv; lokal 4.0.420 afventer exact-head og providerfri levering
**Dato:** 2026-09-18

## Evidens

Den almindelige vejrkørsel `35374238410` kørte DMI, Copernicus, regional DMI
og Open-Meteo færdig, gemte providercacherne, byggede vejrlukning og historik,
opdaterede central weather og proveniens og bestod produktionsvalidering og
releasegate. Pages blev deployet og offentligt verificeret med 210 zoner, 673
kystdele og en komplet browserlukning på 79 af 79 filer.

Kørslen fejlede først bagefter i den centrale afslutning. Den beskyttede
readiness stod fortsat på source-head `1ec8358f`, mens den allerede offentlige
pakke kom fra den nyere, rent operationelle main `779fd7a9`. Derfor er Pages
foran den centrale RavScore-post, selv om modelbinding og
implementeringslukning er identiske. En efterfølgende providerfri kørsel
`35379571657` stoppede korrekt før skrivning og deploy, fordi denne præcise
kombination endnu ikke havde en engangsregel.

## Beslutning

- 4.0.420 må genkende netop central version 27 fra deployment
  `pages-35371475804-1` og den offentlige kilde `pages-35374238410-1`.
- Alle source-heads, deployment-id'er, artifact-id og -digest, manifest-,
  modelbindings-, browserluknings- og implementeringshashes skal matche de
  fastlåste værdier. Enhver afvigelse stopper før mutation.
- Den offentlige kilde er komplet. Engangsreglen kræver derfor præcis 79 af
  79 browserfiler og nul manglende filer. Den må ikke opfinde eller ignorere
  en 404.
- Den eksisterende kode-only-rute bruges efter merge. Den må ikke kalde
  vejrprovidere eller ændre de gemte caches.
- Det nye 4.0.420-target skal selv bestå den normale komplette browserlukning,
  artifact/privacy, Pages-verifikation og central afslutning uden
  engangsundtagelse.

## Afgrænsning

RavScore-formel, modelbundle, vejrdata, providerprioritet, DMI-rotation,
geometri, land-/vandpunkter og private målinger ændres ikke. Der køres ingen
oneoff og ingen ny vejrhentning som del af rettelsesleveringen.

## Efter levering

Chrome skal vise 4.0.420 fra den samme verificerede vejrtid, og central status
skal pege på den nye eksakte deployment. Derefter bevises en ny almindelig
vedligeholdelse særskilt, før scheduler genaktiveres.
