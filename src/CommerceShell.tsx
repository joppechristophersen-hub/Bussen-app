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

type ThemeMode =
  | "system"
  | "light"
  | "dark";

type ThemePalette = {
  background?: string;
  surface?: string;
  surfaceSoft?: string;
  accent?: string;
  accentStrong?: string;
  text?: string;
  muted?: string;
  border?: string;
};

type ShopEffect = {
  themeMode?: ThemeMode;
  palette?: ThemePalette;
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

const LIGHT_PALETTE: ThemePalette = {
  background:
    "#edf1ee",

  surface:
    "#ffffff",

  surfaceSoft:
    "#f3f6f4",

  accent:
    "#11866a",

  accentStrong:
    "#087158",

  text:
    "#14211c",

  muted:
    "#6f7d77",

  border:
    "#dce5e0",
};

const DARK_PALETTE: ThemePalette = {
  background:
    "#090e0c",

  surface:
    "#121916",

  surfaceSoft:
    "#1a231f",

  accent:
    "#27c99a",

  accentStrong:
    "#159975",

  text:
    "#f2f7f5",

  muted:
    "#91a09a",

  border:
    "#293630",
};

const FALLBACK_FREE_THEMES: ShopItem[] = [
  {
    id:
      "theme-auto",

    name:
      "Busbaas Automatisch",

    category:
      "themes",

    type:
      "theme",

    equipSlot:
      "theme",

    description:
      "Volgt automatisch de lichte of donkere instelling van je telefoon.",

    priceLabel:
      "Gratis",

    free:
      true,

    featured:
      true,

    effect: {
      themeMode:
        "system",
    },
  },

  {
    id:
      "theme-light",

    name:
      "Busbaas Licht",

    category:
      "themes",

    type:
      "theme",

    equipSlot:
      "theme",

    description:
      "De lichte standaardlook van Busbaas.",

    priceLabel:
      "Gratis",

    free:
      true,

    effect: {
      themeMode:
        "light",

      palette:
        LIGHT_PALETTE,
    },
  },

  {
    id:
      "theme-dark",

    name:
      "Busbaas Donker",

    category:
      "themes",

    type:
      "theme",

    equipSlot:
      "theme",

    description:
      "De donkere standaardlook van Busbaas.",

    priceLabel:
      "Gratis",

    free:
      true,

    effect: {
      themeMode:
        "dark",

      palette:
        DARK_PALETTE,
    },
  },
];

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

function readOwnedItems() {
  const standardItems = [
    "theme-auto",
    "theme-light",
    "theme-dark",
  ];

  try {
    const stored =
      localStorage.getItem(
        OWNED_STORAGE_KEY
      );

    if (!stored) {
      return standardItems;
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
      return standardItems;
    }

    const validItems =
      parsed.filter(
        (
          value
        ): value is string =>
          typeof value ===
          "string" &&
          value !==
            "theme-classic"
      );

    return [
      ...new Set([
        ...standardItems,
        ...validItems,
      ]),
    ];
  } catch {
    return standardItems;
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
          "theme-auto",
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
          "theme-auto",
      };
    }

    const oldTheme =
      parsed.theme;

    return {
      ...parsed,

      theme:
        oldTheme ===
        "theme-classic"
          ? "theme-auto"
          : oldTheme ||
            "theme-auto",
    };
  } catch {
    return {
      theme:
        "theme-auto",
    };
  }
}

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
    >(
      FALLBACK_FREE_THEMES
    );

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

  /*
   * =========================
   * LICHT / DONKER DETECTIE
   * =========================
   */

  useEffect(() => {
    const media =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

    function handleChange(
      event: MediaQueryListEvent
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

        const missingStandardThemes =
          FALLBACK_FREE_THEMES.filter(
            (standardTheme) =>
              !data.items.some(
                (item) =>
                  item.id ===
                  standardTheme.id
              )
          );

        const loadedItems = [
          ...missingStandardThemes,
          ...data.items,
        ];

        setShopItems(
          loadedItems
        );

        /*
         * Alle gratis items worden
         * automatisch bezit van de speler.
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

        setShopItems(
          FALLBACK_FREE_THEMES
        );

        setShopError(
          "De online shop kon niet worden geladen. Licht, donker en automatisch blijven beschikbaar."
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

  /*
   * =========================
   * THEMA TOEPASSEN
   * =========================
   */

  useEffect(() => {
    const selectedThemeId =
      equippedItems.theme ||
      "theme-auto";

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
          "theme-auto"
      ) ||
      FALLBACK_FREE_THEMES[0];

    const themeMode =
      selectedTheme.effect
        ?.themeMode ||
      "light";

    let actualMode:
      | "light"
      | "dark";

    let palette:
      ThemePalette;

    if (
      themeMode ===
      "system"
    ) {
      actualMode =
        systemDark
          ? "dark"
          : "light";

      palette =
        systemDark
          ? DARK_PALETTE
          : LIGHT_PALETTE;
    } else {
      actualMode =
        themeMode;

      palette =
        selectedTheme.effect
          ?.palette ||
        (
          themeMode ===
          "dark"
            ? DARK_PALETTE
            : LIGHT_PALETTE
        );
    }

    const root =
      document.documentElement;

    root.style.setProperty(
      "--bb-background",
      palette.background ||
        "#edf1ee"
    );

    root.style.setProperty(
      "--bb-surface",
      palette.surface ||
        "#ffffff"
    );

    root.style.setProperty(
      "--bb-surface-soft",
      palette.surfaceSoft ||
        "#f3f6f4"
    );

    root.style.setProperty(
      "--bb-accent",
      palette.accent ||
        "#11866a"
    );

    root.style.setProperty(
      "--bb-accent-strong",
      palette.accentStrong ||
        "#087158"
    );

    root.style.setProperty(
      "--bb-text",
      palette.text ||
        "#14211c"
    );

    root.style.setProperty(
      "--bb-muted",
      palette.muted ||
        "#6f7d77"
    );

    root.style.setProperty(
      "--bb-border",
      palette.border ||
        "#dce5e0"
    );

    root.style.colorScheme =
      actualMode;

    document.body.dataset.bbTheme =
      selectedTheme.id;

    document.body.dataset.bbColorMode =
      actualMode;
  }, [
    equippedItems.theme,
    shopItems,
    systemDark,
  ]);

  /*
   * =========================
   * KAARTSTIJL
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

        setAdVisible(
          true
        );
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
    };
  }, []);

  /*
   * =========================
   * TEST AD COUNTDOWN
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

  function getPreviewPalette(
    item: ShopItem
  ) {
    if (
      item.effect
        ?.themeMode ===
      "dark"
    ) {
      return (
        item.effect
          ?.palette ||
        DARK_PALETTE
      );
    }

    if (
      item.effect
        ?.themeMode ===
      "system"
    ) {
      return LIGHT_PALETTE;
    }

    return (
      item.effect
        ?.palette ||
      LIGHT_PALETTE
    );
  }

  function renderPreview(
    item: ShopItem
  ) {
    if (
      item.category ===
      "themes"
    ) {
      if (
        item.effect
          ?.themeMode ===
        "system"
      ) {
        return (
          <div className="commerce-theme-preview">
            <span
              style={{
                background:
                  LIGHT_PALETTE.background,
              }}
            />

            <span
              style={{
                background:
                  LIGHT_PALETTE.accent,
              }}
            />

            <span
              style={{
                background:
                  DARK_PALETTE.background,
              }}
            />

            <span
              style={{
                background:
                  DARK_PALETTE.accent,
              }}
            />
          </div>
        );
      }

      const palette =
        getPreviewPalette(
          item
        );

      return (
        <div className="commerce-theme-preview">
          <span
            style={{
              background:
                palette.background ||
                "#eeeeee",
            }}
          />

          <span
            style={{
              background:
                palette.surface ||
                "#ffffff",
            }}
          />

          <span
            style={{
              background:
                palette.accent ||
                "#11866a",
            }}
          />

          <span
            style={{
              background:
                palette.accentStrong ||
                "#087158",
            }}
          />
        </div>
      );
    }

    if (
      item.category ===
      "cards"
    ) {
      return (
        <div
          className={`commerce-card-preview commerce-card-${item.effect?.cardBack || "classic"}`}
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
        <div className="commerce-animation-preview">
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
      <div className="commerce-extra-preview">
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
          className="commerce-shop-launcher"
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
        <div className="commerce-shop-layer">
          <div className="commerce-shop">
            <header className="commerce-shop-header">
              <div>
                <span className="commerce-eyebrow">
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
                className="commerce-close"
                onClick={() =>
                  setShopOpen(
                    false
                  )
                }
              >
                ×
              </button>
            </header>

            <div className="commerce-categories">
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
              <div className="commerce-info-message">
                {
                  shopError
                }
              </div>
            )}

            {shopLoading ? (
              <div className="commerce-shop-loading">
                <div className="commerce-loader" />

                <strong>
                  Shop laden...
                </strong>
              </div>
            ) : visibleItems.length ===
              0 ? (
              <div className="commerce-empty">
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
              <div className="commerce-products">
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
                          "commerce-product",

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
                          <span className="commerce-featured">
                            STANDAARD
                          </span>
                        )}

                        <div className="commerce-product-preview">
                          {renderPreview(
                            item
                          )}
                        </div>

                        <div className="commerce-product-content">
                          <div className="commerce-product-title">
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
                              <span className="commerce-owned">
                                ✓
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            className={[
                              "commerce-product-button",

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

            <footer className="commerce-shop-footer">
              <span>
                🛍️
              </span>

              <p>
                Licht, donker en automatisch zijn altijd gratis. Extra thema's en cosmetische items kunnen later worden gekocht.
              </p>
            </footer>
          </div>
        </div>
      )}

      {purchaseNotice && (
        <div className="commerce-purchase-layer">
          <div className="commerce-purchase-box">
            <div className="commerce-purchase-icon">
              🔒
            </div>

            <span className="commerce-eyebrow">
              PREMIUM
            </span>

            <h2>
              {
                purchaseNotice.name
              }
            </h2>

            <strong className="commerce-price">
              {
                purchaseNotice.priceLabel
              }
            </strong>

            <p>
              Dit product staat al klaar in de shop. Later koppelen we hier de echte Google Play / App Store-aankoop aan.
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