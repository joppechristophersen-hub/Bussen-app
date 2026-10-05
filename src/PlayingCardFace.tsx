type PlayingCardFaceProps = { rank: string; symbol: string };

// Shared face for gameplay and decorative cards.
export default function PlayingCardFace({ rank, symbol }: PlayingCardFaceProps) {
  return (
    <>
      <div className="card-corner card-corner-top"><strong>{rank}</strong><span>{symbol}</span></div>
      <div className="card-center-symbol">{symbol}</div>
      <div className="card-corner card-corner-bottom"><strong>{rank}</strong><span>{symbol}</span></div>
    </>
  );
}
