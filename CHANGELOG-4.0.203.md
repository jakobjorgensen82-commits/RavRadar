# RavRadar 4.0.203

- Binder den uafhængige 10-meter land-/vandkontrol til præcis den private punktbestand, som blev auditeret. Et bevis fra en anden kandidat afvises nu før DMI-kontrol.
- Den foreløbige kandidat er målt til 835 dele: 614 verificerede, 54 sikkert vendte og 167 blokerede. Slutkandidaten er målt til 652 dele: 427 verificerede, 111 sikkert vendte og 114 blokerede.
- Tvetydige punktpar får ingen aktive land-/vandmarkører. De bevarer to neutrale alternativer og forbliver uden vejr, state, score eller automatisk aktivering, indtil de er afgjort.
- Fallbackkandidaten har 17 dele: 11 verificerede, fire sikkert vendte og to blokerede. Rettede eller blokerede punktpar føres 1:1 videre til kandidatens kontrolartifact.
- Fejø/Femø og Havnø/Mariager Fjord øst er låst som slettede i fallbackbygger og validator. Ingen af dem kan genopstå fra den historiske seks-zoneplan.
- Offentlig geometri, offentlige land-/vandpunkter og RavScore ændres ikke af denne private pipelineændring. En ny fuld privat kørsel og særskilt ejerbeslutning kræves fortsat før enhver aktivering.
