# RavRadar 4.0.383

## Rettet

- Code-only finder den Pages-deployment, der faktisk er offentlig, i stedet
  for blindt at bruge en ældre central pointer.
- Den kendte 4.0.381-kilde kan repareres gennem en eksakt hash-, run-, artifact-
  og deploymentlåst politik. Kun den dokumenterede ene 404 accepteres som
  defekt kilde.
- Central same-binding maintenance får det observerede offentlige source-id,
  så historikken igen kan følge den virkelige Pages-rækkefølge.
- Resolverregressionen er samlet i den eksisterende code-only-kontrol, så
  sourcegaten fortsat har højst 24 direkte kommandoer og ikke bliver tungere.

## Uændret sikkerhed og produkt

- 4.0.383-målet skal fortsat have 79/79 korrekte browserfiler både før og efter
  deploy. Privacy, model, source og latest-main er stadig hårde krav.
- Der ændres ingen RavScore-formel, vejrdata, kystgeometri, zonegeometri eller
  land-/vandpunkter.
- Leveringen er providerfri. Normal tidsbegrænset weather følger først efter
  offentlig og central verifikation; der køres ingen oneoff.
