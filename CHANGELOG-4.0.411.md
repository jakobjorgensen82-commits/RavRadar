# RavRadar 4.0.411 – historikken kan fortsætte efter et nyt hul

Dato: 2026-09-18

## Rettet

- En gemt last-mile-tilstand kan igen læses efter kombinationen af et
  konservativt 40-timers reset, efterfølgende gyldig retning og et nyt hul.
- Et åbent usikkerhedsinterval udvides kun nok til at rumme den allerede
  gyldige fysiske tilstand. Eksakt historik og ugyldig state er fortsat hårdt
  afvist.
- De allerede gemte schema-6-tilstande med præcis denne snævre fejl repareres
  deterministisk ved næste læsning; der opfindes ingen vejrdata.
- Den sene normale reseal accepterer en afgrænset, payloadfri audit med
  diagnostiske fund, når Pages allerede er verificeret på korrekt main,
  modelbinding, 210 zoner, 673 kystdele og bestået privacy. En sådan pakke
  bliver aldrig kalibreringsberettiget.

## Liveevidens bag rettelsen

Normalrun `35331664087` gennemførte DMI, Copernicus, Open-Meteo, closure,
syvdøgnshistorik, cache-save, offentlig runtime, de øvrige kontroller og
Pages-deploy. 4.0.410 kom live med 210 zoner og 673 kystdele. Auditten viste
den præcise årsag: alle 673 states fejlede som
`LAST_MILE_HISTORY_POINT`. Browseren viste derfor nødvisning, kl. 11.00 i
stedet for den aktuelle time, kun tre timers verificeret historik i en
kontrolleret zone og ingen lokal femdøgnsprognose.

Deployjobbet blev først rødt efter det vellykkede Pages-deploy, fordi den
sene reseal stadig krævede en helt grøn audit. Det er rettet sammen med
statefejlen.

## Binding og drift

Formel, vægte, providerprioritet, geometri og land-/vandpunkter er uændrede.
Implementeringsrettelsen ændrer den forseglede kodeidentitet og føres derfor
ærligt frem gennem append-only migration
`20260918125600_last_mile_history_envelope_binding.sql`.

Næste trin er én exact-head, merge og én almindelig vejrkørsel på de gemte
cacher. Ingen oneoff. Siden skal derefter kontrolleres for aktuel time,
lokale femdøgnsprognoser og markant færre historik-/missingmeldinger.
