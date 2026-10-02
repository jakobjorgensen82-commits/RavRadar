# DEC-0285 – Følg Rav Jagt under takken

**Dato:** 2026-10-02. **Status:** Implementeret i 4.0.538-kandidaten; exact-head CI og offentlig effekt afventer.

Ejeren ønsker nedenunder den allerede leverede tak: “Følg ham på Facebook
og YouTube, og lær en masse spændende om rav.” Den nye sætning står som et
selvstændigt afsnit direkte under takken og over de eksisterende to links.
Samme indhold oversættes til tysk og engelsk via sidens eksisterende sprogvalg.
Ejerens Facebookprofile61550028713868 og YouTube@ravjagt887, sikker ny fane,
klikflade og alle illustrationer/faglige forbehold bevares. Ingen nye links,
embeds, scripts, tracking, konti eller påstået ekstern loginverifikation.

Kun learn.html, tre sprognøgler i learn-i18n.js og den eksisterende
grundbogstest ændres funktionelt. Alle gamle testkrav bevares; måltesten
består. CSS, score, Top20, model67/3a14/otte bindinger, geometri, historik,
cache, kildeprioritet, budgetter, workflows og SQL-runtime ændres ikke.
Mekanisk releaseversion538 og RDKS/begge håndbøger/changelog følger.
Geodata kun topversion, SQL kun eksakt håndbogspayload; ingen migration.

## Lokal målrettet kontrol før kilde-PR

Eksisterende grundbogstest består én gang med alle gamle krav bevaret.
ProtectedRDKS/modelversion2/2PASS152.0202ms og security/code-only2/2PASS
220.0552ms er to særskilte målkommandoer, ikke en ny fuld suite. RDKS538/
14chat og sourcecritical102 består; model67/3a14/8bindinger/releaseversion
består. Streng inversediff beviser én HTML-linje og tre oversættelser, alle
gamle tests byteidentiske, CSS og normalweatherwriter uændrede.73 øvrige
filer er kun mekaniskeversionsløft, geodata kun topversion og SQL udenfor
eksakt håndbogspayload LFsha154c3443752d840124f4caed95663e8a2c5bea346302e4dc6231a13f8ff62325
uændret. Ingen migrationsdelta. Den første målkommando udvalgte kun de to
faktisk eksisterende filer; de to korrekt navngivne resterende kontroller
kørtes bagefter. Der påstås ikke fire tests i den første kommando.
Offentlig pc/mobil/sprog-/linkeffekt følger efter sikker levering, ikke
bevist af denne kildekontrol alene.

## Faktisk drift og leveringsgrænse

537/PR505/exactheadd00079e3/exactCI37033140847/proof11238757795 er leveret:
main1b3e172df6f6dc4b5054d186dba180a74aefa859 efter fornyede writers/head/
base/proof og tom contentdiff, kode-only37034344180SUCCESS18:39:36DK.
Offentlig537/pc-/375CSS-kreditering og DA/DE/EN kontrolleret. Samme gyldige
rr-20261002143718-210/reference12Z/generated14:37:18.469Z/210zoner/673dele/
complete:true/3a14. Historicalmaintenance SKIPPED, ikkePASS. Cron8348098 er
genaktiveret/servergenlæst18:43DK med næste22:19DK og uændret plan/payload.
Gamle ventende537-/pausetcron-beskrivelser er historiske, ikke nye ordrer.

Derefter bestilte ejeren udtrykkeligt én ny almindelig vejrhentning.
37036350223/attempt1 startede18:47:48DK på exactmain1b3e172d/public537,
quick_confirmation=false/defaulttom quick_progress_source/normalbudgetter.
Reentry/terminal/exactmainUTC bestod; senest18:57DK DMI78 aktiv uden fejlet
trin. Dette er ikke restore/fileCount/prior matchedkey/save/upload/deploybevis.
Følg netop denne; ingen ekstra dispatch/cancel-as-save/mainændring/merge/
kode-only/binding/audit/oneoff mens aktiv. Cron forbliver aktiv og uændret.

538 klargøres lokalt og som separat exact-head kilde-PR under den aktive
hentning. Efter faktisk completion/resultatkontrol fornyes writers/main/
head/base/content/exactCI/unexpiredROOTproof før DEC0148kode-only med
publish_newest_saved_weather=false og offentlig tekst-/linkkontrol.
Ingen ny providerhentning alene for teksten. Den normale selection-writer-
revision isoleres senere særskilt, ikke blandet ind i denne tekstrettelse.
Stor519/fullCP-SførT/writer/kill/failure4min/runner/nationalkapacitet/OFF og
alle særskilte admission/log/donor/PROXY/SOURCE-afvisninger består. Ingen ny
dækningsprocent, historikdato, model-, indsats-, plan- eller kadenceændring.
