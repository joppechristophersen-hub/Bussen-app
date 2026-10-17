import { normalizePublicPath } from "./publicPages";

function SiteHeader() {
  return (
    <header className="bb-site-header">
      <a className="bb-site-brand" href="/" aria-label="BusBende homepage">
        <img className="bb-site-brand-icon" src="/favicon.svg" alt="" width="40" height="40" />

        <span>
          <strong>BusBende</strong>
          <small>Het kaartspel voor je hele bende</small>
        </span>
      </a>

      <nav className="bb-site-nav" aria-label="Hoofdnavigatie">
        <a href="/">Home</a>
        <a href="/spelregels/">Spelregels</a>
        <a href="/veelgestelde-vragen/">Hulp</a>
        <a href="/over-busbende/">Over & contact</a>
        <a href="/verantwoord-spelen/">Verantwoord spelen</a>
        <a className="bb-site-nav-play" href="/spelen/">
          Spelen
        </a>
      </nav>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="bb-site-footer">
      <div>
        <strong>BusBende</strong>
        <p>
          Een digitaal kaartspel voor gezellige avonden met vrienden.
          Speel verstandig en pas de opdrachten altijd aan jullie eigen groep aan.
        </p>
      </div>

      <nav aria-label="Footer">
        <a href="/spelregels/">Spelregels</a>
        <a href="/verantwoord-spelen/">Verantwoord spelen</a>
        <a href="/privacy/">Privacy</a>
        <a href="/veelgestelde-vragen/">Veelgestelde vragen</a>
        <a href="/over-busbende/">Over & contact</a>
      </nav>

      <small>© {new Date().getFullYear()} BusBende</small>
    </footer>
  );
}

function HomePage() {
  return (
    <div className="bb-site">
      <SiteHeader />

      <main>
        <section className="bb-site-hero">
          <div className="bb-site-hero-copy">
            <span className="bb-site-kicker">DIGITAAL KAARTSPEL</span>

            <h1>
              Bussen, maar dan samen
              <span> op ieder scherm.</span>
            </h1>

            <p>
              BusBende maakt het bekende kaartspel Bussen digitaal.
              Eén speler start het potje, vrienden doen mee via een kamercode
              of QR-code en iedereen volgt het spel op zijn eigen telefoon.
            </p>

            <div className="bb-site-actions">
              <a className="bb-site-button primary" href="/spelen/">
                🚌 Start een potje
              </a>

              <a className="bb-site-button secondary" href="/spelregels/">
                Bekijk de spelregels
              </a>
            </div>

            <div className="bb-site-hero-points">
              <span>✓ Geen kaarten nodig</span>
              <span>✓ Samen op meerdere telefoons</span>
              <span>✓ Gratis te spelen</span>
            </div>
          </div>

          <div className="bb-site-hero-card" aria-hidden="true">
            <div className="bb-site-phone">
              <div className="bb-site-phone-top">
                <span>BUS</span>
                <span>BENDE</span>
              </div>

              <div className="bb-site-playing-card">
                <small>JOUW KAART</small>
                <strong>8</strong>
                <span>♣</span>
              </div>

              <div className="bb-site-phone-question">
                Hoger of lager?
              </div>

              <div className="bb-site-phone-buttons">
                <span>Hoger</span>
                <span>Lager</span>
              </div>
            </div>
          </div>
        </section>

        <section className="bb-site-section">
          <div className="bb-site-section-heading">
            <span>ZO WERKT HET</span>
            <h2>Van eerste kaart tot de bus</h2>
            <p>
              Een volledig potje bestaat uit drie delen. Iedereen speelt eerst
              zijn eigen kaarten, daarna volgt de boom en uiteindelijk belandt
              één speler in de bus.
            </p>
          </div>

          <div className="bb-site-step-grid">
            <article>
              <span className="bb-site-step-number">01</span>
              <div className="bb-site-step-icon">🃏</div>
              <h3>Vier kaarten</h3>
              <p>
                Raad achtereenvolgens kleur, hoger of lager, binnen of buiten
                en tot slot het figuur. Een foute keuze betekent één slok.
              </p>
            </article>

            <article>
              <span className="bb-site-step-number">02</span>
              <div className="bb-site-step-icon">🌲</div>
              <h3>De boom</h3>
              <p>
                Kaarten worden rij voor rij omgedraaid. Heb je dezelfde waarde
                in je hand, dan kun je die kaart wegspelen en slokken uitdelen.
              </p>
            </article>

            <article>
              <span className="bb-site-step-number">03</span>
              <div className="bb-site-step-icon">🚌</div>
              <h3>De bus</h3>
              <p>
                De speler met de meeste kaarten over gaat de bus in en probeert
                zich met hoger-of-lager-keuzes door de rit heen te spelen.
              </p>
            </article>
          </div>
        </section>

        <section className="bb-site-section bb-site-feature-section">
          <div className="bb-site-feature-copy">
            <span className="bb-site-kicker">SAMEN SPELEN</span>
            <h2>Eén kamer, meerdere telefoons</h2>
            <p>
              De host maakt een kamer aan en deelt de vijfletterige kamercode
              of QR-code. Andere spelers hoeven vervolgens alleen hun naam in
              te vullen om mee te doen.
            </p>

            <p>
              Tijdens het spel ziet iedere speler dezelfde voortgang, terwijl
              persoonlijke acties op het juiste toestel verschijnen. Zo blijft
              het tempo erin zonder dat één persoon steeds alle kaarten hoeft
              bij te houden.
            </p>

            <a className="bb-site-text-link" href="/spelregels/">
              Lees precies hoe iedere ronde werkt →
            </a>
          </div>

          <div className="bb-site-room-card">
            <small>VOORBEELDKAMER</small>
            <small>KAMERCODE</small>
            <strong>B U S J E</strong>

            <div className="bb-site-players">
              <span>J</span>
              <span>D</span>
              <span>K</span>
              <span>+</span>
            </div>

            <p>3 spelers klaar om te beginnen</p>
          </div>
        </section>

        <section className="bb-site-section">
          <div className="bb-site-section-heading">
            <span>WAAROM BUSBENDE?</span>
            <h2>Geen stapel kaarten, geen discussies over de regels</h2>
          </div>

          <div className="bb-site-benefit-grid">
            <article>
              <span>⚡</span>
              <h3>Snel beginnen</h3>
              <p>
                Maak een kamer, laat je vrienden aansluiten en begin direct.
                Schudden, delen en scores bijhouden doet het spel voor je.
              </p>
            </article>

            <article>
              <span>📱</span>
              <h3>Iedereen doet mee</h3>
              <p>
                Iedere speler gebruikt zijn eigen telefoon. Daardoor ziet
                iedereen zelf wanneer hij of zij aan de beurt is.
              </p>
            </article>

            <article>
              <span>🎨</span>
              <h3>Je eigen sfeer</h3>
              <p>
                Licht en donker blijven gratis onderdeel van BusBende.
                Extra thema's en cosmetische stijlen kunnen later worden toegevoegd.
              </p>
            </article>

            <article>
              <span>🥤</span>
              <h3>Ook zonder alcohol</h3>
              <p>
                BusBende werkt net zo goed met water, fris of punten.
                De spelmechaniek draait om de kaarten en de groep, niet om alcohol.
              </p>
            </article>
          </div>
        </section>

        <section className="bb-site-section">
          <div className="bb-site-section-heading">
            <span>VOOR JE BEGINT</span>
            <h2>Een eerste potje, stap voor stap</h2>
          </div>
          <ol className="bb-site-start-list">
            <li><strong>Kies een host.</strong> Die opent Spelen, kiest Nieuw spel en vult een naam in. De host stelt de regels voor de kamer in.</li>
            <li><strong>Sluit aan op je eigen telefoon.</strong> Kies Meedoen met spel en vul de kamercode en je naam in, of scan de QR-code van de host. Iedereen heeft internet nodig.</li>
            <li><strong>Controleer de lobby.</strong> Wacht tot alle namen zichtbaar zijn voordat de host begint. Houd de host verbonden: als die de verbinding verbreekt, sluit de kamer.</li>
            <li><strong>Spreek samen de opdrachten af.</strong> De app noemt aantallen slokken; jullie kunnen daar punten van maken. Dat is een afspraak binnen de groep, geen aparte appmodus.</li>
          </ol>
          <p>Een eigen account aanmaken is niet nodig. De kamercode hoort bij het huidige potje en is geen wachtwoord: deel hem alleen met mensen die mogen meedoen.</p>
          <a className="bb-site-text-link" href="/veelgestelde-vragen/">Problemen met meedoen of geluid? Bekijk de hulp →</a>
        </section>

        <section className="bb-site-responsible">
          <div>
            <span className="bb-site-kicker">VERANTWOORD SPELEN</span>
            <h2>Jullie bepalen wat een “slok” betekent.</h2>
          </div>

          <p>
            BusBende schrijft geen hoeveelheid alcohol voor. Spreek vooraf af
            wat bij jullie groep past, gebruik gerust alcoholvrije drankjes en
            stop wanneer iemand zich niet prettig voelt. Rijd nooit na het drinken.
          </p>
        </section>

        <section className="bb-site-cta">
          <span>🚌</span>
          <div>
            <h2>Klaar voor de rit?</h2>
            <p>Start een kamer en nodig je BusBende uit.</p>
          </div>

          <a className="bb-site-button primary" href="/spelen/">
            Start BusBende
          </a>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function RulesPage() {
  return (
    <div className="bb-site">
      <SiteHeader />

      <main className="bb-rules">
        <section className="bb-rules-hero">
          <span className="bb-site-kicker">SPELREGELS</span>
          <h1>Zo speel je BusBende</h1>
          <p>
            Een potje bestaat uit drie delen: vier persoonlijke kaarten,
            de boom en de bus. Hieronder vind je de basisregels die in BusBende
            worden gebruikt.
          </p>

          <div className="bb-site-actions">
            <a className="bb-site-button primary" href="/spelen/">
              Start een potje
            </a>
            <a className="bb-site-button secondary" href="#vier-kaarten">
              Naar de regels
            </a>
          </div>
        </section>

        <nav className="bb-guide-index" aria-label="Op deze pagina">
          <a href="#vier-kaarten">Vier kaarten</a><a href="#boom">De boom</a>
          <a href="#bus">De bus</a><a href="#voorbeelden">Kaartvoorbeelden</a>
          <a href="#instellingen">Instellingen</a>
        </nav>
        <section id="vier-kaarten" className="bb-rule-section">
          <div className="bb-rule-section-number">1</div>

          <div className="bb-rule-section-content">
            <span>DE VOORRONDE</span>
            <h2>Iedere speler verzamelt vier kaarten</h2>
            <p>
              De spelers komen om de beurt aan bod. Bij iedere kaart moet eerst
              een voorspelling worden gedaan. Goed geraden betekent niets doen;
              fout geraden betekent één slok.
            </p>

            <div className="bb-rule-card-grid">
              <article>
                <small>KAART 1</small>
                <strong>Rood of zwart</strong>
                <p>
                  Voorspel vóór het trekken of de kaart rood of zwart is.
                </p>
              </article>

              <article>
                <small>KAART 2</small>
                <strong>Hoger of lager</strong>
                <p>
                  Raad of de tweede kaart hoger of lager is dan je eerste kaart.
                  Een gelijke waarde telt als fout.
                </p>
              </article>

              <article>
                <small>KAART 3</small>
                <strong>Binnen of buiten</strong>
                <p>
                  Raad of de waarde tussen je eerste twee kaarten ligt of
                  juist erbuiten. Gelijkheid aan een grens telt als fout.
                </p>
              </article>

              <article>
                <small>KAART 4</small>
                <strong>Figuur</strong>
                <p>
                  Kies harten, ruiten, klaveren of schoppen. Je kunt daarnaast
                  voor Disco kiezen.
                </p>
              </article>
            </div>

            <div className="bb-rule-highlight">
              <span>🪩</span>
              <div>
                <h3>Disco</h3>
                <p>
                  Disco is goed wanneer je na de vierde kaart alle vier de
                  figuren één keer in je hand hebt: harten, ruiten, klaveren
                  en schoppen. Bij een geslaagde Disco drinkt iedereen behalve
                  de speler die Disco heeft.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="boom" className="bb-rule-section">
          <div className="bb-rule-section-number">2</div>

          <div className="bb-rule-section-content">
            <span>DE BOOM</span>
            <h2>Speel je kaarten weg</h2>
            <p>
              Na de vier persoonlijke kaarten begint de boom. Standaard gebruikt
              BusBende vier rijen. De eerste rij bevat één kaart, de tweede twee,
              de derde drie en de vierde vier.
            </p>

            <div className="bb-tree-example" aria-label="Voorbeeld van de boom">
              <div><span>🂠</span></div>
              <div><span>🂠</span><span>🂠</span></div>
              <div><span>🂠</span><span>🂠</span><span>🂠</span></div>
              <div><span>🂠</span><span>🂠</span><span>🂠</span><span>🂠</span></div>
            </div>

            <div className="bb-rule-list">
              <article>
                <strong>Kaart voor kaart</strong>
                <p>
                  De kaarten in de boom worden in volgorde omgedraaid.
                </p>
              </article>

              <article>
                <strong>Dezelfde waarde?</strong>
                <p>
                  Heb je een kaart met dezelfde waarde als de open kaart,
                  dan mag je die uit je hand wegspelen.
                </p>
              </article>

              <article>
                <strong>Slokken uitdelen</strong>
                <p>
                  Het aantal slokken is gekoppeld aan de rij. In rij één is dat
                  één, in rij twee twee, enzovoort. Een ingestelde dubbele kaart
                  kan dit aantal verdubbelen.
                </p>
              </article>

              <article>
                <strong>Verdelen mag</strong>
                <p>
                  Wanneer je meerdere slokken mag uitdelen, kunnen die over
                  verschillende spelers worden verdeeld.
                </p>
              </article>
            </div>

            <p className="bb-rule-note">
              Aan het einde van de boom gaat de speler met de meeste kaarten
              over naar de bus. Bij een gelijke stand bepaalt de ingebouwde
              tiebreak wie de bus in gaat.
            </p>
          </div>
        </section>

        <section id="bus" className="bb-rule-section">
          <div className="bb-rule-section-number">3</div>

          <div className="bb-rule-section-content">
            <span>DE BUS</span>
            <h2>Hoger of lager tot je de rit uit bent</h2>
            <p>
              De aangewezen speler is de buschauffeur. Alleen die speler bedient
              de keuzes op zijn of haar toestel.
            </p>

            <div className="bb-rule-list">
              <article>
                <strong>Begin met een kaart</strong>
                <p>
                  Vanuit de huidige kaart kiest de buschauffeur of de volgende
                  kaart hoger of lager wordt.
                </p>
              </article>

              <article>
                <strong>Goed geraden</strong>
                <p>
                  De speler gaat verder naar de volgende kaart of het volgende
                  deel van de bus.
                </p>
              </article>

              <article>
                <strong>Fout geraden</strong>
                <p>
                  De busregel voor een fout wordt uitgevoerd en de rit gaat
                  volgens de gekozen spelinstellingen verder.
                </p>
              </article>

              <article>
                <strong>Gelijke kaart</strong>
                <p>
                  De groep kiest vooraf de dubbelregel: Bus doorgeven of Iemand meenemen.
                  Controleer de ingestelde regel in jullie kamer; gelijk is hier
                  dus niet altijd hetzelfde als een gewone foute voorspelling.
                </p>
              </article>
            </div>

            <div className="bb-rule-highlight bus">
              <span>🚌</span>
              <div>
                <h3>Einde van de rit</h3>
                <p>
                  Wanneer de buschauffeur het volledige traject heeft gehaald,
                  is het potje voorbij en kan de groep een nieuwe ronde starten.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="voorbeelden" className="bb-rule-section">
          <div className="bb-rule-section-number">4</div>
          <div className="bb-rule-section-content">
            <span>KAARTEN OP TAFEL</span>
            <h2>Wat gebeurt er bij deze kaarten?</h2>
            <p>Hieronder staan voorbeeldsituaties uit de vier gokstappen en de boom. De kaartwaarde bepaalt de vergelijking; het figuur bepaalt of een kaart harten, ruiten, klaveren of schoppen is.</p>
            <div className="bb-rule-card-grid">
              <article><small>HOGER OF LAGER</small><strong>Je eerste kaart is een 8</strong>
                <p>Je kiest Hoger. Een 10 is goed; een 5 is fout. Nog een 8 is ook fout in deze voorronde, omdat de tweede kaart echt hoger of lager moet zijn.</p></article>
              <article><small>BINNEN OF BUITEN</small><strong>Je hebt een 4 en een 10</strong>
                <p>Een 7 ligt binnen. Een 2 ligt buiten. Een 4 of 10 ligt precies op de grens en is bij beide keuzes fout. De volgorde van je eerste twee kaarten verandert dit niet.</p></article>
              <article><small>DISCO</small><strong>Harten, klaveren en ruiten</strong>
                <p>Je hebt al drie verschillende figuren en kiest Disco voor kaart vier. Schoppen maakt de set compleet: vier verschillende figuren. Nog een hartenkaart maakt geen Disco.</p></article>
              <article><small>DE BOOM</small><strong>Een 9 gaat open in rij drie</strong>
                <p>Heb je een 9 in je hand, dan kun je die wegspelen. De drie uit te delen slokken kun je bijvoorbeeld als twee en één verdelen. Is deze boomkaart een 2×-kaart, dan zijn het zes slokken.</p></article>
            </div>
            <p className="bb-rule-note">Voorbeeld van een gelijkstand: Sam en Noor houden ieder twee kaarten over. Beiden trekken zelf een kaart. Sam trekt een 5 en Noor een vrouw: de laagste kaart verliest, dus Sam wordt chauffeur. Bij opnieuw gelijke waarden volgt een nieuwe trekking voor de betrokken spelers.</p>
          </div>
        </section>

        <section id="instellingen" className="bb-rule-section compact">
          <div className="bb-rule-section-number">+</div>

          <div className="bb-rule-section-content">
            <span>INSTELLINGEN</span>
            <h2>Maak het potje van jullie</h2>
            <p>
              De host kan voor het starten verschillende onderdelen van het
              potje aanpassen, waaronder het aantal boomrijen, kaartdecks,
              checkpoints en aanvullende boom- of busregels. De ingestelde
              opties in de kamer zijn leidend voor dat potje.
            </p>
            <div className="bb-rule-list">
              <article><strong>Dubbele kaarten in de bus</strong><p>Bij Bus doorgeven kiest de chauffeur een andere speler die de bus overneemt. Bij Iemand meenemen komt er een speler bij in de bus. Als iedereen al meerijdt, kan er niemand meer bij en volgt de afhandeling voor een foute kaart.</p></article>
              <article><strong>Checkpoints als tussenpunt</strong><p>Met checkpoints bepaal je waar de rit na een fout verdergaat. De chauffeur kiest de checkpointkaarten tijdens het klaarzetten van de bus.</p></article>
              <article><strong>Een tweede kans of direct terug</strong><p>Bij Tweede kans krijgt de chauffeur op de checkpointkaart één herkansing; opnieuw fout betekent terug naar kaart één. Met Direct terug gebeurt dat al bij de eerste fout op het checkpoint.</p></article>
              <article><strong>Direct veilig</strong><p>In deze checkpointvariant is het bereiken van een checkpoint genoeg: dat wordt meteen het nieuwe beginpunt voor een volgende poging.</p></article>
            </div>
            <p>De chauffeur trekt eerst de buslengte en het aantal open kaarten. Gebruikte kaarten gaan naar de aflegstapel; pas als de trekstapel leeg is, worden afgelegde kaarten opnieuw geschud. Daardoor kunnen kaarten later terugkomen.</p>
          </div>
        </section>

        <section className="bb-site-responsible bb-rules-responsible">
          <div>
            <span className="bb-site-kicker">GOED OM TE WETEN</span>
            <h2>Een slok hoeft geen alcohol te zijn.</h2>
          </div>

          <p>
            Speel met water, fris, alcoholvrij of punten als dat beter bij jullie
            past. Drink geen alcohol onder de wettelijke leeftijd, respecteer
            altijd iemands grens en stap niet achter het stuur na het drinken.
          </p>
        </section>

        <section className="bb-site-cta">
          <span>🃏</span>
          <div>
            <h2>Regels duidelijk?</h2>
            <p>Dan is het tijd om de eerste kaart te trekken.</p>
          </div>

          <a className="bb-site-button primary" href="/spelen/">
            Start BusBende
          </a>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function ResponsiblePlayPage() {
  return (
    <div className="bb-site">
      <SiteHeader />
      <main className="bb-rules">
        <section className="bb-rules-hero">
          <span className="bb-site-kicker">VERANTWOORD SPELEN</span>
          <h1>Samen spelen, met respect voor ieders grens.</h1>
          <p>BusBende is een kaartspel. Alcohol is nooit nodig om mee te doen.
            Kies gerust voor punten of sla een opdracht over: de gezelligheid staat voorop.</p>
        </section>
        <section className="bb-rule-section">
          <div className="bb-rule-section-number">1</div>
          <div className="bb-rule-section-content">
            <span>MAAK SAMEN AFSPRAKEN</span>
            <h2>Iedereen mag nee zeggen</h2>
            <p>Spreek vooraf af hoe jullie spelen. Een “slok” in het spel is geen
              verplichting om te drinken en schrijft geen hoeveelheid alcohol voor.
              Vervang drinkopdrachten door punten of andere vrijwillige opdrachten.
              Ook alcoholvrije drank hoef je niet op tempo of in grote hoeveelheden te drinken.</p>
            <p>Laat niemand drinken om bij de groep te horen. Iedere speler mag een
              opdracht weigeren, pauzeren of stoppen, zonder uitleg en zonder straf.
              Respecteer dat ook wanneer de spelregels iets anders suggereren.</p>
          </div>
        </section>
        <section className="bb-rule-section">
          <div className="bb-rule-section-number">2</div>
          <div className="bb-rule-section-content">
            <span>ALCOHOL EN VEILIGHEID</span>
            <h2>Het spel bepaalt niet wat je drinkt</h2>
            <p>De veiligste keuze is spelen zonder alcohol. Gebruik het spel niet
              als reden om meer of sneller te drinken. Stop als iemand zich niet prettig voelt.</p>
            <p>Drink geen alcohol onder de lokaal geldende wettelijke leeftijd en
              houd rekening met de regels voor het kopen, verstrekken en gebruiken van alcohol.
              Rijd niet na alcoholgebruik en regel vooraf veilig vervoer.</p>
            <p>BusBende geeft geen persoonlijk medisch advies. Bij twijfel over alcohol
              in combinatie met je gezondheid of medicijnen kun je een arts of apotheker raadplegen.
              Bij direct gevaar: stop het spel en bel de lokale hulpdiensten.</p>
          </div>
        </section>
        <section className="bb-rule-section">
          <div className="bb-rule-section-number">3</div>
          <div className="bb-rule-section-content">
            <span>EIGEN KEUZES EN VERANTWOORDELIJKHEID</span>
            <h2>Een zorgvuldige disclaimer</h2>
            <p>BusBende biedt digitale spelregels en spelondersteuning. Spelers beslissen
              zelf of en hoe zij deelnemen, welke opdrachten zij uitvoeren en of zij alcohol
              gebruiken. Iedere speler is verantwoordelijk voor die eigen keuzes en voor
              naleving van de wetgeving die op de eigen locatie geldt. De host en de groep
              horen de grenzen van andere deelnemers te respecteren.</p>
            <p>Spelopdrachten zijn geen advies of aansporing om alcohol te gebruiken,
              grenzen te overschrijden of de wet te overtreden. De aanbieder kan keuzes
              van deelnemers buiten de app niet controleren.</p>
            <p>Deze informatie sluit niet alle aansprakelijkheid van de aanbieder uit.
              Wettelijke rechten van gebruikers en verplichtingen van de aanbieder blijven
              gelden. Of er in een concreet geval aansprakelijkheid bestaat, hangt af van
              het toepasselijke recht en de omstandigheden.</p>
            <p>Een vraag of onveilige situatie melden? Neem contact op via
              {" "}<a className="bb-site-text-link" href="mailto:info@busbende.nl">info@busbende.nl</a>.</p>
          </div>
        </section>
        <section className="bb-site-responsible bb-rules-responsible">
          <div><span className="bb-site-kicker">JULLIE SPEL</span><h2>Punten tellen ook.</h2></div>
          <p>De kaarten en het samenspelen maken BusBende leuk. Maak er een avond van
            waar iedereen zich prettig bij voelt, met of zonder drankje.</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function HelpPage() {
  return <div className="bb-site"><SiteHeader /><main className="bb-rules">
    <section className="bb-rules-hero"><span className="bb-site-kicker">HULP BIJ HET SPELEN</span>
      <h1>Van kamercode tot eerste kaart.</h1>
      <p>Deze antwoorden gaan over de digitale versie van Bussen in BusBende. Kom je vast te zitten? Controleer eerst of je internet hebt en of de host nog in dezelfde kamer zit.</p>
    </section>
    <section className="bb-help-list" aria-label="Veelgestelde vragen">
      <article><h2>Hoe start ik samen een potje?</h2><p>Eén speler kiest Nieuw spel, vult een naam in en stelt de kamer in. De anderen kiezen Meedoen met spel en voeren hun naam en de kamercode in. Je kunt ook de QR-code van de host scannen. Wacht tot alle spelers in de lobby staan voordat de host het spel start.</p></article>
      <article><h2>Werkt BusBende zonder account of installatie?</h2><p>In de webversie hoef je geen account aan te maken of app te installeren. Open de website op je telefoon. Iedere speler gebruikt een eigen toestel en heeft een internetverbinding nodig; jullie hoeven niet op hetzelfde wifi-netwerk te zitten.</p></article>
      <article><h2>Waarom wordt mijn kamercode niet gevonden?</h2><p>Controleer de code op het scherm van de host en neem die over zonder extra spaties. Een code van een eerder gesloten kamer werkt niet opnieuw. Als de host de verbinding heeft verbroken, sluit de kamer. Laat de host zo nodig een nieuw potje maken en deel de nieuwe code.</p></article>
      <article><h2>Wat gebeurt er bij verversen of netwerkverlies?</h2><p>De kamer gebruikt de actieve verbindingen om spelers te herkennen. Ga er niet van uit dat een verversing je plek bewaart. Houd het tabblad open en de host verbonden. Komt de groep niet verder na netwerkverlies, maak dan een nieuwe kamer; een gesloten potje kan niet uit een opgeslagen account worden hersteld.</p></article>
      <article><h2>Waarom hoor ik geen muziek of klikgeluid?</h2><p>Telefoonbrowsers kunnen geluid blokkeren tot je het scherm aanraakt. Tik eerst op een knop, controleer de geluidsinstelling in BusBende en het mediavolume van je toestel. De menumuziek hoort te stoppen wanneer het spel begint. Effecten volgen de spelacties; verschillen in verbinding en geluidsuitvoer kunnen hoorbaar zijn.</p></article>
      <article><h2>Waarom kan ik niet op een kaart of keuze drukken?</h2><p>Controleer wie aan de beurt is. Alleen de actieve speler kan de betreffende keuze maken. Tijdens een kaartresultaat of slokkenverdeling wacht de app even zodat iedereen de uitkomst kan lezen. De host bedient de gezamenlijke start; in de bus kiest de actieve chauffeur.</p></article>
      <article><h2>Waarom is een gelijke kaart soms anders?</h2><p>Bij Hoger of lager in de vierkaartvoorronde is gelijk fout. Ook een kaart op de grens bij Binnen of buiten is fout. In de bus geldt de gekozen dubbelregel: Bus doorgeven of Iemand meenemen. Bekijk de <a className="bb-site-text-link" href="/spelregels/#instellingen">instellingen in de speluitleg</a> voordat jullie beginnen.</p></article>
      <article><h2>Moet je alcohol gebruiken?</h2><p>Nee. Je kunt de aantallen in de app als punten behandelen of alcoholvrij spelen. Er is geen aparte puntenknop: spreek als groep af wat de opdrachten betekenen. Je mag altijd een opdracht overslaan of stoppen. Lees ook <a className="bb-site-text-link" href="/verantwoord-spelen/">Verantwoord spelen</a>.</p></article>
      <article><h2>Wat kost het en kan ik iets kopen?</h2><p>Het basisspel is gratis te spelen. In de shop staan extra’s met Binnenkort beschikbaar; die kun je nu niet kopen. De website en native app kunnen verschillende advertentievoorzieningen gebruiken. Advertentiebeschikbaarheid hangt onder meer af van de provider en toestemmingsinstellingen.</p></article>
      <article><h2>Hoe meld ik een fout?</h2><p>Mail <a className="bb-site-text-link" href="mailto:info@busbende.nl">info@busbende.nl</a> met je toestel, browser, de spelfase en de stappen waardoor het misgaat. Een screenshot helpt. Laat namen van andere spelers en andere persoonlijke gegevens waar mogelijk weg. Deel nooit wachtwoorden of betalingsgegevens.</p></article>
    </section>
    <section className="bb-site-cta"><span aria-hidden="true">🚌</span><div><h2>Klaar om mee te doen?</h2><p>Open het spel en kies een nieuwe kamer of Meedoen met spel.</p></div><a className="bb-site-button primary" href="/spelen/">Naar het spel</a></section>
  </main><SiteFooter /></div>;
}

function AboutPage() {
  return <div className="bb-site"><SiteHeader /><main className="bb-rules">
    <section className="bb-rules-hero"><span className="bb-site-kicker">OVER BUSBENDE</span><h1>Het kaartspel, op jullie eigen telefoons.</h1>
      <p>BusBende is een digitale uitvoering van Bussen voor een groep vrienden. De app deelt de kaarten, bewaakt de beurt en laat iedereen dezelfde spelvoortgang volgen.</p></section>
    <section className="bb-rule-section"><div className="bb-rule-section-number">1</div><div className="bb-rule-section-content"><h2>Wat maakt dit BusBende?</h2>
      <p>Een potje heeft drie delen: vier persoonlijke voorspellingen, kaarten wegspelen in de boom en de afsluitende busrit. Je speelt met een kamercode en persoonlijke acties op je eigen toestel. De host kiest vooraf onder meer de boomregels en checkpoints.</p>
      <p>Bij Bussen verschillen de huisregels per groep. Daarom leggen we op deze site de regels van deze app uit, inclusief gelijke kaarten en instellingen. Die uitleg gaat over BusBende en is geen algemene standaard voor iedere versie van Bussen.</p>
      <a className="bb-site-text-link" href="/spelregels/#voorbeelden">Bekijk concrete kaartvoorbeelden →</a></div></section>
    <section className="bb-rule-section"><div className="bb-rule-section-number">2</div><div className="bb-rule-section-content"><h2>Spelen zonder verplichtingen</h2>
      <p>Het basisspel is gratis en vraagt geen spelersaccount. Extra’s in de shop met Binnenkort beschikbaar zijn nog niet te koop. Een spelopdracht is geen verplichting om te drinken: jullie kunnen aantallen als punten behandelen en altijd een opdracht overslaan.</p>
      <p>De app is afhankelijk van een internetverbinding. Een kamer is geen permanente opslag van jullie potje. Houd vooral de host verbonden; bij het sluiten van die verbinding sluit de kamer.</p></div></section>
    <section id="contact" className="bb-rule-section"><div className="bb-rule-section-number">3</div><div className="bb-rule-section-content"><h2>Vragen, fouten of ideeën?</h2>
      <p>Neem contact op via <a className="bb-site-text-link" href="mailto:info@busbende.nl">info@busbende.nl</a>. Vermeld bij een fout je toestel en browser, welke stap je deed en wat je verwachtte. Voeg eventueel een screenshot toe zonder gevoelige gegevens.</p>
      <p>Voor uitleg over gegevens en je privacy kun je het <a className="bb-site-text-link" href="/privacy/">privacybeleid</a> bekijken. Voor problemen met een kamer of geluid staat er praktische hulp bij de <a className="bb-site-text-link" href="/veelgestelde-vragen/">veelgestelde vragen</a>.</p></div></section>
  </main><SiteFooter /></div>;
}

export function PublicPage({ path }: { path: string }) {
  switch (normalizePublicPath(path)) {
    case "/": return <HomePage />;
    case "/spelregels": return <RulesPage />;
    case "/verantwoord-spelen": return <ResponsiblePlayPage />;
    case "/veelgestelde-vragen": return <HelpPage />;
    case "/over-busbende": return <AboutPage />;
    default: return null;
  }
}
