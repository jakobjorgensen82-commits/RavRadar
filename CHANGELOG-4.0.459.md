# 4.0.459 – kompletér predecessor-identiteten med manifesttider

## Hvad der blev rettet

Code-only-run `35734072736` brugte nu den korrekte predecessor-source, men
manifestkontrollen stoppede, fordi den faste identitet manglede
`productionReferenceAt` og `generatedAt`. De verificerede tider fra det
offentlige datasæt `rr-20260921170645-210` er nu med i den samme identitet.

## Afgrænsning

Rettelsen ændrer ikke data, runtime, scorematematik eller cache. Den gør kun
den allerede eksisterende fail-closed sammenligning komplet.

## Helikopterkontrol af bindinger

Den efterfølgende gennemgang fandt ikke en ny live-datafejl, men fandt en
vigtig blind vinkel i oprydningsplanen: SHA'er i immutable migrationer,
historiske recovery-workflows og test-/researchfixtures må ikke behandles som
om de var aktive runtimebindinger. Inventory og centraliseringsdesign
klassificerer nu disse som henholdsvis `IMMUTABLE_HISTORY`, `EXACT_RECOVERY`
og `FIXTURE_OR_RESEARCH`; kun `LIVE_RUNTIME` må være den aktuelle manifest-
producent. Det beskytter både den historiske missed-cutover-genopretning og
den normale weather-/predecessor-path mod en for tidlig masseoprydning.

Designet kræver nu også et udvideligt bindingregister. Et senere fund skal
kunne tilføjes som én klassificeret registerpost med producent, consumers og
målrettet validator, uden at en ny literal kopieres gennem hele workflowet.
