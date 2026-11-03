# DEC-0154 – offentlig detailruntime læses med manifestbundet størrelse

**Dato:** 2026-09-15  
**Status:** Aktiv og implementeret lokalt i 4.0.373

## Problem

4.0.372 bestod sourcegate `34923460101`, blev merged gennem PR #314 som main
`b2d401a1`, og code-only-run `34923801295` gennemførte forgængerrestore,
udpakning, binding-only migration og atomisk installation af den private
runtime. Det næste trin afviste den offentlige detailruntime, fordi læseren
havde et fast 64 MiB-loft. Det levende, hashbundne manifest oplyser eksakt
`117.820.378` ukomprimerede bytes for det komplette 210/673-datasæt.

## Beslutning

- Manifestet læses og valideres før den store detailfil.
- Manifestets `publicConditionDetailsBytes` er den eksakte læsegrænse.
- Den deklarerede størrelse skal være et sikkert heltal på mindst 2 bytes og
  højst 512 MiB. Det giver plads til den aktuelle komplette detailpakke på
  cirka 297 MiB uden at åbne for en ubegrænset storfilslæsning.
- Den eksisterende efterfølgende kontrol af eksakt byteantal, filhash,
  payloadhash, modelbinding, datasæt og privacy bevares.
- Der indføres ingen generel ubegrænset storfilslæsning.

## Drift

Næste code-only-run genbruger central version 1, migration 16/17, privacy og
den gemte cache uden provider. Ingen oneoff eller vejrhentning indgår.

## Tillæg 2026-11-03 — PLAIN-klientbro og adskilte bytegrænser

Den lokale klientkandidat bevarer raw JSON og den hidtidige manifestbundne læsning med dens eksisterende grænser. Offentlig emission er fortsat PLAIN. Kun time-/zonefiler, som er optaget som sådanne i det validerede manifest, må senere bruge kendt gzip-base64-transport efter kontrol af ydre præcist byteantal og SHA. Startpakke, samlede detaljer, kystdata, zoneregister og kompakt deling skal være PLAIN, også med gyldig ydre integritet. Uden den validerede entrytype eller ydre integritet afvises den kendte envelope.

Transporten har præcis kendt struktur, kanonisk base64, positive sikre bytegrænser højst 16 MiB for henholdsvis komprimeret og udpakket indhold, begge SHA-kontroller, gzip-CRC/ISIZE og fatal UTF8/JSON. Native udpakningsfejl må ikke ommærkes til fallback. De eksisterende semantik-, model-, datasæt- og generationsvalidatorer udføres efter afkodning uden lempelse.

Cache-entry.bytes belaster det uændrede memorybudget med decodedBytes, mens transportBytes bevarer den ydre integritet. Genbrug sammenligner cached.transportBytes ?? cached.bytes og bevarer gamle raw-poster. Cacheposter og in-flight-identitet bevarer samtidig entryens interne hour/zone-scope, så et udpakket svar ikke kan genbruges i en plain-only- eller ubundet læsning. Dette ændrer ikke den historiske plain-læsegrænse eller score-/modelkontrakten. Det er en 594 UI-build, ikke C/I/T-, SQL- eller versionsudstedelse. Senere emitter, komprimering og samlet 1 GB-bevis har egne åbne gates. Se håndbog 89.301.

### Faktisk Node 22-afklaring 3. november

Den faktiske Node 22-kontrol påviste, at indbygget gzip-udpakning kan acceptere flere sammenkædede medlemmer, selv om Node 24 afviser dem. Den lokale rettelse kontrollerer derfor med den samme medfølgende kode, at filen rummer præcis ét medlem, også efter vellykket indbygget udpakning. De indbyggede outputbytes bevares; valideringschunks kasseres uden endnu en stor outputallokering. Et indbygget fejlforløb gentages stadig aldrig i fallback. Normalparenten består nu med 37 codec-prøver, 19 brocases, de 9 gamle kortcases og den eksisterende særskilte coldstart-prøve på Node 24. Ny præcis Node 22-kvalifikation og offentlig accept er åbne.
