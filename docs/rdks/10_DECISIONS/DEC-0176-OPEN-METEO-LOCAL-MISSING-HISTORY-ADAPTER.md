# DEC-0176 – Open-Meteo-adapteren skal bevare lokal missing

**Status:** Aktiv og bindende; implementeret lokalt i 4.0.393, livebevis afventer
**Dato:** 2026-09-16

## Baggrund

Normalrun `35120782348` afsluttede alle providerled og byggede en gyldig
`READY_WITH_MISSING`-closure med 79.075 værdier og 339 lokale huller. Den
efterfølgende public-history-adapter validerede imidlertid Open-Meteo-cachen
mod kun de 34.218 positive Open-Meteo-par og krævede samtidig global
`COMPLETE`. Cachen var korrekt forseglet over de positive records plus de
339 eksakte manglende par, så adapterens andet krav var indbyrdes umuligt.

## Beslutning

Public-history-adapteren skal validere Open-Meteos fulde closure-rest som:

1. alle closure-godkendte positive Open-Meteo-assignments; og
2. alle closure-godkendte `MISSING`-assignments.

Valideringen bruger `require_complete=False`, fordi closure allerede har
klassificeret hvert restpar som værdi eller lokalt hul. Det er ikke en
lempelse: cache-dokumentets hash, recordrefs, targetregister, upstream-
bindinger, required count, record count og missing count skal matche den
allerede genopbyggede closure præcist. Kun positive records publiceres som
strømdata; et missing-par får aldrig en opdigtet vektor.

## Systemisk kontrol

RavScore-profilen forbliver aktiv ved lokal utilgængelighed. Public runtime,
availability-kontrakten og deployverifikationen kontrollerer lokale
utilgængelige zoner uden at kræve score overalt. Struktur-, model-, privacy-
og bindingsfejl er fortsat globale stopfejl.

## Bevis

Måltests beviser både accept af én præcis ufuldstændig Open-Meteo-rest og
afvisning af et ændret missing-par. Closure, Open-Meteo, live-adapter,
public-runtime og den integrerede 210/673-audit er grønne lokalt.
Exact-head, merge og levende normal weather mangler.
