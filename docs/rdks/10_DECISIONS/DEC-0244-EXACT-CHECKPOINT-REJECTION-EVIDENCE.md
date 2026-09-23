# DEC-0244 – mål den præcise checkpointafvisning før flere regelrettelser

**Dato:** 2026-09-23
**Status:** Implementeret lokalt i 4.0.473; livebevis afventer

## Evidens og afkræftet hypotese

4.0.472 blev merged som `9b29183c` efter grøn exact-head CI
`35858302147`. Providerfri main-kørsel `35858910881` anvendte
`20260923120000`, genbrugte den aktuelle private vejrpakke og byggede
checkpoint for 673 dele. Den beskyttede CAS afviste igen pakken som
`INPUT_INVALID` før private writes og Pages. Den sikre formdiagnose viste
ingen integreret del med tom evidens eller sidste række før referencen.
Den antagne udløsende liveårsag i DEC-0243 er dermed afkræftet.

Dette siger intet om, at alle vejrdata er komplette. Sidste normale run
havde 5.201 manglende **havstrøms**par; øvrige vejrtyper skal opgøres
særskilt i næste normale run.

## Beslutning

- Installer append-only `20260923130000` med en skrivefri,
  service-role-only diagnose-RPC. Eksakte kopier af de anvendte
  checkpointvalidatorer udskifter kun boolean-retur med faste
  regelkoder. En generator kontrollerer forgængerens hash og kopiens
  semantik. Den eksisterende CAS og dens accept-/afvisningsregler
  ændres ikke.
- Kald diagnosen kun efter `INPUT_INVALID`. Log alene aggregerede
  regelkoder og antal; ingen kystdel-ID, tider, målinger, vektorer,
  payload, nøgler eller rå databasesvar. Ukendt/ugyldig diagnose
  bliver blot `UNAVAILABLE`; checkpointfejlen forbliver hård.
- Kør én providerfri genbrug af den aktuelle vejrpakke efter exact-head
  CI og merge. Ret derefter den *målte* kontraktfejl, ikke endnu en
  antaget statuskant. Ingen ny normal vejrkørsel, mens samme
  leveringsbarriere står uløst.
- Efter sikker offentliggørelse: én normal kørsel med før/efter pr.
  vejrtype, leverandør, targettime, cachegeneration, historik og Pages.
  DMI-first, Copernicus som næste huludfylder og Open-Meteo til sidst
  er fortsat målet; den observerede fordeling er ikke acceptabel som
  stabil baseline. Automatisk drift kræver gentaget livebevis.

## Åbent

Diagnosens regelkoder, SQL-rodårsag og produktionsrettelse afventer.
Copernicus' nul anvendte havstrømspar, 5.201 restpar, DMI's begrænsede
tur, fremtidige vindhuller og de øvrige vejrtype-/historikhuller er
særskilte åbne spørgsmål. Ingen af dem lukkes af diagnosemigrationen.
