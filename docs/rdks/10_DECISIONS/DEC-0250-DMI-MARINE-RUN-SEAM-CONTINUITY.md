# DEC-0250 – Bevar gyldige DMI-timer ved skift mellem modelkørsler

**Dato:** 2026-09-24
**Status:** Lokal 4.0.480; måltestet, produktionsbevis afventer

Normalrun `35920484428` på 4.0.479/`888d3c04` genbrugte den korrekte
private vejrpakke, gemte ny cache/checkpoint og deployede
`rr-20260923215727-210`. Det var en reel succes, men ikke komplet
vejrdata. En time-for-time-sammenligning med det forrige deployede
`rr-20260923170622-210` på de 113 fælles prognosetimer og 673
kystdele fandt ingen tab af vind eller bølger, men 22 tabte havstrøm-,
41 tabte vandstands- og 41 tabte vandtemperaturpositioner. Alle tab
lå i Limfjorden ved `2026-09-25T07:00Z`.

Den gamle pakke havde dér en gyldig DMI `dkss_lf`-værdi fra kl. 06
med `nearest-edge`-proveniens. Den nye havde samme native værdi kl. 06
og en nyere native værdi fra et andet modelrun kl. 09, men satte kl. 07
til `MISSING`: global nabosøgning fandt de to forskellige modelruns,
afviste korrekt interpolation mellem dem og prøvede ikke længere den
stadig tidsmæssigt gyldige 06-kilde alene.

Ved *kun* et bevist skift mellem ellers identiske DMI-native serier
må vejrbygningen for hvert af felterne strøm, vandstand og
overfladetemperatur prøve den gamle og nye modelkørsel hver for sig.
Kun en komplet, selvstændigt verificeret `nearest-edge`-værdi inden
for den uændrede 95-minutters grænse udfylder et tidligere tomt felt.
Hver valgt værdi beholder eget modelrun, kilde, celle,
vertikallag, native tidspunkt og eksisterende proveniensvalidering.
Der interpoleres aldrig mellem modelruns; forskellig celle, dybde,
samplingskontekst eller længere afstand i tid forbliver `MISSING`.
Bølgereglen, DMI-first, Copernicus/Open-Meteo-reserver og DMI-only-
vandstand ændres ikke. Den delte scoremodel-adapter og dens 67-filers
modelbinding er uændret; rettelsen ligger i vejrproducenten og
kontrolleres i både normal- og oneoff-indgangen. Det er ikke den særskilte regionale Limfjord-
fastholdelse og skaber ingen ny native måling.

Kildeændringen ville normalt afvise den seneste private pakke, fordi
producentfilen indgår i det brede runtime-aftryk. Derfor må **kun**
den eksakte 4.0.479-generation ovenfor passere forgængerbroen med
fast kildecommit, datasæt, referencetime og tre verificerede hashes.
Model-, continuation- og offentlig projektionsbinding skal stadig
matche; arkiv, filinventar, bytehash, tid og pakke kontrolleres fuldt.
Andre forgængere er ikke godkendt.

Næste ikke-overlappende normalrun på 4.0.480 skal bevise cachelineage,
de konkrete Limfjord-timer, øvrige feltvise rester, leverandørfremgang,
beskyttede saves, deploy og offentlig visning. Copernicus' langsomme
Baltic-kilde, Open-Meteos rester og DMI's korte horisonter er særskilte
åbne problemer; denne beslutning kalder dem ikke løst. Cron er pauset.
