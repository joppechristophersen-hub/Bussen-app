# Websitecontrole voor een nieuwe AdSense-beoordeling

De afwijzing noemt Content van weinig waarde. De precieze pagina of doorslaggevende oorzaak is niet bekend. Deze wijzigingen verbeteren de uitleg en toegankelijkheid; ze garanderen geen goedkeuring.

## Wat is aangepast

- De homepage legt het starten en deelnemen concreet uit.
- Spelregels bevatten kaartvoorbeelden, tiebreak en de echte bus-/checkpointinstellingen. De oude onjuiste tekst over een gelijke buskaart is vervangen: de keuzes zijn Bus doorgeven en Iemand meenemen.
- /veelgestelde-vragen/ helpt bij kamercodes, verbinding, geluid en bediening.
- /over-busbende/ bevat productinformatie en een contactmogelijkheid via het bestaande info@busbende.nl.
- Zes openbare pagina's, inclusief de demo, worden tijdens de build als HTML geschreven. De tekst, links en koppen zijn beschikbaar zonder JavaScript. React hydrateert deze inhoud in de browser. Het spel heeft een afzonderlijke /spelen/index.html.
- Iedere inhoudspagina heeft een eigen titel, omschrijving en canonical. sitemap.xml bevat ook het bestaande privacybeleid; robots.txt verwijst naar de sitemap.
- Er zijn handmatige displayplaatsingen op Home, tussen de spelregelonderdelen en tussen FAQ-antwoorden. Daarnaast is Google's officiële gewone ankeradvertentie onderaan het scherm voorbereid op deze pagina's en tijdens een echt potje. De oude inline-spelbanner met de grote tussenruimte wordt niet meer gebruikt.
- De demo, privacy- en contactpagina starten geen Google-advertenties. Het spelmenu en de lobby starten geen anker; dat gebeurt pas wanneer het potje actief is. Na het sluiten/verlaten van de kamer gaat de browser naar een schoon /spelen/-document, zodat het anker niet in het menu blijft hangen. Er wordt niet aan Google's iframe of sluitknop gezeten.
- De accountverificatie blijft als meta-tag aanwezig. De ankerloader start op de toegestane inhoudspagina's bij het openen, of bij het beginnen van een potje. Handmatige displayunits worden pas in de buurt van het viewport aangevraagd. Native AdMob is niet gewijzigd.
- De shop en catalogusaanvragen zijn uit de interface verwijderd, inclusief de producten met Binnenkort beschikbaar. De gratis instellingen Automatisch/Licht/Donker gebruiken de bestaande weergavevoorkeur. Eerder opgeslagen productgegevens worden niet verwijderd.

## Controleren en publiceren

1. Voer npm run build, npm run test:public, npm run test:effects, npm run test:web-ads en npm run lint uit. Lint heeft drie al bestaande waarschuwingen.
2. Publiceer de volledige dist-map, inclusief de nieuwe paginamappen, sitemap.xml en robots.txt. Alleen index.html vervangen is onvoldoende. Geef echte bestanden voorrang op eventuele SPA-fallbackregels.
3. Open Home, Spelregels, Hulp, Over & contact en Privacy rechtstreeks op hun URL. Controleer ook een klein telefoonscherm en het starten/joinen van een spel. De geautomatiseerde browsercontrole kon in de uitvoeromgeving niet starten; mobiele visuele controle is daarom nog open.
4. Controleer of het contactadres werkt. Publiceer de juiste privacy-/toestemmingsberichten in het Google-dashboard. Configureer Auto-advertenties zoals hieronder beschreven; de verificatiemeta-tag is geen advertentieplaatsing.
5. Controleer via Search Console of de openbare URLs bereikbaar zijn en dien de sitemap in. Vraag pas daarna in AdSense een nieuwe beoordeling aan. Er is vanuit dit werk geen beoordelingsverzoek verstuurd.

## Advertentieconfiguratie (18 november 2026)

De handmatige inhoudsadvertenties gebruiken publisher ca-pub-4480846179004064 en display-unit 7878147054. Die unit heette eerder Advertentie einde potje; hij wordt nu buiten het eindscherm gebruikt. De officiële ankers gebruiken dezelfde publisher maar hebben geen eigen handmatig slot-ID nodig.

De ankerloader gebruikt de door Google beschreven parameter data-overlays="collapsed-bottom": een gewoon, niet uitklappend anker onderaan. Dit is een toegestane wijziging van de script-tag. Google beheert formaat, weergave, frequentie en sluitknop. Een bezoeker kan het anker sluiten; de app probeert het dan niet opnieuw te openen. De app vraagt geen nieuwe advertenties aan bij iedere beurt, animatie, resize of fasewissel. Er is geen garantie dat een anker bij elk bezoek verschijnt.

Voor het anker is onderaan ruimte gereserveerd. Geluid en Weergave krijgen tijdens het spel een aparte bovenbalk, zodat ze niet bovenop het anker liggen. Ook zonder advertentie blijft het spel gewoon werken.

In AdSense: Advertenties → busbende.nl bewerken → Auto-advertenties aan → Overlay-indelingen → Ankeradvertenties. Kies onderaan en zet dynamische/uitklapbare ankers uit voor de beoogde rustige weergave. Laat vignetten, zijrails, advertentie-intenties en automatische in-page banners uit als alleen de voorbereide ankers en handmatige inhoudsblokken gewenst zijn. Pas toe op de site. Het data-overlays-attribuut kan de ankerinstellingen overschrijven en kan ankers inschakelen ook als die afzonderlijke optie uit staat; om ankers helemaal te stoppen moet deze code dus ook worden uitgezet. Er zijn vanuit deze uitvoering geen accountinstellingen gewijzigd.

Lokale voorbeeldmodus: npm run dev, daarna http://localhost:5173/?previewAds=1 of http://localhost:5173/spelen/?previewAds=1. De sluitbare balk is duidelijk een voorbeeld, maakt geen Google-aanvragen en werkt niet op het echte domein. Hij demonstreert de gereserveerde ruimte, niet de exacte advertentie die Google later levert.

Google-advertenties laden alleen in browsers op busbende.nl en www.busbende.nl. Localhost en native Capacitor zijn uitgesloten. Mocks controleren domein-/platformuitsluiting, luie display-aanvragen, één loader, dubbele React-effects, geen herhaalde aanvragen, fouten/adblocker, ankerconfiguratie, pagina-uitsluiting en de lokale voorbeeldmodus. Echte Google-ankerweergave en telefoonindeling kunnen pas met beschikbare advertenties worden bevestigd; die zijn hier niet geverifieerd.

AdSense-goedkeuring is nog nodig. Zonder die goedkeuring en beschikbare advertentievraag levert deze code niet automatisch advertenties of inkomsten op. Controleer daarnaast in Google Privacy en berichten dat een geschikt toestemmingsbericht is gepubliceerd. De oude lokale BusBende-toestemmingsstatus is geen vervanging voor de Google-CMP.

Google adviseert voor display-advertenties op spelpagina's minimaal 150 pixels afstand tot het spel: https://support.google.com/adsense/answer/2768340 . Dit is een plaatsingsrichtlijn, geen garantie dat Google de site goedkeurt.

Officiële informatie over de gebruikte ankers en accountinstellingen:
- https://support.google.com/adsense/answer/15484692
- https://support.google.com/adsense/answer/7478225
- https://support.google.com/adsense/answer/9305577

## AdMob uit het aangeleverde scherm

Betalingsprofiel en het eerste advertentieblok staan als afgerond. De openstaande taak is koppelen aan een ondersteunde store. Dat scherm bewijst nog geen goedgekeurde app of advertentielevering. Publiceer/test de app via de storeprocedure, koppel de openbare storevermelding in AdMob en controleer app-ads.txt-verificatie en de appbeoordeling. Een nieuwe storevermelding is mogelijk niet meteen vindbaar.

Officiële bronnen:

- https://support.google.com/publisherpolicies/answer/11112688
- https://support.google.com/admob/answer/10037806
- https://support.google.com/admob/answer/14538460

Dit werk verandert de webbroncode en bouwuitvoer. Er is geen nieuwe ondertekende AAB of iOS-build gemaakt.
