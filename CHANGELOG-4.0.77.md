# RavRadar 4.0.77

- Oversigt i admin renderes straks efter godkendt Supabase-adgang og opdateres igen, når alle data er indlæst.
- Den samlede sitetest venter nu på en eksplicit admin-ready-markør før fanerne testes.
- Browserdialoger i den isolerede admin-test opsamles i rapporten og vises ikke oven på den synlige adminside.
- Rettighedsafvisninger i testtilstand registreres uden `alert` og uden at afbryde resten af testen.
- Adminfaner testes først, når de er synlige, tilladte og færdiginitialiserede.
- Versionskontrollen sammenligner den faktisk viste offentlige version, adminversion, service-worker-version og `version.json`, i stedet for at søge efter en tekststreng i potentielt cachet HTML.
- Ny regressionstest beskytter første dashboard-rendering og testens dialoghåndtering.
