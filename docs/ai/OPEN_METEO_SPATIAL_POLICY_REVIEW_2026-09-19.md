# Open-Meteo: afgrænset rumlig policyafklaring

2026-09-19. Offentlig kildekode/dokumentation, ingen vejrforespørgsel,
ingen central geometri- eller scoreændring. Forslag nedenfor er ikke selv
en ny godkendt afstandspolitik eller en måling af produktionsdækning.

## Eksisterende regler kan ikke flyttes blindt

DEC-0115/0118's 15 km gælder alene Open-Meteo combined current.
Adapterens DMI WAM-grænser 2/8 km gælder `wam_dw`/`wam_nsb`, ikke alle
leverandørers bølger. DMI-producentens generelle kysttypegrænser
24/32/40 km er heller ikke dokumenteret som OM PART-policy. DEC-0210
kræver reserve til alle komponenter, men ophæver ikke fysisk kvalitet.
Legacy-parent-request uden en afstandsgate er ikke lokal PART-admission.

## Verificeret bedre produktvalg end 0,25°

Den undersøgte revision er
`e669e6293ce2f0c70646fd61af8fe0c529fc0c53`.
[Controller](https://github.com/open-meteo/open-meteo/blob/e669e6293ce2f0c70646fd61af8fe0c529fc0c53/Sources/App/Controllers/ForecastapiController.swift)
viser de præcise API-navne `ecmwf_wam` og `ecmwf_ifs`.
WAM går til én ECPDS-reader, ikke best_match.
[ECPDS-domænet](https://github.com/open-meteo/open-meteo/blob/e669e6293ce2f0c70646fd61af8fe0c529fc0c53/Sources/App/EcmwfEcpds/EcmwfEcpdsDomain.swift)
bruger O1280 (omtrent 9 km), H360 for 00/12 og H144 for 06/18;
native timer indtil H90, derefter 3-timerstrin gennem H144.
Det giver plads til H120 efter normal publiceringsforsinkelse, ikke garanti
for alle aktuelle svar. API'ens mellemtimer er leverandørinterpolation.

[WAM-felter](https://github.com/open-meteo/open-meteo/blob/e669e6293ce2f0c70646fd61af8fe0c529fc0c53/Sources/App/EcmwfEcpds/EcmwfEcdpsWamVariable.swift)
er `swh`, total peak `pp1d` og middel-FROM-retning `mwd`; de kan levere
den nødvendige sammenhængende bølgetuple. [GaussianGrid](https://github.com/open-meteo/open-meteo/blob/e669e6293ce2f0c70646fd61af8fe0c529fc0c53/Sources/App/Domains/GaussianGrid.swift)
giver eksakt native koordinat fra gridindeks. Svarets koordinat følger
readerens modelLat/modelLon. `sea` søger 3×3 og kan ende på nærmeste
land/noData, når ingen havcelle findes: parameteren er ikke et vådcellebevis.

## Første anbefaling fra kildereviewet

Behandl komponenterne uafhængigt. SST's eksisterende beviste 1/12-native
nearest-center kan anvendes uden at indføre ekstra kilometersøgning.
Vind/WAM bør skifte til eksplicitte 9-km-modeller og tilsvarende verificeret
O1280-native-nearest-center fremfor 0,25° plus en vilkårlig radius.
Et masked/null-center må ikke flyttes til en anden celle for at lukke hul.
Dette kræver en eksplicit native-center-kontrakt i reader/policy, ikke blot
en meget stor `maximumDistanceKm`.

Hvis sea-søgning til et andet marint punkt ønskes, mangler en lokal/fjord-
acceptafklaring. Det kan ikke udledes af current15km eller DMIwave2/8.
Vandstandens datum er stadig separat: beviste native værdier er ikke
automatisk DMI-kompatible centimeter. Der er ikke lavet providerkald eller
kodeændret OM-modelvalg i denne afgrænsede gennemgang.

## Afgrænset O1280-bevis nu implementeret

`scripts/lib/open-meteo-o1280-grid.mjs` gengiver nu den pinnede upstreams
`findPointXY` og `getCoordinates`, inklusive Float32-aritmetik, Swift's
halvvejs-væk-fra-nul-afrunding, valg mellem to breddegrader og dateline.
`openMeteoO1280GridMatches` accepterer kun den forventede native centers
Float32-koordinat. Den afprøver ikke andre våde celler, ændrer ingen
samplingpunkter og giver ikke i sig selv en gyldig vejrkomponent.

Nuancen er vigtig: upstream bruger analytisk latitudeafstand i sin
API-koordinatrepræsentation. Dette bevis matcher dén kontrakt; det foregiver
ikke at være den idealiserede ECMWF Gaussian-latitudetabel eller en ny
global geodætisk nærmeste-punkt-algoritme. Der kræves ingen ny dependency.
Fire små tests omfatter 314 syntetiske globale/danske koordinater,
uafhængig latitude-bracket-kontrol, Float32-roundtrip, forkert nabocelle,
0,25-grid, coercion og dateline. Modelvalg/OMbank/caller blev ikke
ændret af dette helperarbejde alene.

## Efterfølgende lokal integration

Normalpolicyen er nu implementeret som `OPEN_METEO_NATIVE_NEAREST_POLICIES`
i OM-banken: IFS/WAM O1280 og SST MF-native-nearest, uden opfundet radius.
V3-requests binder den præcise policy og genvaliderer responskoordinatet;
modeltid er stadig ukendt, og leverandørens timeinterpolation mærkes ærligt.
Vandstand er fortsat ikke optaget til normal scoreinput. Legacy-v2-bank og
maxafstandspolicy kan fortsat bruges med deres oprindelige bevis, men
omdøbes ikke til native. Se `OPEN_METEO_COMPONENT_SOURCE_CONTRACT_2026-09-19.md`
for integrationskontrakt og ni nye små native-/gittertests. Ingen providerdata
er hentet, og dette er fortsat ikke et produktionsbevis.
