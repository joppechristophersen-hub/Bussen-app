export const publicPages = {
  "/": { title: "BusBende — samen online Bussen spelen", description: "Speel Bussen met vrienden op jullie eigen telefoons. Ontdek de vier gokstappen, de boom en de bus, met speluitleg en voorbeelden." },
  "/spelregels": { title: "Spelregels Bussen met voorbeelden | BusBende", description: "Zo werkt BusBende: rood of zwart, hoger of lager, binnen of buiten, Disco, de boom en de bus. Met kaartvoorbeelden en uitleg over checkpoints." },
  "/veelgestelde-vragen": { title: "Hulp bij starten, meedoen en spelen | BusBende", description: "Antwoorden over kamercodes, QR-codes, verbinding, geluid en instellingen. Praktische hulp om samen BusBende te spelen." },
  "/over-busbende": { title: "Over BusBende en contact", description: "Wat BusBende doet, hoe het digitale kaartspel werkt en hoe je vragen, fouten of feedback kunt doorgeven." },
  "/verantwoord-spelen": { title: "Verantwoord spelen | BusBende", description: "Maak samen afspraken voor een prettig potje BusBende. Speel met punten of alcoholvrij en respecteer ieders grenzen." },
} as const;

export function normalizePublicPath(path: string) {
  return path.replace(/\/+$/, "") || "/";
}

export function isPublicPath(path: string): path is keyof typeof publicPages {
  return Object.hasOwn(publicPages, path);
}
