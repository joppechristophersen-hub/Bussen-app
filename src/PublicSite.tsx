import type { ReactNode } from "react";
import { Capacitor } from "@capacitor/core";


type PublicSiteProps = {
  children: ReactNode;
};

function normalizePath(pathname: string) {
  if (!pathname) {
    return "/";
  }

  const cleaned = pathname.replace(/\/+$/, "");

  return cleaned || "/";
}

function SiteHeader() {
  return (
    <header className="bb-site-header">
      <a className="bb-site-brand" href="/" aria-label="BusBende homepage">
        <span className="bb-site-brand-icon">🚌</span>

        <span>
          <strong>BusBende</strong>
          <small>Het kaartspel voor je hele bende</small>
        </span>
      </a>

      <nav className="bb-site-nav" aria-label="Hoofdnavigatie">
        <a href="/">Home</a>
        <a href="/spelregels/">Spelregels</a>
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
        <a href="/privacy/">Privacy</a>
        <a href="mailto:info@busbende.nl">Contact</a>
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
            <small>KAMERCODE</small>
            <strong>B U S 3 7</strong>

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

        <section className="bb-rule-section">
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

        <section className="bb-rule-section">
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
                  Een gelijke waarde telt als fout en telt dubbel volgens de
                  BusBende-regels.
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

        <section className="bb-rule-section compact">
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

function PublicSite({ children }: PublicSiteProps) {
  /*
   * De native Capacitor-app blijft exact de bestaande game openen.
   * Alleen de browser krijgt de publieke contentpagina's.
   */
  if (Capacitor.isNativePlatform()) {
    return <>{children}</>;
  }

  const path = normalizePath(window.location.pathname);

  if (path === "/") {
    return <HomePage />;
  }

  if (path === "/spelregels") {
    return <RulesPage />;
  }

  /*
   * Alles wat geen publieke contentpagina is blijft de bestaande app:
   * - /spelen/
   * - /join/ABCDE
   * - eventuele toekomstige game-routes
   */
  return <>{children}</>;
}

export default PublicSite;
