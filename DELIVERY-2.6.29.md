# Leveringsnotat – RavRadar 2.6.29

Denne levering er bygget direkte på den uploadede `RavRadar(11).zip`.

## Adgang til administration

1. Åbn RavRadar.
2. Tryk på RavRadar-logoet 10 gange inden for fem sekunder.
3. Indtast PIN `1931`.
4. Tryk **Åbn administration**.

Direkte adgang til `admin.html` uden den aktive PIN-session viser en låst side.

## Kontroller udført

- JavaScript-syntaks kontrolleret for app-, udvikler- og administratorfiler.
- Samlet `npm run validate` bestået.
- 223 zoner valideret.
- Scoremotor og regelmotor bestået.
- Weather-health, kystlinjer, zoneplan og vidensbase bestået.
- GitHub Actions-workflow bevaret og versionsløftet.

## Afgrænsninger

Administratorcenteret er drifts- og analyseorienteret. Permanent redigering af regler kræver stadig serverbaseret administratorgodkendelse. Eksterne alarmer kræver valg og opsætning af en alarmkanal.
