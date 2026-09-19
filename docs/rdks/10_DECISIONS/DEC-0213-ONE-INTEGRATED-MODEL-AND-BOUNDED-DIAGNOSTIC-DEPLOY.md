# DEC-0213 – Én integreret model og afgrænset diagnostisk kodelevering

## Bindende tillæg 2026-09-19 – Candidate G-checkpoint er N/A under warmup

4.0.433 bestod exact-head `35451524450`, PR #378 og merge `b6afcdca`.
Providerfri `35451791985` passerede den afgrænsede sekskodeaudit, men stoppede
før artifact på et efterfølgende Candidate G-checkpoint. Det var en regression
mod DEC-0114: `BUILDING_MEASURED_ONLY` var fejlagtigt blevet gjort til et krav
om build/save/publish af netop det checkpoint, som kræver en READY companion.

Ved `BUILDING_MEASURED_ONLY` skal både code-only og normal weather derfor
udstede den eksisterende hashbundne disposition
`NOT_APPLICABLE_DURING_MEASURED_WARMUP` med `checkpointRequired=false`.
Checkpoint-build, cache-save og beskyttet publish skal alle være `skipped` og
kontrolleres som sådan i handoff, Pages, reentry og slutstatus. Den integrerede
private runtime forbliver obligatorisk og bevarer conditions, integreret state
og private vejrcacher gennem sine uændrede privacy-/integritetsgates.

Et strengt checkpoint må fortsat kun bygges ved auditstatus `READY`. Dette
tillæg ændrer ingen vejr-, score-, geometri-, modelbundle- eller
providerkontrakt og gør ikke den manglende lokale vind acceptabel.

**Status:** Aktiv; 4.0.433 merged, 4.0.434 lokalt, produktionsbevis mangler

**Dato:** 2026-09-19

**Grundlag:** Providerfri code-only-kørsel `35449470349` og ejerbeslutning

## Én model

RavRadar har én offentlig scoremodel: den integrerede RavScore-model. Begreber
som »gammel model« og »ny model« må ikke bruges om en gemt runtime fra en
ældre kodeversion og den aktuelle kode. Det er samme model med forskellig
kode-/tilstandsbindingsalder.

Candidate G er pensioneret som produkt- og rollbackvalg. Den må ikke længere
kunne vælges i den offentlige produktionsdispatcher, analyseres som en mulig
fremtidig offentlig model eller bruges som driftsmål. Historisk, privat
kompatibilitetskode må blive liggende inert, indtil den kan fjernes i en
afgrænset oprydning uden at forsinke eller risikere den integrerede drift.

## Det konkrete produktionsfund

4.0.432 blev merged som `0d2fd78a`. Den providerfri kørsel `35449470349`
bestod central ACTIVE-readback, migration, forgænger-restore, importkontrol,
privat runtimeinstallation og deterministisk genbygning uden leverandørkald.
Den genbrugte runtime havde fortsat 210/210 zoner og 673/673 kystdele.

Kørslen stoppede derefter på seks diagnostiske følgefund. Den gemte runtime
har vind på zoneniveau, men ingen lokal vind på de 673 kystdele. Derfor er
alle 420 aktuelle zone/mode-scorer utilgængelige. En providerfri genbygning
kan ikke opfinde det manglende lokale input; det skal hentes af den næste
almindelige vejrkørsel med den aktuelle komponentkæde.

## Beslutning

Ved præcis `integrated-historical-maintenance` må code-only-deployet fortsætte
på netop den observerede diagnostik, når alle følgende forhold samtidig er
bevist:

1. Migrationen er ren `MODEL_BINDING_METADATA_ONLY`, og ingen vejr- eller
   scoreværdi er ændret.
2. Fejlsættet består af præcis de seks kendte cohort-/manifest-/profilkoder,
   hver med tæller 1. En ekstra, manglende eller ændret kode stopper.
3. Runtime er præcis 210 zoner, 673 kystdele og 1.346 rekonstruerede aktuelle
   kystdels-modes; præcis 420 aktuelle zone/mode-scorer er utilgængelige.
4. Replayfejllisten er tom, og privatlivskontrollen viser ingen state,
   råvektorer, koordinater eller shadowdata i det offentlige payload.
5. Den beskyttede fortsættelse er fuldt bundet til generationen og har ingen
   evidens-, rekonstruktions-, state- eller orakelfejl.

Dette er en overgang, der leverer den kode, som skal lukke datamanglen. Det er
ikke accept af manglende vind som komplet data. Ukendte fejl, datatab,
privacyfejl, replayfejl eller afvigende 210/673 er fortsat hårde stop.

Jobtidsgrænsen hæves fra 30 til 60 minutter, fordi den beviseligt vellykkede
runtimegenbygning alene tog omtrent 20 minutter før artifact og deploy.

## Næste driftsbevis

Efter code-only-deploy køres én almindelig vejrkørsel på den aktuelle kode.
Den skal faktisk hente lokal vind til kystdelene, danne score og derefter
følges af flere normale kørsler, som beviser komplethed, DMI-first,
reservekilder, rotation, cachebevaring, Feggesund og browseradfærd.
