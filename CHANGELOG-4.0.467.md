# 4.0.467 – normal vejrkørsel må nå helt til deploy

Den seneste offentlige prognose brugte kun DMI-strøm, selv om fallback havde
hentet verificerede strømpar. Ved time 36 var ingen strøm tilbage i score.
En eksisterende måltest afslørede årsagen: en fejl i valgfri historik kunne
afvise hele den selvstændigt verificerede 118-timers strøm-closure. Den
fejl er rettet; ugyldig historik bliver stadig afvist for sig selv. Et
dataminimeret logfelt viser fremover, hvilke af de tre beviser der faktisk
blev godkendt. Livebevis af fallback i score afventer næste normale run.
Den efterfølgende rumlige kontrol bruger samme afgrænsning: valgfri
historik kan ikke annullere en godkendt operationel closure, mens en defekt
closure fortsat bliver afvist.
Fordi strømrettelsen ændrer modelens kodefingeraftryk, følger en ny
append-only databasebinding med. Allerede anvendte migrationer ændres ikke,
og tidligere gyldig scoretilstand kan fortsætte.

De normale kørsler `35794859378` og `35804736772` gemte vejrleverandørernes
fremgang, men blev afbrudt ved buildjobbets fælles 90-minuttersloft. Den
seneste gennemførte central cache og blev først afbrudt i den efterfølgende
kontrol. Derfor kom der hverken nyt artifact eller deploy fra de to kørsler.

Det fælles normaljob får 180 minutter, så de eksisterende trin kan nå fra
DMI/Copernicus/Open-Meteo gennem central cache, kontroller og artifact.
Leverandørernes egne tidsbudgetter, datavalidering, sikkerhed og deploykrav
er uændrede. Cache-/scoretrinnet målte næsten 39 af sine 45 minutter uden
den nu rettede supplerende strøm og får derfor 60 minutters trinloft.
En målrettet workflowtest kræver plads til hele normalforløbet.

Omkring 5.600 strøm-kystdel×time-par mangler stadig i de seneste private
rapporter. De er et særskilt åbent dækningsproblem, ikke løst af den længere
jobgrænse eller score-rettelsen; der ændres ingen dataværdier eller
leverandørprioritet her. Den offentlige 4.0.466-runtime havde også
ufuldstændig 48-timers scorehistorik trods videreført tilstand for alle
673 kystdele; det skal måles igen efter en gennemført ny kørsel.
