
## 4.0.243 - releasekandidat: komplette ture (2026-08-21)

- Nye læringsdata er komplette søgeture med start, slut, varighed, metode, faktisk zone/kystdel, grundighed og fund/ikke-fund.
- Prognosen ved turstart fastholdes med et dataminimeret kalibreringssnapshot; individuelle fund er ikke fit-enheden.
- GPS, rute, spor og præcis position fjernes fra fjernpayloaden.
- Eksisterende observationer bevares som v1-dækningsdata; RavScore 25/40/35 er uændret.
- Kandidaten er ikke produktion før Supabase-migration, fulde gates, deploy og 210/673-browserkontrol.

## 4.0.252 - fair landsrangering (2026-08-21)

- Begge nationale top-5-lister korrigerer nu for mange forskelligt vendte kystdele med den godkendte `direction-broad-19-v1`-model.
- Bred støtte i zonen beskytter reelt stærke placeringer; ved mindst 50 procent støtte er korrektionen nul.
- Den viste RavScore, lokale resultater, pile, forklaringer, geometri og land-/vandpunkter er uændrede.
