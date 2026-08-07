# RavRadar 4.0.116 – fælles DMI-vektorgrid og null-sikker femdøgnsprognose

## Formål
Reparere den DMI-integritetsfejl, som stoppede 4.0.115, og samtidig rette den dokumenterede falske 0,0-visning for manglende vind/bølger. `shadow-v2` forbliver score-neutral.

## Rodårsager
- Bulk-parseren valgte tidligere nærmeste gyldige U og V uafhængigt. Ved forskellige DMI-masker kunne komponenterne komme fra forskellige fysiske gitterpunkter.
- Vandstandskilder (`SOURCE::`) blev sampled og talt med som almindelige forecastzoner for flere komponenter, hvilket oppustede workload og dækningsunderskud.
- Flere JavaScript-hjælpere brugte `Number(null)`, som er 0, så et reelt datagab kunne fremstå som vindstille/fladt hav.

## Ændringer
- Strøm- og vind-U/V parres kun på nærmeste fælles fysiske gitterpunkt.
- Ingen fælles kandidat giver manglende/ikke-verificeret vektor.
- Gamle cachede mismatch-vektorer invalideres.
- `SOURCE::`-punkter samples kun for DKSS-vandstand og tæller ikke i forecastzonernes dækning.
- Null-sikkerhed er strammet i score, regler, best-time, retningslogik, prediction og zone-UI.
- Manglende vind/bølge vises som `Mangler`; ægte numerisk 0 bevares.
- Workflowdiagnostik afspejler det eksterne croninterval på 15 minutter.
- Nye regressionstests dækker fælles U/V-grid, vandstandskilders parameterafgrænsning og null-vs.-nul-adfærd.

## Uændret
- RavScore-vægte og pointregler.
- `shadow-v2` har fortsat ingen scorevirkning.
- Dokumenteret morfologi.
- DMI-proveniens og den strenge spatial audit.
- Ingen generelle strømbånd eller strømfallback.

## Produktionsgate
- Den strenge current spatial audit skal bestå.
- Referencezoner skal fortsat have score-neutral `shadow-v2`.
- Sitetest skal vise sammenhængende 208-zonedatasæt og ingen falske `0,0`-felter ved `null`.
- GitHub-log skal måle om færre unødige source-opslag reducerer bulk-jobbets varighed.
