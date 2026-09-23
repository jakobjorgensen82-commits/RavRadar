# 4.0.470 – ret kystdelens identitet i historikcheckpointet

- 4.0.469 blev merged, men providerfrit run `35844441095` stoppede før
  publicering. Score-runtime-audit var grøn; checkpointet læste ID på en
  anden placering end producenten skriver det.
- Checkpointet bruger nu den validerede kystdel-nøgle til den private
  tilstandsidentitet. Et eventuelt indre ID må ikke modsige nøglen.
- Regressionen bruger produktionsformede kystdele uden indre ID. Vejrdata,
  scoreformel, leverandørprioritet og geometri er uændrede.
- Ny append-only databasebinding `20260923100000` følger checkpointets nye
  implementeringshash; den allerede anvendte `20260923091500` er urørt.
- Næste bevis er providerfri udrulning, dernæst en almindelig vejrkørsel
  med optælling pr. leverandør og vejrtype. Automatisk plan er stadig pauset.
