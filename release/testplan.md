# Testplan vóór publicatie

Gebruik de nieuwste debug-APK voor speltests en de ondertekende release-AAB via een storetesttrack voor de uiteindelijke releasecontrole. Debug gebruikt testadvertenties. Test echte advertentie-ID's uitsluitend met in AdMob geregistreerde testapparaten.

| Controle | Verwacht resultaat | Status |
| --- | --- | --- |
| App starten | BusBende opent na splash, zonder crash; startactiviteit bestaat. | Startactiviteit toegevoegd; toesteltest open. |
| Host en joiner | Twee telefoons komen via code/QR-link in dezelfde kamer; namen beginnen met hoofdletter. | Open |
| Gokstappen | Kaarten en resultaten kloppen; bediening blijft bereikbaar bij kleine schermen en toetsenbord. | Open |
| Boomverdeling | Totaal en uitdelers kloppen; popup blijft 8 seconden, lange namen/lijsten zijn leesbaar. | Open |
| Bus | Actieve kaart bereikbaar; fout met slokken blijft 6,5 seconden zichtbaar; dubbelkaartregels kloppen. | Open |
| Geluid | Menu speelt door tot de start; juiste klik/disco/toeter/victory; mute en achtergrondpauze werken. | Automatische effecttests; toesteltest open. |
| Spel beëindigen | Confetti verschijnt; opnieuw spelen werkt na sluiten/geen advertentie. | Open |
| Web-advertentie | Alleen eindscherm; geen blokkering bij geen advertentie/adblocker; geen dubbele aanvraag. | Mockcontrole geslaagd; live levering open. |
| Privacy | Toestemming, weigeren en heropenen werken; juiste Google-berichten gepubliceerd. | Account-/toestelcontrole open. |
| Netwerkverlies | Gebruiker krijgt begrijpelijke feedback; geen onbedoelde deelname/acties na reconnect. Host-disconnect sluit nu de kamer. | Open |
| Herhalen | Meerdere potjes na elkaar, rotatie/achtergrond, lange namen; geen vastgelopen knoppen of geluid. | Open |
| Formaten | Kleine Android-telefoon, grote telefoon en iPhone; veilige marges en alle knoppen bereikbaar. | Open |

Android-instrumentatietest voor opstarten: `cd android`, daarna `./gradlew.bat connectedDebugAndroidTest` met één aangesloten testapparaat/emulator. Niet uitgevoerd zonder beschikbaar apparaat.

Leg per fout vast: toestel/OS, buildversie, stappen, verwacht/werkelijk resultaat en screenshot. Publiceer pas als de essentiële spel-, privacy- en opnieuw-spelenstromen op de releasebuild zijn gecontroleerd.
