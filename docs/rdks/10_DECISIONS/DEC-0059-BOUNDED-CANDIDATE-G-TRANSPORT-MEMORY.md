# DEC-0059: Afgrænset Candidate G-transporthukommelse uden maskinstart

**Status:** Aktiv transportmemory-kontrakt; aktiveringsstatus er erstattet af DEC-0060, og cadencefortolkningen er rettet i DEC-0061

**Dato:** 2026-08-23

**Scorepåvirkning:** Ingen ved dette checkpoint; kontrakten blev senere aktiv via DEC-0060/4.0.261

## Problem

DEC-0055/0057 førte et transportreservoir videre mellem produktionskørsler uden passivt tab ved verificeret neutral strøm. Den naturlige 4.0.260-shadow viste, at dette gjorde den første maskinstart til en vedvarende modelprior: 493 af 673 transporttilstande stod på 0 uden dokumenteret udtransport, og eksisterende 65–117 timers offentlig historik kunne fortsat ikke afgøre, om reservoiret burde være startet på 0, 50 eller 100.

En ny computer, en ny stateversion eller en nulstilling må ikke kunne farve Candidate G permanent. En vilkårlig startprior på 50 ville kun flytte problemet; den ville ikke gøre resultatet observerbart eller reproducerbart.

## Beslutning

1. Candidate G's transporttilstand beregnes fra et fast rullende vindue med de seneste 48 timers verificerede, kystnormale strømbevis.
2. Hvert komplet vindue genafspilles fra en fast randværdi på 0. Denne værdi betyder **ingen dokumenteret indtransport før vinduets begyndelse**. Den betyder ikke dokumenteret udtransport og kan aldrig alene udløse 13-timersgaten.
3. Persistéret `transportPotential` og persistérede effektive udtransporttimer er output, ikke startinput til næste komplette genafspilning. Når vinduet er komplet, giver samme strømforløb derfor samme resultat uanset en tidligere maskinværdi på 0, 50 eller 100.
4. Den centrale state gemmer højst vinduets 49 native bevispunkter som en afledt styrke mellem -1 og 1: positiv mod kysten, negativ fra kysten, 0 verificeret neutral og `null` eksplicit missing. Rå U/V, fart, retning, koordinater, geometri, kystdels-id'er og private payloads må ikke indgå i evidensrækken. DEC-0061 præciserer, at de verificerede native beviser må ligge højst tre timer fra hinanden.
5. Et aktiveringsklart vindue kræver præcis 48 timers sammenhængende dækning ved den aktuelle referencetime. Faktisk tid mellem native beviser integreres uden kunstige mellemtimer. Missing eller et tidsgab over tre timer må ikke omskrives til neutral strøm. DEC-0061 begrænser desuden pre-public opvarmning til `WINDOW_INCOMPLETE`; ægte gaps holder profilomskifteren fail-closed på legacy.
6. Samme-time-rekørsel genbruger den allerede registrerede time og tæller ikke dobbelt. Ved en senere verificeret time beskæres alt ældre end 48 timer automatisk.
7. DEC-0055's `0,03→0,15 m/s`, +10/-8 point, gradvise tab fra første udgående time og faktiske udtransport ved 13 effektive timer bevares. Styrke over 0,15 m/s får ikke ekstra transportpoint. Indgående strøm nulstiller et igangværende udtransportforløb og bygger gradvist igen.
8. Statekontrakten versionsløftes til `2.0.0` og profilen til `current-0.03-0.15-in10-out8-exhaust13-window48-boundary0-wave-build4-decay48`. Den gamle ubundne transportstate genbruges ikke. Den nye afledte evidens opbygges naturligt i højst 48 timer, mens offentlig legacy fortsætter uændret.
9. Mobiliseringens særskilte fire timers opbygning og 48 timers aftrapning ændres ikke. Vægtene for Candidate G er fortsat `20/50/30`; offentlig score er fortsat `25/40/35`.

## Verifikation uden realtidsventetid

Den ejerbestilte validering må ikke kræve endnu en 48-timers realtidsobservation. Kontrakten testes derfor med deterministisk simulation og eksisterende offentlig historik:

- 47 timer er ikke aktiveringsklart; et komplet 48-timersvindue er uafhængigt af eksterne startværdier 0/50/100;
- verificeret neutral strøm giver 0 fra den faste rand, fuld indtransport bygger til 100, og strøm over fuldstyrkegrænsen giver ikke ekstra kredit;
- 12 effektive udgående timer fra 100 ender på 4 uden totalgate, mens 13 timer giver faktisk udtransport og 0;
- én kraftig udgående time efter opbygning giver 92, og fornyet indtransport stopper udtransportforløbet og bygger igen;
- missing og tidsgab holder vinduet ikke-aktiveringsklart og behandles ikke som nulstrøm;
- opdelt og ubrudt pipeline, same-time-rekørsel, ændret kontekst, statefeltliste og raw-input-negativliste er låst i målrettede tests.

Den dataminimerede genafspilning læste 42.551 offentlige historikposter. Den supplerende historikfil indeholder 633 dele; 582 havde et ubrudt eksakt 48-timersvindue under den skærpede cadencegate. På alle 582 var mismatch mellem tænkte eksterne starter 0/50/100 lig 0. De resterende 91 må ikke fortolkes som manglende almindelig RavRadar-vejrcoverage: 40 dele bruger den primære DMI-vej uden at være i supplementfilen, og resten har huller i netop denne historikfil.

## Aktivering og rollback

- Candidate G er fortsat `diagnostic-only` og kan ikke aktivere sig selv.
- Legacy `RRS-CURRENT-B0-4.0.247` med offentlig `25/40/35` er fortsat aktiv og eksakt rollback.
- Et nyt eller ufuldstændigt 48-timersvindue gør Candidate G ikke aktiveringsklar; hele datasættet forbliver på legacy.
- Offentlig aktivering kræver stadig komplet 673/673 bounded-memory-readiness, frisk grøn slutshadow på den eksakte aktiveringskode, central admin-roundtrip, fulde gates og særskilt ejer-gennemgang.
- Den kortere opbygningsperiode efter stateversioneringen må ikke kaldes et 48-timersbevis. Der skal heller ikke ventes 48 timer for at acceptere den mekaniske implementation; simulation og historisk replay er det aftalte implementeringsbevis.

## Erstattet og bevaret

DEC-0059 erstatter DEC-0055/0057's ubundne videreførelse af selve transportpotentialet samt den efterfølgende anbefaling om en neutral startprior på 50. De gamle start-0/50/100- og passive-halveringsspor bevares som følsomhedsevidens, ikke som produktvalg.

DEC-0054's jagtbarhed, DEC-0055's ind-/udtransportkurve og forklaring, DEC-0056's mobilisering samt DEC-0058's globale fail-closed omskifter bevares. Ingen geodata, land-/vandpunkter, bund-, dybde-, rende-, revle-, adgangs- eller sikkerhedsregler ændres.

## Efterfølgende pre-public aktivering i DEC-0060

DEC-0060 ændrer ikke dette dokuments 48-timersvindue, randbetydning, missingregel eller transportfysik. Ejeren accepterer imidlertid, at den endnu ikke offentlige side bruger de tydeligt foreløbige Candidate G-resultater, mens vinduet fyldes. Kravet om komplet `transportMemoryReady` før aktivering er derfor erstattet for denne pre-public opvarmning; runtime skal fortsat vise den faktiske ufuldstændige status, og komplet scoreprojektion i hele datasættet er stadig en global fail-closed gate.

## Senere P0-fund: faktisk cadence matcher ikke kontrakten

Efter aktiveringen viste live `rr-20260823121818-210`, at produktionen viderefører afledte beviser med tre timers afstand, mens `maximumGapHours=1`. Det kontinuerte suffix reduceres derfor til én prøve med nul forløbstid, og transportpotentialet står på 0 i alle 673 dele. Dette ændrer ikke beslutningens tilsigtede fysik, men viser en implementerings-/cadencefejl: vinduet kan ikke blive komplet under den aktuelle rytme. Global rollback eller en særskilt testet rettelse kræves.
