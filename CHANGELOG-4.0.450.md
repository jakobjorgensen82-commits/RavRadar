# RavRadar 4.0.450

## Rettet

- Den normale `Update central weather cache`-handling havde en fast grænse på
  25 minutter. Den afbrød en gyldig 118-timersbygning efter scorebygningen,
  selv om processen stadig arbejdede og endnu ikke havde forsøgt at skrive et
  nyt cacheartifact.
- Grænsen er hævet til 45 minutter for både normal produktion og den samme
  private kapacitetsfortsættelse. Det er stadig en fast, bounded grænse; den
  tillader blot den målte offentlige forseglingstid plus normal variation.
- Workflowtesten kræver nu, at produktionssteppet beholder denne grænse.

## Livegrundlag

- Run `35546109889` gennemførte DMI, Copernicus og Open-Meteo samt 673/673
  scoreklare kystdele. Det stoppede præcist ved 25 minutter i cachetrinnet.
- En providerfri produktionsgenbygning brugte 21 minutter på den samme
  afsluttende runtimeforsegling. Der var derfor ikke belæg for at ændre
  leverandørprioritet eller kalde datafejlen en providerfejl.

## Uændret

- DMI-first, fallbackregler, gamle gyldige værdier, MISSING-regler,
  scoreformel, geometri og migrationernes SQL er uændrede.
- Næste normale kørsel skal bevise, at den længere grænse når privat save,
  artifact, deploy og offentlig runtime.
