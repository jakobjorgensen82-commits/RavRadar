# RavRadar 4.0.151

## Officielle nationale stednavnekandidater
- #2049 produktionsverificerede 4.0.150 med frisk DMI/provenance, fuld Linux-validate, release-gate, Supabase-sync, Pages-artifact og deploy.
- Privat #2050 verificerede lokalitetsgaten: 755 dele i 194 zoner, 79 blokerede zoner og 25 zoner/28 dele med lokalitetsflag; nul navne eller opdigtede forbindelser.
- Den nøglefri officielle `steder`-kilde forespørges nu over den centralt hydrerede 100-fliseplan med 10 km dækningsmargin og højst fire samtidige fliser.
- Kandidater fordeles revisionsbart mellem direkte kystnavne, lokale bebyggelser, havnekontekst og øvrig kontekst. Ingen kandidat bliver automatisk et navn.

## Lokal måling før CI
- 503 requests gav 37.815 deduplikerede officielle steder og kandidater til alle 755 dele.
- Alle dele fik både direkte kystkontekst og lokal bebyggelseskontekst; 751 ramte det balancerede loft på 30 kandidater.
- Geometri, admin, punkter, DMI, state, score, UI og aktivering er uændrede.
