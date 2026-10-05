import PlayingCardFace from "./PlayingCardFace";

const cards = [
  { rank: "A", symbol: "♠", color: "zwart" },
  { rank: "H", symbol: "♥", color: "rood" },
  { rank: "8", symbol: "♦", color: "rood" },
  { rank: "B", symbol: "♣", color: "zwart" },
  { rank: "7", symbol: "♥", color: "rood" },
  { rank: "A", symbol: "♦", color: "rood" },
  { rank: "V", symbol: "♠", color: "zwart" },
  { rank: "10", symbol: "♣", color: "zwart" },
];

export default function CardBackdrop() {
  return (
    <div className="bb-card-backdrop" aria-hidden="true">
      {cards.map((card, index) => (
        <div className={`bb-backdrop-slot bb-backdrop-slot-${index + 1}`} key={`${card.rank}${card.symbol}`}>
          <div className={`playing-card bb-backdrop-card ${card.color}`}>
            <PlayingCardFace rank={card.rank} symbol={card.symbol} />
          </div>
        </div>
      ))}
    </div>
  );
}
