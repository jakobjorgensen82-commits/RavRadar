# RavRadar System Specification 1.0

Status: integreret arkitekturgrundlag  
Projektversion: 2.6.25  
Formål: gøre RavRadar klar til regelstyret ekspertviden, Supabase-synkronisering, analyse af brugerfund og løbende forbedring af RavScore.

## 1. Grundprincipper

RavRadar skal bevare sin offline-first PWA-adfærd. Supabase er senere systemets synkroniserings- og analysetjeneste; telefonen fungerer fortsat som lokal cache og kan bruges uden forbindelse.

Systemets viden holdes i tre adskilte klasser:

1. **Dokumenteret viden** – fysik, meteorologi, oceanografi, kystprocesser og verificerbare kilder.
2. **Ekspertviden** – erfaringer fra administratoren og identificerede ravjægere.
3. **Databaserede hypoteser** – mønstre udledt af registrerede fund og samtidige/historiske miljødata.

Ingen regel må være aktiv uden kilde, geografisk gyldighed, version og tillidsniveau.

## 2. Tillidsniveau

Kun tre værdier må anvendes i hele systemet:

- `lav`
- `mellem`
- `stor`

Tillidsniveauet er en administrativ vurdering og må ikke forveksles med statistisk sandsynlighed. En regel ændrer aldrig automatisk sit tillidsniveau; systemet kan foreslå en ændring, men administratoren godkender den.

## 3. Systemlag

### 3.1 Klient/PWA
Viser kort, zoner, score, ture, observationer og forklaringer. Gemmer brugerens data lokalt og synkroniserer senere med Supabase.

### 3.2 Vejrpipeline
Prioritet:

1. DMI
2. Open-Meteo Marine
3. MET Norway
4. senest gyldige cache

Vejrinput normaliseres til et fælles snapshot-format, så algoritmen og analysen ikke afhænger af den konkrete leverandør.

### 3.3 Basisscore
Den eksisterende RavScore beregner en fysisk/operationel score ud fra jagtbarhed, transport og frigivelse.

### 3.4 Regelmotor
Regelmotoren anvender geografiske, tidslige og miljømæssige betingelser oven på basisscoren. Regler kan give bonus, straf, fastholde en tidligere effekt eller markere utilstrækkelige data.

### 3.5 Observations- og analysemotor
Et fund kobles til det aktuelle miljøsnapshot og historiske vind-, bølge-, strøm- og vandstandsforløb. Data kan eksporteres til analyse uden direkte personidentifikation.

### 3.6 Administration
Administrator kan oprette, versionere, teste, aktivere og deaktivere regler; eksportere data; kontrollere datakvalitet; og sammenligne score med faktiske fund.

## 4. Regeltyper

- `bonus`: lægger point til basisscoren.
- `penalty`: trækker point fra basisscoren.
- `persistence`: fastholder ravpotentiale i en periode, selv om andre forhold bliver mindre gunstige.
- `gate`: kræver at en betingelse er opfyldt, før en anden regel må påvirke scoren.
- `override`: erstatter en delberegning i en klart afgrænset situation.
- `annotation`: ændrer ikke score, men giver forklaring/advarsel.

En regel må som udgangspunkt ikke ændre samlet score med mere end 20 point uden eksplicit administratorgodkendelse og dokumenteret begrundelse.

## 5. Regelprioritet og konflikter

Regler evalueres i denne rækkefølge:

1. datakvalitet og sikkerhed
2. gates
3. lokale overrides
4. persistence-regler
5. bonus/penalty
6. annotationer

Mere specifik geografi vinder over bredere geografi. Ved samme specificitet vinder højere prioritet; derefter nyeste godkendte version. Alle anvendte regler logges i scoreforklaringen.

## 6. Persistence: "rav bliver liggende"

En persistence-regel beskriver, at gunstige tidligere forhold kan have placeret rav i en zone, og at potentialet bevares i et tidsrum, når efterfølgende forhold ikke forventes at fjerne eller begrave det.

Reglen skal kunne udtrykke:

- geografisk område
- historisk vindretning og maksimal/minimal styrke
- historisk strømretning og styrke
- nødvendigt varighedsvindue
- efterfølgende maksimum for vind/bølge/strøm
- varighed af fastholdelsen
- gradvis nedtrapning eller fast effekt
- forhold der straks annullerer effekten

## 7. Observationer

Et brugerfund skal kunne registrere:

- zone og eventuelt GPS med kontrolleret præcision
- observationstidspunkt
- jagtform
- resultatkategori og valgfri vægt
- RavScore og scoreforklaring på tidspunktet
- vejr-/havsnapshot
- historiske aggregeringer: 6, 12, 24, 48 og 72 timer
- anvendte regelversioner
- datakvalitet og kilde pr. måling

Ingen billeder er påkrævet eller understøttet i den nuværende observationstype.

## 8. Analyseudtræk

Systemet skal kunne eksportere pseudonymiserede CSV- og JSONL-filer med én række pr. observation og flade analysefelter. Direkte bruger-id, mail og præcis rå GPS må ikke indgå i standardudtræk.

Minimumsfelter:

- observation_id
- zone_id
- observed_at
- result og grams
- basis_score, rule_adjustment, final_score
- vind/strøm/bølge/vandstand nu
- cirkulære retningsfeatures og historiske aggregater
- sæson, time på dagen og tid siden markant hændelse
- anvendte regel-id/versioner

## 9. Algoritmeudvikling

Data bruges i tre trin:

1. eksplorativ analyse og datakvalitetskontrol
2. test af på forhånd formulerede hypoteser
3. kontrolleret A/B- eller shadow-evaluering af ny algoritme

En model eller regel må ikke sættes i produktion alene på baggrund af træningsdata. Der skal bruges tidsopdelt validering og helst geografisk hold-out, så modellen ikke blot husker enkelte zoner.

## 10. Supabase-arkitektur

Den medfølgende SQL er udvidet med fremtidige tabeller for regelkatalog, regelversioner, scoreevalueringer, vejrhistorik og eksportjobs. Klienten må ikke få administrative rettigheder. Regelændringer foretages via admin-bruger/Edge Function eller service role på serveren.

## 11. Domæne og drift

`ravradar.dk` bør sikres tidligt. Produktionsmiljøet skal bruge HTTPS, egen Supabase-projektkonfiguration, separate secrets og versionsstyret deployment. Domænet ændrer ikke datamodellen og kan kobles på før eller efter Supabase, men før lukket beta.

## 12. Næste implementeringsrækkefølge

1. Validér denne arkitektur og udfyld de første ekspertregler.
2. Udvid mobil-layoutet, så kortet fylder ca. 60–70 % og zonepanelet fungerer som bottom sheet.
3. Implementér regelmotor lokalt i shadow mode uden at påvirke den viste score.
4. Opsæt Supabase og migrationer.
5. Implementér synkronisering og snapshot-indsamling.
6. Byg administrationsside med regelredigering og eksport.
7. Kobl `ravradar.dk` på og gennemfør lukket beta.
