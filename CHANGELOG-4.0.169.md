# RavRadar 4.0.169

- Privat #31445033036 bekræftede fire native havtidspunkter og bestod tretimersgaten, men vindtrinnet hentede derefter flere store HARMONIE-filer end downloadgrænsen tillader.
- Vindgaten vælger nu præcis to native HARMONIE-assets: først et tidspunkt, som matcher et dokumenteret marint `t`/`t+3h`-par, derefter ét andet tidspunkt til den krævede selvstændige vindserie.
- Vind-U/V skal fortsat dele fysisk gridcelle, mindst to trin kræves, og interpolation, parentfallback og konstrueret trend er fortsat forbudt.
