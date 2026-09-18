# DEC-0204 – Eksakt kendt code-only-diagnostik må ikke skjule de senere kontroller

**Status:** Aktiv; lokal 4.0.421 afventer exact-head og providerfri levering
**Dato:** 2026-09-18

## Evidens

4.0.420 bestod exact-head `35381401273`, PR #365 og merge `069de220`.
Providerfri code-only `35381918986` verificerede den eksakte offentlige kilde
fra `35374238410` og den aktuelle private runtime, men stoppede før skrivning
og deploy i `Audit regenerated integrated public runtime`.

Auditpayloaden er kanonisk identisk med både `public-audit.json` og
`checkpoint-runtime-audit.json` i kildens forseglede operationelle artifact.
Alle tre har SHA-256
`82d4d18de4c41977bf589ca4de72387ec3e4aaaac51dd0a90bb012cb1403d3fa`.
Dermed var stoppet en forskel mellem normal-weather- og code-only-wrapperens
behandling af den samme kendte diagnostik, ikke ny drift i målpakken.

## Beslutning

- Code-only må kun bevare den kendte auditdiagnostik, når DEC-0203's eksakte
  repair-id er aktivt.
- Workflowet henter det eksakte kildeartifact og kræver, at kildens offentlige
  audit, kildens checkpointaudit og den nyberegnede målaudit alle har den
  fastlåste kanoniske hash.
- Manglende evidens, ukendt repair-id eller blot én ændret byte i den
  kanoniske audit stopper fortsat før mutation.
- Den snævre regel erstatter ikke senere kontroller. Private runtime,
  prewrite-beslutning, privacy, artifact, Pages, offentlig verifikation og
  central afslutning skal alle fortsat gennemføres.
- Målpakken må ikke bruge source-repair-undtagelsen til sin egen 79/79-
  browserverifikation.

## Afgrænsning

Der laves ingen providerkald, oneoff eller cacheændring. RavScore-formel,
modelbundle, scoreværdier, geometri, DMI-rotation og providerprioritet er
uændrede. Beslutningen godkender ikke fremtidige eller bredere auditfejl.

## Efter levering

Chrome og central status verificeres. Den kendte 672/420-auditdiagnostik
behandles derefter som en særskilt live-fejl, mens modellen er online, og en
ny almindelig vejrvedligeholdelse bevises før scheduler genaktiveres.
