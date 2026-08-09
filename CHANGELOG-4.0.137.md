# RavRadar 4.0.137

- Tilføjer en privat, score-neutral DMI-gridgate for Blåvands to vandpunktkandidater.
- Genbruger produktionens native STAC/GRIB-parser, nearest-valid-cell-søgning, fysiske afstandsgrænser og fælles U/V-grid-/vertikallagsregel.
- Kontrollerer `wam_nsb` for bølger og `dkss_nsbs` for vandstand og strøm uden at skrive vejrværdier til rapporten.
- Rapporterer særskilt, om de to kandidater faktisk rammer forskellige gridceller pr. komponent.
- Ændrer ikke produktionsgeometri, centralt gemte admin-data, vejrsampling, RavScore eller Pages-indhold.

Status ved kandidat: lokal self-test bestået; privat CI-pilot, artifactreview og almindelig produktionsverifikation afventer.
