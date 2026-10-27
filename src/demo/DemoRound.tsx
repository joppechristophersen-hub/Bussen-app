import { useEffect, useReducer, useRef } from "react";
import CardBack from "../CardBack";
import PlayingCardFace from "../PlayingCardFace";
import { demoReducer, initialDemoState, practiceHand, questions, treeCard } from "./demoGame";
import type { DemoAction, DemoCard } from "./demoGame";
import "./demo.css";

function LessonCard({ card, label }: { card?: DemoCard; label?: string }) {
  return <span className={`bb-demo-card${card?.red ? " bb-demo-card-red" : ""}${!card ? " bb-demo-card-back" : ""}`}
    role="img" aria-label={label ?? (card ? `${card.rank} ${card.suit}` : "Gesloten kaart")}>
    <span aria-hidden="true">{card ? <PlayingCardFace rank={card.rank} symbol={card.symbol} /> : <CardBack />}</span>
  </span>;
}

export default function DemoRound() {
  const [state, dispatch] = useReducer(demoReducer, undefined, initialDemoState);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const interacted = useRef(false);
  const act = (action: DemoAction) => { interacted.current = true; dispatch(action); };
  useEffect(() => {
    if (interacted.current) (state.result ? feedback.current : heading.current)?.focus({ preventScroll: true });
  }, [state.stage, state.step, state.position, state.result]);
  const part = state.stage === "cards" ? 0 : ["tree", "distribution"].includes(state.stage) ? 1 : 2;
  const dealt = state.stage === "cards" ? state.step + Number(Boolean(state.result)) : 4;
  const total = state.receivers[0] + state.receivers[1];
  const cardStage = state.stage === "cards";
  const busStage = state.stage === "bus";
  const title = cardStage ? questions[state.step].title : busStage ? `Halte ${state.position + 1}: hoger of lager?`
    : ({ tree: "Welke kaart kun jij wegspelen?", distribution: "Verdeel drie oefenpunten", "bus-intro": "Wie gaat de bus in?", finished: "Je bent uit de bus!" } as const)[state.stage as "tree" | "distribution" | "bus-intro" | "finished"];

  return <section className="bb-demo" aria-label="Speelbare BusBende-demo">
    <header className="bb-demo-top"><span>Oefenpotje</span><span>Vaste kaarten · geen account</span></header>
    <ol className="bb-demo-progress" aria-label="Voortgang demo">
      {["Vier kaarten", "De boom", "De bus"].map((label, index) => <li key={label} aria-current={part === index ? "step" : undefined}>
        <span>{index < part ? "✓" : index + 1}</span>{label}</li>)}
    </ol>
    <div className="bb-demo-content">
      <p className="bb-demo-eyebrow">{cardStage ? `Kaart ${state.step + 1} van 4` : state.stage === "finished" ? "Oefenrit voltooid" : part === 1 ? "Een voorbeeld uit rij drie" : "Een korte oefenrit van drie haltes"}</p>
      <h2 ref={heading} tabIndex={-1}>{title}</h2>

      {cardStage && <>
        <p className="bb-demo-instruction">{questions[state.step].help}</p>
        <div className="bb-demo-draw"><LessonCard card={state.result?.card} /></div>
        {!state.result && <div className="bb-demo-choices">{questions[state.step].choices.map(([value, label]) =>
          <button type="button" key={value} onClick={() => act({ type: "guess", guess: value })}>{label}</button>)}</div>}
      </>}

      {state.stage === "tree" && <>
        <p className="bb-demo-instruction">Er gaat een 5 open in rij drie. Klik in je hand op een kaart met dezelfde waarde. Het figuur maakt hier niet uit.</p>
        <div className="bb-demo-draw"><LessonCard card={treeCard} label="Open boomkaart: 5 harten, rij drie" /></div>
        <p className="bb-demo-rule">Rij 3 = drie punten om uit te delen. Deze kaart is geen 2×-kaart.</p>
        <p className="bb-demo-message" role="status">{state.treeMessage}</p>
      </>}

      {state.stage === "distribution" && <>
        <p className="bb-demo-instruction">Je klaveren 5 past op de harten 5. Die kaart is uit je hand; er blijven er drie over. Verdeel nu de drie punten over je fictieve medespelers.</p>
        <div className="bb-demo-allocation">{(["Sam", "Noor"] as const).map((name, i) => {
          const receiver = i as 0 | 1;
          return <div key={name}><span className="bb-demo-avatar" aria-hidden="true">{name[0]}</span><strong>{name}</strong>
            <button type="button" aria-label={`Eén punt minder voor ${name}`} disabled={state.receivers[receiver] === 0} onClick={() => act({ type: "allocate", receiver, delta: -1 })}>−</button>
            <output aria-label={`Punten voor ${name}`}>{state.receivers[receiver]}</output>
            <button type="button" aria-label={`Eén punt meer voor ${name}`} disabled={total === 3} onClick={() => act({ type: "allocate", receiver, delta: 1 })}>+</button></div>;
        })}</div>
        <p role="status" className="bb-demo-rule">Nog te verdelen: {3 - total}</p>
        <button className="bb-demo-primary" type="button" disabled={total !== 3} onClick={() => act({ type: "distribute" })}>Bevestig verdeling</button>
      </>}

      {state.stage === "bus-intro" && <>
        <p className="bb-demo-instruction">Je hebt {state.receivers[0]} {state.receivers[0] === 1 ? "punt" : "punten"} aan Sam en {state.receivers[1]} {state.receivers[1] === 1 ? "punt" : "punten"} aan Noor gegeven. Stel dat de rest van de boom nu ook gespeeld is:</p>
        <dl className="bb-demo-standing"><div><dt>Jij</dt><dd>3 kaarten over</dd></div><div><dt>Sam</dt><dd>4 kaarten over</dd></div><div><dt>Noor</dt><dd>2 kaarten over</dd></div></dl>
        <p>Sam heeft de meeste kaarten over en wordt chauffeur. In deze oefening bestuur jij Sams bus. Speel drie haltes achter elkaar goed; bij een fout begin je weer bij halte 1.</p>
        <p className="bb-demo-rule">Een verkorte oefenrit zonder checkpoints of dubbele kaarten. In een echt potje trekt de chauffeur de buslengte en gelden jullie ingestelde dubbelregels.</p>
        <button className="bb-demo-primary" type="button" onClick={() => act({ type: "start-bus" })}>Begin de oefenrit</button>
      </>}

      {busStage && <>
        <p className="bb-demo-instruction">{state.result ? "De nieuwe kaart blijft bovenop deze halte liggen." : `Je vergelijkt de volgende kaart met ${state.piles[state.position].rank} ${state.piles[state.position].suit}. Een aas is 14; boer, vrouw en koning zijn 11, 12 en 13.`}</p>
        <div className="bb-demo-bus">{state.piles.map((card, index) => <div key={index} className={index === state.position ? "is-current" : ""}>
          <span>Halte {index + 1}{index < state.position ? " ✓" : ""}</span><LessonCard card={card} /></div>)}</div>
        {!state.result && <div className="bb-demo-choices">{["hoger", "lager"].map(guess => <button type="button" key={guess} onClick={() => act({ type: "guess", guess })}>{guess === "hoger" ? "Hoger" : "Lager"}</button>)}</div>}
      </>}

      {state.result && <div ref={feedback} tabIndex={-1} className={`bb-demo-feedback ${state.result.correct ? "is-correct" : "is-wrong"}`}>
        <strong>{state.result.correct ? "Goed geraden" : "Deze keer mis"}</strong>
        <p>{state.result.text}</p>
        {cardStage && <p>{!state.result.correct ? "Dat is één oefenpunt. Je houdt de kaart en speelt verder." : state.step === 3 ? "Bij een geslaagde Disco krijgen in het echte spel de andere spelers de opdracht." : "Je houdt de kaart en krijgt geen oefenpunt."}</p>}
        <button type="button" className="bb-demo-primary" onClick={() => act({ type: "next" })}>{cardStage ? state.step === 3 ? "Verder naar de boom" : "Volgende kaart" : state.result.correct ? state.position === 2 ? "Rond de rit af" : "Volgende halte" : "Opnieuw vanaf halte 1"}</button>
      </div>}

      {(cardStage || state.stage === "tree" || state.stage === "distribution") && <div className="bb-demo-hand">
        <h3>Jouw hand {state.stage === "distribution" ? "· 3 kaarten over" : ""}</h3>
        <div>{practiceHand.map((card, index) => state.stage === "distribution" && index === 1 ? null : state.stage === "tree" ?
          <button type="button" key={index} className="bb-demo-hand-choice" aria-label={`Speel ${card.rank} ${card.suit}`} onClick={() => act({ type: "match", index })}><LessonCard card={card} /></button>
          : <LessonCard key={index} card={index < dealt ? card : undefined} />)}</div>
      </div>}

      {state.stage === "finished" && <div className="bb-demo-complete">
        <img src="/favicon.svg" width="88" height="88" alt="BusBende buslogo" />
        <p>Je hebt de vier voorspellingen, een boomverdeling en een korte busrit gespeeld. In het echte spel kiest iedere speler zelf en volgen jullie de hele boom.</p>
        <dl className="bb-demo-standing"><div><dt>Voorronde</dt><dd>{state.correct} van 4 goed</dd></div><div><dt>Oefenpunten totaal</dt><dd>{state.penalties}</dd></div><div><dt>Pogingen busrit</dt><dd>{state.attempts}</dd></div></dl>
        <a className="bb-demo-primary" href="/spelen/">Start een potje met vrienden</a>
        <a className="bb-demo-rule-link" href="/spelregels/#instellingen">Bekijk alle instelbare regels</a>
      </div>}
    </div>
    <footer className="bb-demo-bottom"><span>Alleen oefenpunten · geen drinkopdrachten</span><button type="button" onClick={() => act({ type: "reset" })}>Begin opnieuw</button></footer>
    <noscript>Schakel JavaScript in om de demo te bedienen. De uitleg en spelregels kun je ook zonder JavaScript lezen.</noscript>
  </section>;
}
