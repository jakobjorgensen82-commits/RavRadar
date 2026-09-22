# 4.0.465 – indre modelbinding i offentlige timefiler

Det providerfri deploy `35771214115` lykkedes teknisk, men siden mistede
rangliste og prognose. Den offentlige 19:00-generation var nyere end den
tidligere 16:00-generation. Fejlen var ikke valg af gammel cache: den
bevarede 118-timerspakke havde fået ny ydre modelbinding, mens scorefelterne
inde i timefilerne stadig bar forgængerens binding. Browseren afviste derfor
korrekt leveringen. Den efterfølgende almindelige kørsel `35773937409` blev
annulleret før leverandører, cacheskrivning og deploy, mens fejlen blev
undersøgt.

Den eksakte post-cutover-migrering genbinder nu alle kendte indre
scoremetadata i hver timefil, før pakken forsegles igen. Den offentlige
Pages-kontrol gennemgår også de indre bindinger og stopper en tilsvarende
uforenelig pakke før deploy. Rettelsen ændrer hverken vejr, scoretal,
scoreformel eller modelbundlehash. Den allerede beskyttede 19:00-pakke
omskrives ikke blindt; næste almindelige vejrkørsel skal bygge et nyt
atomisk par og bevise cache, artifact, deploy og browser.

Lokalt er fejlen reproduceret på en faktisk offentlig timefil. En kontrolleret
metadataopdatering rettede 3.244 indre felter i den fil uden at ændre
målinger. Måltests, modelbundlekontrol og RDKS-/versionskontrol følger denne
release; produktionsbevis kræver stadig en frisk kørsel.

Normal vejrkørsel `35778530384` gennemførte DMI, Copernicus, Open-Meteo,
cache, runtime, produktionskontrol og Pages-deploy. Den offentlige side viser
igen rangliste og femdøgnsprognose. Workflowet blev alligevel rødt, fordi
Pages endnu serverede det forrige manifest under den første cirka 56 sekunder
lange slutkontrol. Den samme eksakte 210/673-kontrol bestod bagefter mod den
forseglede pakke, og offentligt manifest var identisk med handoffet. Den
begrænsede ventetid udvides derfor fra cirka ét til tre minutter; kontrol af
hash, model, artefakt og private data lempes ikke.
