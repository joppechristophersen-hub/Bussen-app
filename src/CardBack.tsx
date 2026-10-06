import { BusEmblem } from "./BrandLogo";

export default function CardBack() {
  return <div className="bb-card-back-design" aria-label="BusBende kaartachterkant">
    <span className="bb-card-back-corner top-left" aria-hidden="true">♠</span>
    <span className="bb-card-back-corner top-right" aria-hidden="true">♥</span>
    <BusEmblem />
    <span className="bb-card-back-corner bottom-left" aria-hidden="true">♦</span>
    <span className="bb-card-back-corner bottom-right" aria-hidden="true">♣</span>
  </div>;
}
