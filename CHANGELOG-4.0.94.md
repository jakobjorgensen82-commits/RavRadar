# RavRadar 4.0.94

## Formål
Sikker afslutning af den centrale adminregel-kæde uden ændringer i scoreformler, DMI, zoner, kort eller eksisterende adminredigering.

## Rettet
- Aktive administratorregler publiceres nu automatisk fra Supabase som en særskilt, sanitiseret offentlig regelfil ved deployment.
- Den offentlige RavScore læser ikke længere administratorregler fra den enkelte browsers `localStorage`.
- Kladder og inaktive regler kommer ikke i den offentlige regelfil og påvirker ikke brugerne.
- Privat kildemetadata og interne adminfelter fjernes fra den publicerede regelfil.
- Rå synkroniserede filer under `data/admin/` udelukkes fra GitHub Pages-artifactet.
- Release Gate og en ny integrationskontrakt stopper fremtidig regression i denne kæde.

## Bevidst ikke ændret
- RavScore-formler og vægte.
- DMI-, forecast- og cachekæden.
- Zoneantal, zonenavne, kystlinjer og retningsankre.
- Kystlinjeeditorens **Flyt kort** og **Præcis redigering**.
- Vandstandsstationsrouting.
- Lokale model-forslag og observationer, som fortsat er tydeligt lokale efter gældende beslutning.

## Validering
- Baseline 4.0.93 blev først valideret uændret.
- Ny test simulerer aktiv, kladde- og inaktiv regel og beviser, at kun den aktive regel publiceres og påvirker score.
- Pages-workflowet testes for udelukkelse af rå adminfiler.
