# DEC-0123 – WAM-kandidat pr. modelkørsel og atomisk promotion

- **Status:** Implementeret og merged i 4.0.341. Isoleret candidate, monoton promotion, kvalitetsfase og fallbackproveniens består; whole-asset-admissionen i punkt 3, punkt 5 og den relevante del af punkt 8 er snævert supersederet af DEC-0124 efter negativ main-runtime.
- **Besluttet:** 2026-09-10
- **Ejer:** RavRadar
- **Supplerer:** DEC-0119, DEC-0120, DEC-0121 og DEC-0122
- **Supersederer snævert:** løbende direkte WAM-mutation af den aktive cache under en endnu uafsluttet fil- eller modelkørselsfase

## Baggrund

> **Efterfølgende afgrænsning 2026-09-11:** 4.0.341 beviste, at isoleret candidate og promotion var nødvendige, men oneoff `34534764449` viste også, at kravet om fuld accept af hver fil kunne kassere alle uafhængigt gyldige søskenderækker. DEC-0124 erstatter alene denne admissionsgranularitet med lineage-sikker per-part/time-admission. Den historiske beslutning nedenfor bevares som revisionsspor; slutkomplethed og de øvrige værn er ikke lempet.

Den operationelle WAM-indlæsning kunne tidligere nå at skrive en delvist behandlet fil direkte ind i den aktive kandidat. En fil med eksempelvis 669 accepterede mål ud af 670 kunne dermed efterlade en blanding af gamle og nye modelkørsler, selv om filen ikke var komplet. Også en fuldt accepteret enkeltfil kunne under en kvalitetsopdatering danne en midlertidig seam mod næste tretimersfil. Samtidig kunne tællere og checkpointmarkører komme foran den faktisk sikkert promoverede dækning, og en ældre fallbackfil risikerede at blive behandlet med den nyere modelkørsels identitet.

Problemet var derfor ikke, at den persistente cache skulle kasseres. Problemet var, at nyt WAM-arbejde skulle isoleres, bevises og først derefter promoveres til den fortsat brugbare cache.

## Bindende beslutning

1. Den persistente vejrcache er den brugbare base og nulstilles ikke ved target-, modelkørsels-, leverandør- eller releaseændring. Det samlede operationelle vindue er fortsat `673 × 118 = 79.414` kystdel-/timepar. Native WAM dækker 670 dele; Feggesunds tre dele kræver fortsat et særskilt `3 × 118 = 354` direct/proxy-bevis.
2. Hver WAM-collection og hver modelkørsel behandles i en isoleret kandidat. En fil må ikke mutere den aktive WAM-cache direkte, mens filen eller dens fase stadig er uafsluttet.
3. En fil er først accepteret, når dens fulde krævede denominator er kendt og `acceptedCount == requiredCount > 0`. En delvis fil må hverken ændre aktiv cache, `fresh_zone_ids`, behandlede trin, dækningsoptælling eller checkpointets positive tilstand. Rå GRIB-genbrug og sikker diagnostik må fortsat bevares.
4. Promotion kræver samme operationelle target, at kandidatens eksakte `(partId, validTime)`-mængde er et superset af den aktive mængde, og at kandidaten ikke indfører nye lineage-konflikter. En fallbackfase skal desuden give en streng forbedring af den manglende eksakte mængde.
5. Når den aktive cache mangler reelle huller eller hale, vurderes den kumulative kandidat efter hver fuldt accepteret fil og promoveres straks, hvis superset-/konfliktkravene er opfyldt. Dermed bevares sikker fremgang ved senere timeout eller filfejl.
6. Når den aktive cache allerede er komplet, må en kvalitetsopdatering ikke promovere enkelte filer og efterlade en tretimers-seam. Den sammenhængende modelkørselsfase valideres samlet og promoveres højst én gang ved faseafslutning; ellers kasseres kandidatens kvalitetsændring, mens den aktive komplette cache består.
7. En ældre WAM-modelkørsel må kun forsøges som en begrænset, kausal og akseopløselig fallbackfase, efter at den primære fase er terminalt gennemløbet. Fallback må ikke starte efter runtime-, reserve- eller interruptionsstop og må ikke blandes ind mellem primærfasens filer. Hver fallbackfil bærer og valideres med sin egen faktiske `modelRun` gennem supervisor, cache, download, kildebevis, parser og promotion.
8. Hele aktiv- og historikvalideringen bruger den fulde accepterede denominator. Et checkpoint eller et filnavn er aldrig i sig selv positivt dækningsbevis.
9. Den overordnede currentprioritet består: DMI først, derefter Copernicus og til sidst Open-Meteo. Den allerede godkendte snævre regionale DMI-del inde i kæden ændres ikke. Gamle, fortsat strukturelt og horizon-gyldige rækker forbliver brugbare, indtil en højere prioriteret fuldt valideret tuple kan erstatte dem atomisk. En Open-Meteo-række er ikke permanent kildelåst.
10. Alle reelle interne huller og hale behandles før ren kvalitetsforbedring. Open-Meteos krævede eksakte par sorteres kanonisk som `(validTime, partId)`, så donorvalidering og henteplan anvender samme orden og ikke afviser en ellers gyldig reserve.
11. Op til 48 timers verificeret historik bevares til mobilisering og modeltilstand. Manglende historik er fortsat rådgivende `HISTORY_INCOMPLETE`, ikke tilladelse til syntese eller en ny availability-gate.
12. Den private runtimepakke binder WAM-bootstrapkoden i sin runtimehash, så denne ændring ikke kan genbruge et proof fra en ældre runtime, som ikke havde kandidat-/promotionskontrakten.
13. Normal vejropdatering og watchdog/shadow-dispatch forbliver deaktiveret, mens 4.0.341 er lokal kandidat. De må først genaktiveres i den kontrollerede merge-/cutoversekvens med bevarede cacher og eksakt main-kode.

## Lokal evidens og åben bevisgrænse

Følgende er lokalt bestået på den ucommittede 4.0.341-kandidat: WAM-producentintegration `52/52`, WAM-historik `35/35`, vejrplan `17/17`, Open-Meteo-donor `32/32` samt de relevante DKSS-, scheduler- og private-runtimekontroller. Det er alene lokalt kodebevis.

Følgende er fortsat åbent og må ikke omtales som bestået: én `validate:source` på PR'ens eksakte endelige head, sikker merge, en eksakt main-vejrkørsel med `79.414/79.414`, native WAM for 670 dele, Feggesund `354/354`, fuld post-data `validate` og `release:gate`, runbundet handoff, artifact/deploy, offentlig modelcutover og efterfølgende normal vedligeholdelsesmåling.

## Udskudt uden at være bortfaldet

Efter stabil launch skal cachetransporten fortsat omlægges tabsfrit gennem parallel shadow, logisk/hashmæssig sammenligning, atomisk pegepind og rollback. Ekstern cron forbliver den foretrukne dispatcher; faktisk tidsforbrug, køadfærd og overskud pr. DMI-, Copernicus- og Open-Meteo-led skal måles på normale kørsler. Disse opgaver må ikke forveksles med eller blokere den lokale WAM-integritetsrettelse, men de er ikke løst alene af 4.0.341.
