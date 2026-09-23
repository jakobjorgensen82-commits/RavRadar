# 4.0.468 – målte fortsættelser og korrekt Limfjord-kontrol

Den rumlige efterkontrol læser nu strømfastholdelsens overgang fra den
integrerede models faktiske output. Otte Limfjord-dele blev fejlagtigt
markeret som kontrolfejl i den ellers gennemførte 4.0.467-kørsel.
Testen bruger nu producentens rigtige objekt og afviser modstridende
gammel topniveaumetadata. Scoreformel, kildeprioritet og vejrdata ændres
ikke.

Almindelig weather og kode-only gemmer nu den allerede understøttede
private målte scorefortsættelse, også mens 48-timershistorikken bygges op.
Det aktiverer ikke den pensionerede rollbackmodel. En kort, dataminimeret
rapport viser efter central cache dækningen for vind, bølger,
vandstand og vandtemperatur hver for sig.

Live 4.0.467 gennemførte cache og Pages, men startede scorehistorikken
forfra efter inkompatibel ældre privat runtime. Offentlig prognose har
207/210 zoner med score, 0 med fuld historik, og mange lokale vindhuller
efter T+12. 5.201 havstrøm-kystdel×time-par mangler fortsat. 4.0.468
afventer exact-head og livebevis; scheduler er midlertidigt pauset.
