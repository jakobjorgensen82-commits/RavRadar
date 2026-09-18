# DEC-0197 – direkte bevis af same-binding-kilden

**Status:** Aktiv
**Dato:** 2026-09-18
**Version:** 4.0.414

## Beslutning

Recovery af det allerede offentlige target fra run `35331664087` må ikke
kræve, at central version 23 stammer fra første cutover. Version 23 blev
dokumenteret oprettet af den almindelige integrerede vedligeholdelse i run
`35331109332`; overgangens historiske navn er derfor hverken sandt eller
relevant for den aktuelle source-identitet.

Ved same-binding recovery bevises source i stedet direkte med central version,
aktiv status, source-head, dataset/reference, alle tre manifestfelter, begge
implementation-closures, begge deploymentfelter, alle tre modelbindinger,
readiness-, audit-, profil- og maintenance-seal-hash, kalibreringsstatus og
tomt fejlfelt. Alle afvigelser samles som faste feltkoder i samme stop.

Targetets tidligere fastlåste artifact-, digest-, Pages-, audit-, profil-,
binding- og CAS-beviser er uændrede. Den gamle transitionkontrol bevares kun
for recovery, hvor source og target faktisk har forskellige modelbindinger.

Almindelige nye vejrcacher bruger fortsat den særskilte
`integrated-maintenance`-vej og læser ikke første-cutover-historik. Et totalt
runnerstop efter Pages men før central registrering skal senere have en
generel same-binding-genoptagelse; 4.0.414 påstår ikke, at dette sjældne
afbrydelsesvindue er løst.
