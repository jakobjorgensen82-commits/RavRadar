# DEC-0294 – SOURCE-kode og dens genererede kontrolmetadata

- **Status:** DELVIST IMPLEMENTERET; lokal, inaktiv forberedelse.
- **Dato:** 2026-10-21.
- **Omfang:** Den isolerede SOURCE-revision; ingen aktivering eller installation.

## Årsag og valg

Faktisk afledning af begge modelinventarer har påvist en selvbinding:
produktionsdelkæden når via den etablerede oprindelseslæser og normale
lager-/ejerskabskald SOURCE-indgangen, dens readiness og den nye bindingskode.
Egne C/I/T- og SQL-outputværdier som literaler i denne kode ville ændre selve
C/I-inputtet igen, når de udstedes. En LF-kildekopi alene løser ikke cirklen.

Genererede værdier placeres derfor i præcis én datafil:
`scripts/lib/source-producer-binding.generated.json`. Filen indeholder kun
schema, version, binding og output. Eksakte felter, kanonisk JSON, højst 8 KiB,
hashformater og sammenhæng kontrolleres. Den er ikke kode eller en alternativ
kalderautoritet. Nullfasen bevares, indtil faktiske værdier er afledt.

Begge normale bundlere får en ny v3-normaliseringsidentitet og undtager alene
denne navngivne genererede datafil ud over de eksisterende genererede filer.
`scripts/ravscore-operational-activation.mjs` får samtidig den præcise
releaseværktøjsgrænse, som begge normale modelprøver allerede kræver.
Der er ingen generel undtagelse for SOURCE, scripts, ukendte imports eller
implementeringskode. Indgang, hel-tail, readiness, reconciliation,
ejer-/proces-/filkontroller og metadata-validatoren forbliver faktisk i C/I.
Gamle rendererformater og I-manifestets fem felter bevares.

## Kilde- og udstedelsesbevis

Datafil, validator, tail og aktiveringsværktøj indgår eksplicit i den fysiske
producentfortegnelse. Den normale indgang kræver alle fortegnelsens filer som
entydige almindelige blobs i faktisk HEAD og uændrede arbejdsbytes.
`git diff` alene er ikke bevis for en hidtil ucommittet fil. Hele det faktiske
committede kildeindhold skal fortsat have sit normale kildebevis.

Dette er ikke et nyt bytebevis fra `fullRuntimeContractSha256`; den aktuelle
lagerkontrakt dér binder lager-ABI, ikke alle producentkilder.

Normal versionssynk skal ske før reel C → I → T-afledning. Derefter afledes
bindingsdata og SQL-output fra samme egne LF-kilde, og normal builder/check
skal genberegne alle faktiske C/I/T og SQL-pins til et stabilt resultat.
Opfundne tuples, sourceOverrides, ændrede gamle SQL-/JSON-originaler eller
omdøbning af en frossen 585-kilde til SOURCE må ikke bruges som bevis.

## Normale workflows og deres historiske kontroller

Første præcise 586-kontrol stoppede før native PostgreSQL: den gamle
completed-runtime-kontrol genkendte ikke den nye almindelige SOURCE-rute.
Det er ikke kun fem nye User-Agent-versionsfelter; build og manuel kalder
har også request-, selector- og outputændringer. Kontrollen må ikke repinnes
eller fjernes, og en testinverse må ikke blive produktets genbrugsautoritet.

En særskilt test-only inverse binder alle 152 build- og fire once-Git-hunks
til de faktiske hele efterbilleder og genskaber præcis den genuine b2-kilde.
Alle gamle 585- og ældre orakler bevares. Den faktiske nye kode prøves
særskilt: default-OFF, blandede/ukendte requests, 19 outputfelter, NO_WORK,
forberedt resultat, afslag uden legacy-fallback, gamle selectors over 24
tilstande samt faktisk dependency-, main- og B-før-S-rækkefølge. Det er
kildekontraktprøver, ikke native B/S, installation eller produktionseffekt.

## Status og bevarede grænser

Fire normale lokale mål består: streng dataform, faktisk C/I-kæde og uændret
offentlig pakkelæser, den faktiske committed-source-funktions syntetiske
afslag samt nu den faktiske udstedte kanoniske SQL i bindingssynkroniseringen. Den uafhængige
gennemgang har fundet og fået rettet en I-manifest-formkonflikt og en
objektidentitetsfejl i prøvens kommende udstedte fase.

Normal version 586 er synkroniseret én gang. Den faktiske lokale merge med
b2 bevarer ægte e7-ancestry; en ny almindelig Git-worktree af denne egen
commit leverer LF-kilder uden at ændre gamle SQL-/JSON-originaler. Faktisk
C145/I141/T, den nye append-only 020000-SQL og syv normale forbrugere er
afledt og genberegnet uændret til fuldt fixedpoint.

To gamle SOURCE-importprøver læste fejlagtigt den nyere 0d39-kalder som den
bevarede e938-variant. De uændrede 25.801 førbytes er nu inert, hashbundet
testdata. Alle gamle import-, mutations- og hel-inversekrav bevares; nyere
aktuel kode kontrolleres særskilt. Begge rettede mål består. Der opfindes
ingen historisk commit, og produktkode eller C/I/T ændres ikke af testrettelsen.

Dette er ikke native PostgreSQL, ægte 585-B/S-overgang,
national efterfølgerkapacitet, installation eller offentlig effekt. Disse
normale krav består. SOURCE er inaktiv, alle fem hovedmål er åbne, og den
almindelige vejrhentning må ikke forstyrres. DMI → Copernicus → Open-Meteo,
vandstand kun DMI, gyldige originaler, historik, scoreformel, adminpunkter,
geometri, cron og tidsbudgetter er uændrede.
