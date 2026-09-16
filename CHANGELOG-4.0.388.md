# RavRadar 4.0.388

## Rettet

- Copernicus fjerner nu en gendannet, kortlivet segmentjournalpost, når ingen af postens bestilte par længere findes i den aktuelle DMI-hulmatrix.
- En blandet historisk post bevares fortsat helt og uændret, hvis mindst ét af dens par stadig er aktuelt; immutable auditbevis klippes eller omskrives ikke.
- Den strenge source-stage-validering er uændret og vil fortsat afvise alle poster, som ikke er bundet til den aktuelle matrix.
- Regressionen låser både nul-overlap-fjernelse og bevarelse af en blandet post med aktuelt overlap.

## Produktionsforløb

- 4.0.387 bestod exact-head sourcegate `35051800082`, blev merged gennem PR #330 som main `529f8888f7022232709a699ee5289a9dd52fdd99` og blev leveret providerfrit i `35052231130`.
- Den levende side viste derefter integreret 4.0.387, 210 zoner og 673 kystdele. Den nye model er online, men visningen er fortsat i nøddrift på gamle vejrdata.
- Første almindelige `force=false`-weather `35052715440` gennemførte DMI, gemte DMI- og Copernicus-fremgang og stoppede før Open-Meteo, writes og deploy på den gamle nul-overlap-journalpost.
- Efter merge genbindes den uændrede private runtime providerfrit til 4.0.388, hvorefter en almindelig vejrkørsel genbruger de gemte cacher. Ingen oneoff.

## Bevaret

- DMI → Copernicus → regional DMI → Open-Meteo, datagodkendelse, providerbudgetter, RavScore, geometri og offentlig datakontrakt er uændrede.
- Ingen manglende par syntetiseres eller mærkes som fundet.
- Scheduler forbliver pauset, indtil den rettede normale kørsel er fulgt sikkert.
