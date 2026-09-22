# DEC-0230 – Normal cachebygning får en eksplicit Node-heap

**Status:** Bindende fra 4.0.452; produktionsbevis afventer næste normale
continuation.

Run `35662538047` gennemførte leverandørkæden og nåede
`component-runtime-ready`, men cachetrinnet stoppede med Node/V8
`heap out of memory` omkring standardgrænsen på 4 GB. Den private krypterede
vejr-fremgang blev gemt efter stoppet. Det er derfor en proceskapacitetsfejl i
runtimebygningen, ikke evidens for manglende DMI-, Copernicus- eller
Open-Meteo-data.

Det almindelige cachetrin sætter fra 4.0.452
`NODE_OPTIONS=--max-old-space-size=8192`. Det ændrer ikke providerbudgetter,
DMI-first-prioritet, fallbackregler, scoreformel, geometri eller
komplethedskrav. Tidsgrænsen er fortsat 45 minutter. Næste normale kørsel
skal genbruge den gemte fremgang; en ny one-off er ikke nødvendig uden ny
evidens.

En målrettet workflowtest kræver indstillingen. Hvis 8 GB ikke er nok, skal
memory-forbruget reduceres i score/runtimebygningen med målt evidens; gentagne
identiske genkørsler uden ændring er ikke en løsning.
