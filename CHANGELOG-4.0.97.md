# RavRadar 4.0.97

## Rettet og præciseret
- Vandstandsstationsfanen skelner nu tydeligt mellem **stationsbaseret cache** og DMI's **zonebaserede modelprognosecache**.
- En station uden stationscache vises ikke længere med den misvisende tekst “Ingen prognosecache”. Teksten er nu “Ingen stationsbaseret cache”.
- “Utilgængelig” er erstattet af “Ingen brugbar stationsværdi nu”, fordi status kun gælder stationens anvendelighed til målestationsbaseret override — ikke zonens offentlige DMI-modelprognose.
- Når et gemt administratorvalg indeholder en station uden dokumenteret brugbar stationsværdi, forklarer admin nu, at valget kun anvendes i en vejrkørsel, hvor stationen faktisk har en brugbar værdi.
- Override-status siger nu korrekt, at administratorvalget erstatter automatikken, **når de valgte leveringskrav er opfyldt**.

## Ikke ændret
- DMI-hentning, DMI-modelcache og offentlige vandstandsprognoser.
- Beregningen af stationsoverride, inverse afstandsvægte og `requireAll`-kravet.
- RavScore, offentlig side, service worker og kortets statusfarver.

## Rodårsag
Admin brugte ordet “prognosecache” om en stationsspecifik cache, selv om RavRadar samtidig kan have en gyldig zonebaseret DMI-modelprognose. For Hirtshals kunne teksten derfor se ud som om hele vandstandsprognosen manglede cache, selv om zoneprognosen fungerede. Det var en semantisk adminfejl, ikke dokumentation for fejl i DMI-prognosekæden.
