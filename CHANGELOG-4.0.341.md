# RavRadar 4.0.341 – atomisk WAM-kandidat

## Problem

Den aktive WAM-kandidat kunne tidligere blive muteret af en fil, selv om filen ikke havde leveret hele sin krævede denominator. Eksempelvis kunne 669 accepterede mål ud af 670 efterlade en blanding af gamle og nye modelkørsler. Selv en fuldt accepteret enkeltfil kunne under en allerede komplet caches kvalitetsopdatering skabe en midlertidig tretimers-seam mod næste fil. En flad ældre fallbackliste kunne desuden bruge den primære modelkørsels identitet i dele af behandlings- og beviskæden.

Dette var en promotions- og provenancefejl, ikke grund til at nulstille den bevarede cache.

## Rettelse

- WAM bygges i en isoleret kandidat pr. collection og modelkørsel.
- En fil er kun positiv, når dens fulde denominator er kendt og accepteret. Delvise filer ændrer ikke aktiv cache, positive tællere, processed steps eller checkpointstate.
- Promotion kræver samme target, at kandidatens eksakte `(partId, validTime)`-mængde er et superset af den aktive, og at der ikke indføres nye lineage-konflikter.
- Ved reelle huller eller hale vurderes den kumulative kandidat efter hver fuldt accepteret fil, så sikker fremgang kan gemmes før et senere stop.
- Når den aktive cache allerede er komplet, samles ren kvalitetsrefresh og promoveres højst én gang ved terminal faseafslutning. En enkelt fil må ikke skabe en tretimers-seam.
- En ældre kausal og akseopløselig fallback er bounded og terminal-only. Den starter ikke efter runtime-, reserve- eller interruptionsstop, og hvert asset bærer sin egen faktiske modelrun gennem supervisor, cache, download, sourceproof, parser og promotion.
- Open-Meteos required-par sorteres kanonisk som `(validTime, partId)`, så en gyldig donor ikke afvises på en anden inputorden.
- WAM-bootstrapkoden er med i den private runtimehash, så et gammelt runtimeproof ikke kan dække den nye adfærd.

## Uændrede kontrakter

- Den persistente cache genbruges og nulstilles ikke ved target-, modelrun-, leverandør- eller releaseændring.
- Det samlede slutvindue er fortsat `673 × 118 = 79.414`. Native WAM kræves for 670 dele, og Feggesunds tre dele kræver fortsat `3 × 118 = 354` direct/proxy-bevis.
- Reelle interne huller og hale behandles før kvalitet. Kildeprioriteten er fortsat DMI → Copernicus → Open-Meteo; den eksisterende snævre regionale DMI-politik består. Gamle horizon-gyldige rækker er brugbare, indtil de kan erstattes atomisk af en bedre verificeret tuple.
- Op til 48 timers verificeret historik bevares til mobilisering. Ufuldstændighed er rådgivende `HISTORY_INCOMPLETE`; ingen historik syntetiseres.
- DEC-0122's ene first-cutover-undtagelse er flyttet til exact-release 4.0.341 under ejerens stående autorisation. Alle størrelse-, storage-, checkpoint-, integritets-, privacy-, readback-, closure-, release- og deploymentgrænser består.

## Bevis og status

Lokalt bestået: WAM-producentintegration `52/52`, WAM-historik `35/35`, vejrplan `17/17`, Open-Meteo-donor `32/32` samt de relevante DKSS-, scheduler- og private-runtimekontroller.

Slutmatrixen fandt tre forældede testforudsætninger og ingen ny runtimefejl: én marine-test forventede parsergeneration 19, selv om producenten og den nyere downloadtest kræver 20; én fokuseret AST-test indlæste funktionen uden produktionsmodulets copy-on-write-type; og én kildekodetest forventede den gamle direkte completeness-assignment frem for den nye helper, som særskilt kræver aktiv WAM-closure. Kun disse testforudsætninger er opdateret. Ingen data-, completeness-, provenance- eller releasegrænse er lempet.

Dette er ikke CI-, main-runtime- eller produktionsbevis. Følgende er fortsat åbent: endelig release-/håndbogssynkronisering, én `validate:source` på PR'ens eksakte head, sikker merge, komplet main-vejr med `79.414/79.414`, native WAM for 670 dele, Feggesund `354/354`, fulde post-data-gates, runbundet handoff, artifact/deploy, modelcutover og offentlig kontrol. Normalworkflow og watchdog/shadow-dispatch forbliver deaktiveret, og Candidate G er fortsat offentlig.

## Efter launch

Cachetransporten skal fortsat bygges parallelt i shadow, sammenlignes logisk og kryptografisk, skifte via atomisk pegepind og have rollback uden cachetab. Ekstern cron-/GitHub-køadfærd, provider-tidsforbrug og normale kørselsers reelle vedligeholdelsesoverskud skal måles. 4.0.341 lukker ikke disse udskudte driftsopgaver alene.
