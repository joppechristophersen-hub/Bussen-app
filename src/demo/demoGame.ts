export type DemoCard = { value: number; rank: string; symbol: string; suit: string; red: boolean };
const card = (value: number, symbol: string, suit: string): DemoCard => ({
  value, rank: ({ 11: "B", 12: "V", 13: "K", 14: "A" } as Record<number, string>)[value] ?? String(value),
  symbol, suit, red: symbol === "♥" || symbol === "♦",
});
export const practiceHand = [card(8, "♥", "harten"), card(5, "♣", "klaveren"), card(11, "♦", "ruiten"), card(14, "♠", "schoppen")];
export const treeCard = card(5, "♥", "harten");
const busCards = [card(8, "♣", "klaveren"), card(5, "♦", "ruiten"), card(10, "♠", "schoppen")];
const busDraws = [card(12, "♥", "harten"), card(3, "♠", "schoppen"), card(14, "♦", "ruiten"), card(7, "♣", "klaveren"), card(13, "♦", "ruiten"), card(2, "♥", "harten")];
export const questions = [
  { title: "Rood of zwart?", help: "Harten en ruiten zijn rood; schoppen en klaveren zijn zwart.", choices: [["rood", "Rood"], ["zwart", "Zwart"]] },
  { title: "Hoger of lager dan je eerste kaart?", help: "Vergelijk met je eerste kaart. Een gelijke waarde telt in deze voorronde als fout.", choices: [["hoger", "Hoger"], ["lager", "Lager"]] },
  { title: "Binnen of buiten je eerste twee kaarten?", help: "Binnen betekent strikt tussen beide waarden. Een kaart op de grens is bij beide keuzes fout.", choices: [["binnen", "Binnen"], ["buiten", "Buiten"]] },
  { title: "Welk figuur wordt je vierde kaart?", help: "Kies een figuur, of Disco als je denkt dat je straks alle vier de figuren hebt.", choices: [["harten", "♥ Harten"], ["ruiten", "♦ Ruiten"], ["klaveren", "♣ Klaveren"], ["schoppen", "♠ Schoppen"], ["disco", "Disco"]] },
];
type Result = { correct: boolean; text: string; card: DemoCard };
export type DemoState = {
  stage: "cards" | "tree" | "distribution" | "bus-intro" | "bus" | "finished";
  step: number; result: Result | null; correct: number; penalties: number;
  receivers: [number, number]; treeMessage: string; piles: DemoCard[];
  position: number; draws: number; attempts: number;
};
export type DemoAction =
  | { type: "guess"; guess: string } | { type: "next" }
  | { type: "match"; index: number } | { type: "allocate"; receiver: 0 | 1; delta: -1 | 1 }
  | { type: "distribute" } | { type: "start-bus" } | { type: "reset" };
export function initialDemoState(): DemoState {
  return { stage: "cards", step: 0, result: null, correct: 0, penalties: 0, receivers: [0, 0], treeMessage: "", piles: [...busCards], position: 0, draws: 0, attempts: 1 };
}
export function nextBusCard(state: DemoState) {
  // Fixed teaching cards keep the server-rendered lesson and browser identical.
  // This short exercise intentionally omits doubles and checkpoints.
  let offset = state.draws;
  while (busDraws[offset % busDraws.length].value === state.piles[state.position].value) offset++;
  return { card: busDraws[offset % busDraws.length], nextDraw: offset + 1 };
}
export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  if (action.type === "reset") return initialDemoState();
  if (action.type === "guess" && !state.result && state.stage === "cards") {
    if (!questions[state.step].choices.some(([value]) => value === action.guess)) return state;
    const drawn = practiceHand[state.step];
    const right = ["rood", "lager", "buiten", "schoppen"][state.step];
    const correct = action.guess === right || (state.step === 3 && action.guess === "disco");
    const explanations = ["De 8 is harten, dus rood.", "De 5 is lager dan je eerste kaart, de 8.", "De boer is 11: die ligt buiten het interval van 5 tot 8.", "De aas is schoppen. Samen met harten, klaveren en ruiten zijn dat vier verschillende figuren: ook Disco is goed."];
    return { ...state, correct: state.correct + Number(correct), penalties: state.penalties + Number(!correct), result: { card: drawn, correct, text: explanations[state.step] } };
  }
  if (action.type === "next" && state.result) {
    if (state.stage === "cards") return { ...state, result: null, step: Math.min(3, state.step + 1), stage: state.step === 3 ? "tree" : "cards" };
    if (state.stage === "bus") {
      const position = state.result.correct ? state.position + 1 : 0;
      return { ...state, result: null, position, stage: position === 3 ? "finished" : "bus", attempts: state.attempts + Number(!state.result.correct) };
    }
  }
  if (action.type === "match" && state.stage === "tree") {
    if (!practiceHand[action.index]) return state;
    if (practiceHand[action.index].value !== treeCard.value) return { ...state, treeMessage: "Deze waarde past niet. Zoek de 5 in je hand; het figuur hoeft niet hetzelfde te zijn." };
    return { ...state, stage: "distribution", treeMessage: "" };
  }
  if (action.type === "allocate" && state.stage === "distribution") {
    const receivers: [number, number] = [...state.receivers];
    const total = receivers[0] + receivers[1];
    if (receivers[action.receiver] + action.delta < 0 || total + action.delta > 3) return state;
    receivers[action.receiver] += action.delta;
    return { ...state, receivers };
  }
  if (action.type === "distribute" && state.stage === "distribution" && state.receivers[0] + state.receivers[1] === 3) return { ...state, stage: "bus-intro" };
  if (action.type === "start-bus" && state.stage === "bus-intro") return { ...state, stage: "bus" };
  if (action.type === "guess" && state.stage === "bus" && !state.result) {
    if (!["hoger", "lager"].includes(action.guess)) return state;
    const reference = state.piles[state.position];
    const { card: drawn, nextDraw } = nextBusCard(state);
    const correct = action.guess === "hoger" ? drawn.value > reference.value : drawn.value < reference.value;
    const piles = [...state.piles];
    piles[state.position] = drawn;
    const amount = correct ? 0 : state.position + 1;
    return { ...state, piles, draws: nextDraw, penalties: state.penalties + amount, result: { correct, card: drawn, text: `${drawn.rank} is ${drawn.value > reference.value ? "hoger" : "lager"} dan ${reference.rank}. ${correct ? "Je gaat één halte verder." : `Dat is ${amount} ${amount === 1 ? "oefenpunt" : "oefenpunten"}; je begint weer bij halte 1. De nieuwe kaart blijft liggen.`}` } };
  }
  return state;
}
