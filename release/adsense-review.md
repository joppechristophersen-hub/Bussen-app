# Websitecontrole voor een nieuwe AdSense-beoordeling

De afwijzing noemt Content van weinig waarde. De precieze pagina of doorslaggevende oorzaak is niet bekend. Deze wijzigingen verbeteren de uitleg en toegankelijkheid; ze garanderen geen goedkeuring.

## Wat is aangepast

- De homepage legt het starten en deelnemen concreet uit.
- Spelregels bevatten kaartvoorbeelden, tiebreak en de echte bus-/checkpointinstellingen. De oude onjuiste tekst over een gelijke buskaart is vervangen: de keuzes zijn Bus doorgeven en Iemand meenemen.
- /veelgestelde-vragen/ helpt bij kamercodes, verbinding, geluid en bediening.
- /over-busbende/ bevat productinformatie en een contactmogelijkheid via het bestaande info@busbende.nl.
- Vijf openbare pagina's worden tijdens de build als HTML geschreven. De tekst, links en koppen zijn beschikbaar zonder JavaScript. React hydrateert deze inhoud in de browser. Het spel heeft een afzonderlijke /spelen/index.html.
- Iedere inhoudspagina heeft een eigen titel, omschrijving en canonical. sitemap.xml bevat ook het bestaande privacybeleid; robots.txt verwijst naar de sitemap.
- Het globale AdSense-script is verwijderd; de accountverificatie blijft als meta-tag aanwezig. Het korte eindscherm vraagt standaard geen display-advertentie meer aan. De bestaande implementatie blijft achter VITE_WEB_ENDGAME_ADS=true, uitsluitend opnieuw te activeren na een nieuwe beoordeling van plaatsing en inhoud. Native AdMob is niet uitgezet.

## Controleren en publiceren

1. Voer npm run build, npm run test:public, npm run test:effects en npm run lint uit. Lint heeft drie al bestaande waarschuwingen.
2. Publiceer de volledige dist-map, inclusief de nieuwe paginamappen, sitemap.xml en robots.txt. Alleen index.html vervangen is onvoldoende. Geef echte bestanden voorrang op eventuele SPA-fallbackregels.
3. Open Home, Spelregels, Hulp, Over & contact en Privacy rechtstreeks op hun URL. Controleer ook een klein telefoonscherm en het starten/joinen van een spel. De geautomatiseerde browsercontrole kon in de uitvoeromgeving niet starten; mobiele visuele controle is daarom nog open.
4. Controleer of het contactadres werkt. Publiceer de juiste privacy-/toestemmingsberichten in het Google-dashboard. Laat automatische advertenties uit als er geen afzonderlijk beoordeelde plaatsingen zijn; de verificatiemeta-tag schakelt ze niet aan.
5. Controleer via Search Console of de openbare URLs bereikbaar zijn en dien de sitemap in. Vraag pas daarna in AdSense een nieuwe beoordeling aan. Er is vanuit dit werk geen beoordelingsverzoek verstuurd.

## AdMob uit het aangeleverde scherm

Betalingsprofiel en het eerste advertentieblok staan als afgerond. De openstaande taak is koppelen aan een ondersteunde store. Dat scherm bewijst nog geen goedgekeurde app of advertentielevering. Publiceer/test de app via de storeprocedure, koppel de openbare storevermelding in AdMob en controleer app-ads.txt-verificatie en de appbeoordeling. Een nieuwe storevermelding is mogelijk niet meteen vindbaar.

Officiële bronnen:

- https://support.google.com/publisherpolicies/answer/11112688
- https://support.google.com/admob/answer/10037806
- https://support.google.com/admob/answer/14538460

Dit werk verandert de webbroncode en bouwuitvoer. Er is geen nieuwe ondertekende AAB of iOS-build gemaakt.
