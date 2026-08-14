# RavRadar 4.0.202

- Retter det for snævre standardtidsbudget i de tre private landsdækkende DMI-gitterkontroller.
- Privat kørsel #31802022918 nåede samme konsistente 835-dels bestand som tidligere, men blev afbrudt efter 11,1 minutter under den sidste DKSS-model; den foregående kørsel bestod samme datakrav på 8,5 minutter.
- Den foreløbige, endelige og fallback-baserede DMI-gate får nu det allerede anvendte private budget på 3.000 sekunder. Ingen datakrav, afstandsgrænser, DMI-modeller, RavScore eller offentlig geometri ændres.
- En workflowregression kræver fremover det eksplicitte budget på alle tre nationale DMI-gates.
