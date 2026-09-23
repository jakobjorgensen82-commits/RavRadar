# 4.0.467 – normal vejrkørsel må nå helt til deploy

De normale kørsler `35794859378` og `35804736772` gemte vejrleverandørernes
fremgang, men blev afbrudt ved buildjobbets fælles 90-minuttersloft. Den
seneste gennemførte central cache og blev først afbrudt i den efterfølgende
kontrol. Derfor kom der hverken nyt artifact eller deploy fra de to kørsler.

Det fælles normaljob får 180 minutter, så de eksisterende trin kan nå fra
DMI/Copernicus/Open-Meteo gennem central cache, kontroller og artifact.
Provider- og cachetrinnenes egne tidsbudgetter, datavalidering, sikkerhed og
deploykrav er uændrede. En målrettet workflowtest kræver plads til hele
normalforløbet.

Omkring 5.600 strøm-kystdel×time-par mangler stadig i de seneste private
rapporter. De er et særskilt åbent dækningsproblem, ikke løst af den længere
jobgrænse; der ændres ingen dataværdier eller leverandørprioritet her.
