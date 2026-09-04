import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./commerce.css";

type ShopCategory =
  | "themes"
  | "cards"
  | "animations"
  | "extras";

type AppearanceMode =
  | "system"
  | "light"
  | "dark";

type ManualAppearanceMode =
  | "light"
  | "dark";

type ThemePalette = {
  background: string;
  surface: string;
  surfaceSoft: string;
  accent: string;
  accentStrong: string;
  text: string;
  muted: string;
  border: string;
};

type ThemePalettes = {
  light: ThemePalette;
  dark: ThemePalette;
};

type ShopEffect = {
  palettes?: ThemePalettes;
  cardBack?: string;
  animation?: string;
  extra?: string;
};

type ShopItem = {
  id: string;
  name: string;

  category:
    ShopCategory;

  type: string;

  equipSlot?: string;

  description: string;

  priceLabel: string;

  free: boolean;

  featured?: boolean;

  effect?: ShopEffect;
};

type ShopCatalog = {
  version: number;
  updatedAt: string;
  items: ShopItem[];
};

type CommerceShellProps = {
  children: ReactNode;
};

const SHOP_CATALOG_URL =
  "https://bussen-app.onrender.com/shop-catalog.json";

const OWNED_STORAGE_KEY =
  "busbaas-owned-items";

const EQUIPPED_STORAGE_KEY =
  "busbaas-equipped-items";

const APPEARANCE_STORAGE_KEY =
  "busbaas-appearance-mode";

const MANUAL_APPEARANCE_STORAGE_KEY =
  "busbaas-manual-appearance-mode";

/*
 * =========================
 * CLASSIC PALETTEN
 * =========================
 *
 * Licht heeft bewust sterker contrast:
 * - donkerdere tekst
 * - duidelijkere borders
 * - donkerder groen
 * - duidelijk verschil tussen achtergrond
 *   en witte kaarten/panelen
 */

const CLASSIC_LIGHT: ThemePalette = {
  background:
    "#f6f0df",

  surface:
    "#fffaf0",

  surfaceSoft:
    "#efe6c9",

  accent:
    "#f6c945",

  accentStrong:
    "#d99d20",

  text:
    "#24251f",

  muted:
    "#6c6656",

  border:
    "#d6c99f",
};

const CLASSIC_DARK: ThemePalette = {
  background:
    "#080d0b",

  surface:
    "#111815",

  surfaceSoft:
    "#1b201b",

  accent:
    "#f6c945",

  accentStrong:
    "#d99d20",

  text:
    "#fff8df",

  muted:
    "#bdb6a1",

  border:
    "#30372f",
};

const FALLBACK_CLASSIC_THEME: ShopItem = {
  id:
    "theme-classic",

  name:
    "Busbaas Classic",

  category:
    "themes",

  type:
    "theme",

  equipSlot:
    "theme",

  description:
    "De originele gele Busbaas-look. Inclusief lichte en donkere variant.",

  priceLabel:
    "Gratis",

  free:
    true,

  featured:
    true,

  effect: {
    palettes: {
      light:
        CLASSIC_LIGHT,

      dark:
        CLASSIC_DARK,
    },
  },
};

const CATEGORY_LABELS: Record<
  ShopCategory,
  string
> = {
  themes:
    "🎨 Thema's",

  cards:
    "🃏 Kaarten",

  animations:
    "✨ Animaties",

  extras:
    "🎁 Extra's",
};

const CATEGORY_ORDER: ShopCategory[] = [
  "themes",
  "cards",
  "animations",
  "extras",
];

/*
 * =========================
 * LOCAL STORAGE
 * =========================
 */

function readOwnedItems() {
  try {
    const stored =
      localStorage.getItem(
        OWNED_STORAGE_KEY
      );

    if (!stored) {
      return [
        "theme-classic",
      ];
    }

    const parsed =
      JSON.parse(
        stored
      );

    if (
      !Array.isArray(
        parsed
      )
    ) {
      return [
        "theme-classic",
      ];
    }

    const cleaned =
      parsed.filter(
        (
          value
        ): value is string =>
          typeof value ===
          "string"
      );

    /*
     * Oude gratis licht/donker-items
     * verwijderen we uit eigendom.
     */
    const migrated =
      cleaned.filter(
        (item) =>
          item !==
            "theme-auto" &&
          item !==
            "theme-light" &&
          item !==
            "theme-dark"
      );

    return [
      ...new Set([
        "theme-classic",
        ...migrated,
      ]),
    ];
  } catch {
    return [
      "theme-classic",
    ];
  }
}

function readEquippedItems() {
  try {
    const stored =
      localStorage.getItem(
        EQUIPPED_STORAGE_KEY
      );

    if (!stored) {
      return {
        theme:
          "theme-classic",
      };
    }

    const parsed =
      JSON.parse(
        stored
      );

    if (
      !parsed ||
      typeof parsed !==
        "object"
    ) {
      return {
        theme:
          "theme-classic",
      };
    }

    let selectedTheme =
      typeof parsed.theme ===
      "string"
        ? parsed.theme
        : "theme-classic";

    /*
     * Migratie van de vorige versie:
     * auto / light / dark waren toen
     * aparte shopproducten.
     */
    if (
      selectedTheme ===
        "theme-auto" ||
      selectedTheme ===
        "theme-light" ||
      selectedTheme ===
        "theme-dark"
    ) {
      selectedTheme =
        "theme-classic";
    }

    return {
      ...parsed,

      theme:
        selectedTheme,
    };
  } catch {
    return {
      theme:
        "theme-classic",
    };
  }
}

function readAppearanceMode():
  AppearanceMode {
  try {
    const stored =
      localStorage.getItem(
        APPEARANCE_STORAGE_KEY
      );

    if (
      stored ===
        "light" ||
      stored ===
        "dark"
    ) {
      return stored;
    }

    return "system";
  } catch {
    return "system";
  }
}

function readManualAppearanceMode():
  ManualAppearanceMode {
  try {
    const stored =
      localStorage.getItem(
        MANUAL_APPEARANCE_STORAGE_KEY
      );

    if (
      stored ===
        "dark"
    ) {
      return "dark";
    }

    return "light";
  } catch {
    return "light";
  }
}

/*
 * =========================
 * COMPONENT
 * =========================
 */

function CommerceShell({
  children,
}: CommerceShellProps) {
  const [
    shopOpen,
    setShopOpen,
  ] =
    useState(false);

  const [
    shopItems,
    setShopItems,
  ] =
    useState<
      ShopItem[]
    >([
      FALLBACK_CLASSIC_THEME,
    ]);

  const [
    shopLoading,
    setShopLoading,
  ] =
    useState(true);

  const [
    shopError,
    setShopError,
  ] =
    useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState<ShopCategory>(
      "themes"
    );

  const [
    ownedItems,
    setOwnedItems,
  ] =
    useState<string[]>(
      readOwnedItems
    );

  const [
    equippedItems,
    setEquippedItems,
  ] =
    useState<
      Record<
        string,
        string
      >
    >(
      readEquippedItems
    );

  const [
    purchaseNotice,
    setPurchaseNotice,
  ] =
    useState<ShopItem | null>(
      null
    );

  /*
   * =========================
   * LICHT / DONKER
   * =========================
   */

  const [
    appearanceMode,
    setAppearanceMode,
  ] =
    useState<AppearanceMode>(
      readAppearanceMode
    );

  const [
    manualAppearanceMode,
    setManualAppearanceMode,
  ] =
    useState<ManualAppearanceMode>(
      readManualAppearanceMode
    );

  const [
    systemDark,
    setSystemDark,
  ] =
    useState(() => {
      return (
        window.matchMedia?.(
          "(prefers-color-scheme: dark)"
        ).matches ??
        false
      );
    });

  /*
   * =========================
   * ADVERTENTIE NA POTJE
   * =========================
   */

  const [
    adVisible,
    setAdVisible,
  ] =
    useState(false);

  const [
    adCountdown,
    setAdCountdown,
  ] =
    useState(3);

  const gameWasFinishedRef =
    useRef(false);

  const finishAdDelayTimerRef =
    useRef<number | null>(
      null
    );

  /*
   * =========================
   * DEVICE THEME
   * =========================
   */

  useEffect(() => {
    const media =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

    function handleChange(
      event:
        MediaQueryListEvent
    ) {
      setSystemDark(
        event.matches
      );
    }

    setSystemDark(
      media.matches
    );

    media.addEventListener(
      "change",
      handleChange
    );

    return () => {
      media.removeEventListener(
        "change",
        handleChange
      );
    };
  }, []);

  /*
   * =========================
   * SHOP LADEN
   * =========================
   */

  useEffect(() => {
    let cancelled =
      false;

    async function loadCatalog() {
      setShopLoading(
        true
      );

      setShopError(
        ""
      );

      try {
        const response =
          await fetch(
            `${SHOP_CATALOG_URL}?v=${Date.now()}`
          );

        if (
          !response.ok
        ) {
          throw new Error(
            "Catalogus kon niet worden geladen."
          );
        }

        const data =
          (await response.json()) as ShopCatalog;

        if (
          !data ||
          !Array.isArray(
            data.items
          )
        ) {
          throw new Error(
            "Ongeldige shopcatalogus."
          );
        }

        if (
          cancelled
        ) {
          return;
        }

        /*
         * Oude licht/donker-producten worden
         * niet meer getoond als een oude
         * catalogus nog even in cache staat.
         */
        const cleanedItems =
          data.items.filter(
            (item) =>
              item.id !==
                "theme-auto" &&
              item.id !==
                "theme-light" &&
              item.id !==
                "theme-dark"
          );

        /*
         * Busbaas Classic wordt lokaal genormaliseerd.
         * Zo kan een oudere online catalogus nooit meer
         * de oude groene Classic-kleuren terugbrengen.
         */
        const normalizedItems =
          cleanedItems.map(
            (item) =>
              item.id ===
              "theme-classic"
                ? {
                    ...item,
                    name:
                      "Busbaas Classic",
                    description:
                      "De originele gele Busbaas-look. Inclusief lichte en donkere variant.",
                    priceLabel:
                      "Gratis",
                    free:
                      true,
                    featured:
                      true,
                    effect: {
                      ...item.effect,
                      palettes: {
                        light:
                          CLASSIC_LIGHT,
                        dark:
                          CLASSIC_DARK,
                      },
                    },
                  }
                : item
          );

        const hasClassic =
          normalizedItems.some(
            (item) =>
              item.id ===
              "theme-classic"
          );

        const loadedItems =
          hasClassic
            ? normalizedItems
            : [
                FALLBACK_CLASSIC_THEME,
                ...normalizedItems,
              ];

        setShopItems(
          loadedItems
        );

        /*
         * Alle gratis items automatisch
         * als eigendom registreren.
         */
        setOwnedItems(
          (
            current
          ) => {
            const freeIds =
              loadedItems
                .filter(
                  (item) =>
                    item.free
                )
                .map(
                  (item) =>
                    item.id
                );

            return [
              ...new Set([
                "theme-classic",
                ...current,
                ...freeIds,
              ]),
            ];
          }
        );
      } catch (
        error
      ) {
        console.error(
          "Shop laden mislukt:",
          error
        );

        if (
          cancelled
        ) {
          return;
        }

        setShopItems([
          FALLBACK_CLASSIC_THEME,
        ]);

        setShopError(
          "De online shop kon niet worden geladen. Busbaas Classic blijft beschikbaar."
        );
      } finally {
        if (
          !cancelled
        ) {
          setShopLoading(
            false
          );
        }
      }
    }

    loadCatalog();

    return () => {
      cancelled =
        true;
    };
  }, []);

  /*
   * =========================
   * OPSLAAN
   * =========================
   */

  useEffect(() => {
    localStorage.setItem(
      OWNED_STORAGE_KEY,
      JSON.stringify(
        ownedItems
      )
    );
  }, [
    ownedItems,
  ]);

  useEffect(() => {
    localStorage.setItem(
      EQUIPPED_STORAGE_KEY,
      JSON.stringify(
        equippedItems
      )
    );
  }, [
    equippedItems,
  ]);

  useEffect(() => {
    localStorage.setItem(
      APPEARANCE_STORAGE_KEY,
      appearanceMode
    );
  }, [
    appearanceMode,
  ]);

  useEffect(() => {
    localStorage.setItem(
      MANUAL_APPEARANCE_STORAGE_KEY,
      manualAppearanceMode
    );
  }, [
    manualAppearanceMode,
  ]);

  /*
   * =========================
   * THEMA TOEPASSEN
   * =========================
   */

  useEffect(() => {
    const selectedThemeId =
      equippedItems.theme ||
      "theme-classic";

    const selectedTheme =
      shopItems.find(
        (item) =>
          item.id ===
            selectedThemeId &&
          item.category ===
            "themes"
      ) ||
      shopItems.find(
        (item) =>
          item.id ===
          "theme-classic"
      ) ||
      FALLBACK_CLASSIC_THEME;

    const resolvedMode:
      ManualAppearanceMode =
      appearanceMode ===
      "system"
        ? systemDark
          ? "dark"
          : "light"
        : appearanceMode;

    const palettes =
      selectedTheme
        .effect
        ?.palettes ||
      FALLBACK_CLASSIC_THEME
        .effect
        ?.palettes!;

    const palette =
      palettes[
        resolvedMode
      ];

    const root =
      document.documentElement;

    root.style.setProperty(
      "--bb-background",
      palette.background
    );

    root.style.setProperty(
      "--bb-surface",
      palette.surface
    );

    root.style.setProperty(
      "--bb-surface-soft",
      palette.surfaceSoft
    );

    root.style.setProperty(
      "--bb-accent",
      palette.accent
    );

    root.style.setProperty(
      "--bb-accent-strong",
      palette.accentStrong
    );

    root.style.setProperty(
      "--bb-text",
      palette.text
    );

    root.style.setProperty(
      "--bb-muted",
      palette.muted
    );

    root.style.setProperty(
      "--bb-border",
      palette.border
    );

    root.style.colorScheme =
      resolvedMode;

    document.body.dataset.bbTheme =
      selectedTheme.id;

    document.body.dataset.bbColorMode =
      resolvedMode;

    document.body.dataset.bbAppearance =
      appearanceMode;
  }, [
    equippedItems.theme,
    shopItems,
    appearanceMode,
    systemDark,
  ]);

  /*
   * =========================
   * CARD BACK
   * =========================
   */

  useEffect(() => {
    const cardBackId =
      equippedItems.cardBack;

    const cardBack =
      shopItems.find(
        (item) =>
          item.id ===
          cardBackId
      );

    document.body.dataset.bbCardBack =
      cardBack
        ?.effect
        ?.cardBack ||
      "classic";
  }, [
    equippedItems.cardBack,
    shopItems,
  ]);

  /*
   * =========================
   * ANIMATIE
   * =========================
   */

  useEffect(() => {
    const animationId =
      equippedItems.animation;

    const animation =
      shopItems.find(
        (item) =>
          item.id ===
          animationId
      );

    document.body.dataset.bbAnimation =
      animation
        ?.effect
        ?.animation ||
      "classic";
  }, [
    equippedItems.animation,
    shopItems,
  ]);

  /*
   * =========================
   * UI COPY
   * =========================
   *
   * Zo hoeven we de grote App.tsx hiervoor
   * niet aan te raken.
   */

  useEffect(() => {
    function updateExampleNames() {
      const inputs =
        document.querySelectorAll<HTMLInputElement>(
          "input[placeholder]"
        );

      inputs.forEach(
        (input) => {
          if (
            input.placeholder ===
              "Bijvoorbeeld Joppe" ||
            input.placeholder ===
              "Bijvoorbeeld Gerda"
          ) {
            input.placeholder =
              "Bijvoorbeeld Gerda";
          }

          if (
            input.placeholder ===
              "Bijvoorbeeld Dennis" ||
            input.placeholder ===
              "Bijvoorbeeld Johan"
          ) {
            input.placeholder =
              "Bijvoorbeeld Johan";
          }
        }
      );
    }

    const root =
      document.getElementById(
        "root"
      );

    if (!root) {
      return;
    }

    updateExampleNames();

    const observer =
      new MutationObserver(
        updateExampleNames
      );

    observer.observe(
      root,
      {
        childList:
          true,

        subtree:
          true,
      }
    );

    return () => {
      observer.disconnect();
    };
  }, []);

  /*
   * =========================
   * EINDE SPEL DETECTEREN
   * =========================
   */

  useEffect(() => {
    const root =
      document.getElementById(
        "root"
      );

    if (!root) {
      return;
    }

    function checkFinishedGame() {
      const gameFinished =
        Boolean(
          document.querySelector(
            ".bus-finished-panel"
          )
        );

      if (
        gameFinished &&
        !gameWasFinishedRef.current
      ) {
        setAdCountdown(
          3
        );

        if (
          finishAdDelayTimerRef.current !==
          null
        ) {
          window.clearTimeout(
            finishAdDelayTimerRef.current
          );
        }

        /*
         * Eerst drie seconden alleen het
         * eindscherm tonen. De endgame-lock
         * in ExperienceShell houdt de knoppen
         * in deze periode verborgen.
         */
        finishAdDelayTimerRef.current =
          window.setTimeout(
            () => {
              setAdVisible(
                true
              );

              finishAdDelayTimerRef.current =
                null;
            },
            3000
          );
      }

      if (
        !gameFinished &&
        finishAdDelayTimerRef.current !==
          null
      ) {
        window.clearTimeout(
          finishAdDelayTimerRef.current
        );

        finishAdDelayTimerRef.current =
          null;
      }

      gameWasFinishedRef.current =
        gameFinished;
    }

    const observer =
      new MutationObserver(
        checkFinishedGame
      );

    observer.observe(
      root,
      {
        childList:
          true,

        subtree:
          true,
      }
    );

    checkFinishedGame();

    return () => {
      observer.disconnect();

      if (
        finishAdDelayTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          finishAdDelayTimerRef.current
        );
      }
    };
  }, []);

  /*
   * =========================
   * TEST AD TIMER
   * =========================
   */

  useEffect(() => {
    if (
      !adVisible
    ) {
      return;
    }

    if (
      adCountdown <=
      0
    ) {
      const finishTimer =
        window.setTimeout(
          () => {
            setAdVisible(
              false
            );
          },
          400
        );

      return () => {
        window.clearTimeout(
          finishTimer
        );
      };
    }

    const timer =
      window.setTimeout(
        () => {
          setAdCountdown(
            (
              current
            ) =>
              Math.max(
                0,
                current - 1
              )
          );
        },
        1000
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    adVisible,
    adCountdown,
  ]);

  /*
   * =========================
   * APPEARANCE CONTROLS
   * =========================
   */

  const automaticAppearance =
    appearanceMode ===
    "system";

  function toggleAutomaticAppearance() {
    if (
      automaticAppearance
    ) {
      setAppearanceMode(
        manualAppearanceMode
      );

      return;
    }

    setAppearanceMode(
      "system"
    );
  }

  function selectManualAppearance(
    mode:
      ManualAppearanceMode
  ) {
    setManualAppearanceMode(
      mode
    );

    setAppearanceMode(
      mode
    );
  }

  /*
   * =========================
   * SHOP HELPERS
   * =========================
   */

  const visibleItems =
    useMemo(
      () =>
        shopItems.filter(
          (item) =>
            item.category ===
            selectedCategory
        ),
      [
        shopItems,
        selectedCategory,
      ]
    );

  function isOwned(
    item: ShopItem
  ) {
    return ownedItems.includes(
      item.id
    );
  }

  function isEquipped(
    item: ShopItem
  ) {
    if (
      !item.equipSlot
    ) {
      return false;
    }

    return (
      equippedItems[
        item.equipSlot
      ] ===
      item.id
    );
  }

  function equipItem(
    item: ShopItem
  ) {
    if (
      !isOwned(
        item
      )
    ) {
      setPurchaseNotice(
        item
      );

      return;
    }

    if (
      !item.equipSlot
    ) {
      return;
    }

    setEquippedItems(
      (
        current
      ) => ({
        ...current,

        [item.equipSlot!]:
          item.id,
      })
    );
  }

  function renderThemePreview(
    item: ShopItem
  ) {
    const palettes =
      item.effect
        ?.palettes ||
      FALLBACK_CLASSIC_THEME
        .effect
        ?.palettes!;

    return (
      <div className="bb-market-theme-preview bb-market-theme-preview-dual">
        <div
          className="bb-market-theme-half"
          style={{
            background:
              palettes.light
                .background,
          }}
        >
          <span
            style={{
              background:
                palettes.light
                  .surface,
            }}
          />

          <strong
            style={{
              background:
                palettes.light
                  .accent,
            }}
          />
        </div>

        <div
          className="bb-market-theme-half"
          style={{
            background:
              palettes.dark
                .background,
          }}
        >
          <span
            style={{
              background:
                palettes.dark
                  .surface,
            }}
          />

          <strong
            style={{
              background:
                palettes.dark
                  .accent,
            }}
          />
        </div>
      </div>
    );
  }

  function renderPreview(
    item:
      ShopItem
  ) {
    if (
      item.category ===
      "themes"
    ) {
      return renderThemePreview(
        item
      );
    }

    if (
      item.category ===
      "cards"
    ) {
      return (
        <div
          className={`bb-market-card-preview bb-market-card-${item.effect?.cardBack || "classic"}`}
        >
          <span>
            🚌
          </span>
        </div>
      );
    }

    if (
      item.category ===
      "animations"
    ) {
      return (
        <div className="bb-market-animation-preview">
          ✨

          <span>
            ✦
          </span>

          <small>
            ✨
          </small>
        </div>
      );
    }

    return (
      <div className="bb-market-extra-preview">
        🎁
      </div>
    );
  }

  return (
    <>
      {children}

      {!shopOpen && (
        <button
          type="button"
          className="bb-market-launcher"
          onClick={() =>
            setShopOpen(
              true
            )
          }
          aria-label="Shop en thema's openen"
        >
          <span>
            🎨
          </span>

          <strong>
            Shop
          </strong>
        </button>
      )}

      {shopOpen && (
        <div className="bb-market-layer">
          <div className="bb-market">
            <header className="bb-market-header">
              <div>
                <span className="bb-market-eyebrow">
                  BUSBAAS
                </span>

                <h1>
                  Shop & Thema's
                </h1>

                <p>
                  Maak Busbaas helemaal van jullie.
                </p>
              </div>

              <button
                type="button"
                className="bb-market-close"
                onClick={() =>
                  setShopOpen(
                    false
                  )
                }
              >
                ×
              </button>
            </header>

            {/*
             * =========================
             * WEERGAVE
             * =========================
             */}

            <section className="bb-market-appearance">
              <div className="bb-market-appearance-heading">
                <div>
                  <span>
                    WEERGAVE
                  </span>

                  <strong>
                    {automaticAppearance
                      ? "Automatisch"
                      : appearanceMode ===
                          "dark"
                        ? "Donker"
                        : "Licht"}
                  </strong>
                </div>

                <button
                  type="button"
                  className={`bb-market-switch ${
                    automaticAppearance
                      ? "active"
                      : ""
                  }`}
                  onClick={
                    toggleAutomaticAppearance
                  }
                  aria-label="Automatisch licht en donker"
                >
                  <span />
                </button>
              </div>

              <p>
                {automaticAppearance
                  ? `Busbaas volgt nu automatisch je apparaat (${systemDark ? "donker" : "licht"}).`
                  : "Automatisch staat uit. Kies hieronder zelf licht of donker."}
              </p>

              {!automaticAppearance && (
                <div className="bb-market-mode-selector">
                  <button
                    type="button"
                    className={
                      appearanceMode ===
                      "light"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      selectManualAppearance(
                        "light"
                      )
                    }
                  >
                    ☀️ Licht
                  </button>

                  <button
                    type="button"
                    className={
                      appearanceMode ===
                      "dark"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      selectManualAppearance(
                        "dark"
                      )
                    }
                  >
                    🌙 Donker
                  </button>
                </div>
              )}
            </section>

            <div className="bb-market-categories">
              {CATEGORY_ORDER.map(
                (
                  category
                ) => (
                  <button
                    type="button"
                    key={
                      category
                    }
                    className={
                      selectedCategory ===
                      category
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setSelectedCategory(
                        category
                      )
                    }
                  >
                    {
                      CATEGORY_LABELS[
                        category
                      ]
                    }
                  </button>
                )
              )}
            </div>

            {shopError && (
              <div className="bb-market-info-message">
                {
                  shopError
                }
              </div>
            )}

            {shopLoading ? (
              <div className="bb-market-loading">
                <div className="bb-market-loader" />

                <strong>
                  Shop laden...
                </strong>
              </div>
            ) : visibleItems.length ===
              0 ? (
              <div className="bb-market-empty">
                <span>
                  🚌
                </span>

                <h2>
                  Nog niets hier
                </h2>

                <p>
                  In deze categorie komen later nieuwe items.
                </p>
              </div>
            ) : (
              <div className="bb-market-products">
                {visibleItems.map(
                  (
                    item
                  ) => {
                    const owned =
                      isOwned(
                        item
                      );

                    const equipped =
                      isEquipped(
                        item
                      );

                    return (
                      <article
                        className={[
                          "bb-market-product",

                          item.featured
                            ? "featured"
                            : "",

                          equipped
                            ? "equipped"
                            : "",
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            " "
                          )}
                        key={
                          item.id
                        }
                      >
                        {item.featured && (
                          <span className="bb-market-featured">
                            GRATIS
                          </span>
                        )}

                        <div className="bb-market-product-preview">
                          {renderPreview(
                            item
                          )}
                        </div>

                        <div className="bb-market-product-content">
                          <div className="bb-market-product-title">
                            <div>
                              <h2>
                                {
                                  item.name
                                }
                              </h2>

                              <p>
                                {
                                  item.description
                                }
                              </p>
                            </div>

                            {owned && (
                              <span className="bb-market-owned">
                                ✓
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            className={[
                              "bb-market-product-button",

                              equipped
                                ? "active"
                                : "",

                              !owned
                                ? "locked"
                                : "",
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                " "
                              )}
                            onClick={() =>
                              equipItem(
                                item
                              )
                            }
                          >
                            {equipped
                              ? "✓ Actief"
                              : owned
                                ? "Gebruiken"
                                : `🔒 ${item.priceLabel}`}
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}

            <footer className="bb-market-footer">
              <span>
                🎨
              </span>

              <p>
                Licht en donker zijn altijd onderdeel van Busbaas. Alleen extra stijlen en cosmetische items kunnen premium zijn.
              </p>
            </footer>
          </div>
        </div>
      )}

      {purchaseNotice && (
        <div className="bb-market-purchase-layer">
          <div className="bb-market-purchase-box">
            <div className="bb-market-purchase-icon">
              🔒
            </div>

            <span className="bb-market-eyebrow">
              PREMIUM
            </span>

            <h2>
              {
                purchaseNotice.name
              }
            </h2>

            <strong className="bb-market-price">
              {
                purchaseNotice.priceLabel
              }
            </strong>

            <p>
              Dit item staat al klaar in de Busbaas-shop. Later koppelen we hier de echte Google Play- en App Store-aankoop aan.
            </p>

            <button
              type="button"
              onClick={() =>
                setPurchaseNotice(
                  null
                )
              }
            >
              Begrepen
            </button>
          </div>
        </div>
      )}

      {adVisible && (
        <div className="commerce-ad-layer">
          <div className="commerce-ad">
            <span className="commerce-ad-label">
              ADVERTENTIE
            </span>

            <div className="commerce-ad-placeholder">
              <div className="commerce-ad-logo">
                🚌
              </div>

              <h2>
                Advertentieplek
              </h2>

              <p>
                Hier verschijnt later na ieder potje de echte advertentie.
              </p>
            </div>

            <div className="commerce-ad-timer">
              {adCountdown >
              0 ? (
                <>
                  Verder over{" "}
                  <strong>
                    {
                      adCountdown
                    }
                  </strong>
                </>
              ) : (
                <strong>
                  Klaar ✓
                </strong>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CommerceShell;