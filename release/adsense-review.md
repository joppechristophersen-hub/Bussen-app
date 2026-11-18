# Websitecontrole voor een nieuwe AdSense-beoordeling

De afwijzing noemt Content van weinig waarde. De precieze pagina of doorslaggevende oorzaak is niet bekend. Deze wijzigingen verbeteren de uitleg en toegankelijkheid; ze garanderen geen goedkeuring.

## Wat is aangepast

- De homepage legt het starten en deelnemen concreet uit.
- Spelregels bevatten kaartvoorbeelden, tiebreak en de echte bus-/checkpointinstellingen. De oude onjuiste tekst over een gelijke buskaart is vervangen: de keuzes zijn Bus doorgeven en Iemand meenemen.
- /veelgestelde-vragen/ helpt bij kamercodes, verbinding, geluid en bediening.
- /over-busbende/ bevat productinformatie en een contactmogelijkheid via het bestaande info@busbende.nl.
- Vijf openbare pagina's worden tijdens de build als HTML geschreven. De tekst, links en koppen zijn beschikbaar zonder JavaScript. React hydrateert deze inhoud in de browser. Het spel heeft een afzonderlijke /spelen/index.html.
- Iedere inhoudspagina heeft een eigen titel, omschrijving en canonical. sitemap.xml bevat ook het bestaande privacybeleid; robots.txt verwijst naar de sitemap.
- Er zijn nu echte displayplaatsingen: één op Home, één tussen de spelregelonderdelen en één tussen FAQ-antwoorden. Tijdens een echt potje staat een banner onder het speelvlak, met minstens 160 pixels afstand tot de bediening. Hij staat in de normale paginastroom en kan dus onder de vouw staan; het is geen vaste overlay. De demo, privacy-, contact- en eindpagina krijgen geen display-advertentie.
- De accountverificatie blijft als meta-tag aanwezig. Het AdSense-script laadt pas als een plaatsing in de buurt van het viewport komt. De oude eindschermimplementatie en VITE_WEB_ENDGAME_ADS-schakelaar zijn verwijderd. Native AdMob is niet uitgezet.
- De shop en catalogusaanvragen zijn uit de interface verwijderd, inclusief de producten met Binnenkort beschikbaar. De gratis instellingen Automatisch/Licht/Donker gebruiken de bestaande weergavevoorkeur. Eerder opgeslagen productgegevens worden niet verwijderd.

## Controleren en publiceren

1. Voer npm run build, npm run test:public, npm run test:effects, npm run test:web-ads en npm run lint uit. Lint heeft drie al bestaande waarschuwingen.
2. Publiceer de volledige dist-map, inclusief de nieuwe paginamappen, sitemap.xml en robots.txt. Alleen index.html vervangen is onvoldoende. Geef echte bestanden voorrang op eventuele SPA-fallbackregels.
3. Open Home, Spelregels, Hulp, Over & contact en Privacy rechtstreeks op hun URL. Controleer ook een klein telefoonscherm en het starten/joinen van een spel. De geautomatiseerde browsercontrole kon in de uitvoeromgeving niet starten; mobiele visuele controle is daarom nog open.
4. Controleer of het contactadres werkt. Publiceer de juiste privacy-/toestemmingsberichten in het Google-dashboard. Laat automatische advertenties uit als er geen afzonderlijk beoordeelde plaatsingen zijn; de verificatiemeta-tag schakelt ze niet aan.
5. Controleer via Search Console of de openbare URLs bereikbaar zijn en dien de sitemap in. Vraag pas daarna in AdSense een nieuwe beoordeling aan. Er is vanuit dit werk geen beoordelingsverzoek verstuurd.

## Advertentieconfiguratie (18 november 2026)

Alle webplaatsingen gebruiken de aangeleverde publisher ca-pub-4480846179004064 en bestaande display-unit 7878147054. Die unit heette eerder Advertentie einde potje; hij wordt nu buiten het eindscherm gebruikt. De unit kan in AdSense een duidelijkere naam krijgen. Voor afzonderlijke rapportage per plaatsing kun je later aparte units aanmaken; dat is niet nodig om deze code te laten werken.

De spelbanner is 300×50 op telefoons en 728×90 vanaf 900 pixels schermbreedte. Een aanvraag wordt overgeslagen als de container te smal is. Er is geen automatische verversing bij een beurt, animatie, resize of fasewissel. Een nieuwe aanvraag ontstaat pas bij een nieuw gemonteerde plaatsing, bijvoorbeeld een nieuw door de gebruiker gestart potje. Unfilled en scriptfouten worden verborgen; het spel wacht nooit op de advertentie.

De code draait alleen in browsers op busbende.nl en www.busbende.nl. Localhost, previews en native Capacitor zijn uitgesloten. De mocks testen die uitsluiting, luie aanvragen, één loader, dubbele React-effects, geen verversing, geen advertentie/adblocker, fasezichtbaarheid en het verwijderen van de shop. De volledige browsercontrole kon hier niet starten: Edge sluit in de uitvoeromgeving direct af. Controleer de indeling daarom op echte telefoons vóór een volgende beoordelingsaanvraag.

AdSense-goedkeuring is nog nodig. Zonder die goedkeuring en beschikbare advertentievraag levert deze code niet automatisch advertenties of inkomsten op. Controleer daarnaast in Google Privacy en berichten dat een geschikt toestemmingsbericht is gepubliceerd. De oude lokale BusBende-toestemmingsstatus is geen vervanging voor de Google-CMP. Laat automatische advertenties uit als alleen de handmatige plaatsingen gewenst zijn.

Google adviseert voor display-advertenties op spelpagina's minimaal 150 pixels afstand tot het spel: https://support.google.com/adsense/answer/2768340 . Dit is een plaatsingsrichtlijn, geen garantie dat Google de site goedkeurt.

## AdMob uit het aangeleverde scherm

Betalingsprofiel en het eerste advertentieblok staan als afgerond. De openstaande taak is koppelen aan een ondersteunde store. Dat scherm bewijst nog geen goedgekeurde app of advertentielevering. Publiceer/test de app via de storeprocedure, koppel de openbare storevermelding in AdMob en controleer app-ads.txt-verificatie en de appbeoordeling. Een nieuwe storevermelding is mogelijk niet meteen vindbaar.

Officiële bronnen:

- https://support.google.com/publisherpolicies/answer/11112688
- https://support.google.com/admob/answer/10037806
- https://support.google.com/admob/answer/14538460

Dit werk verandert de webbroncode en bouwuitvoer. Er is geen nieuwe ondertekende AAB of iOS-build gemaakt.
