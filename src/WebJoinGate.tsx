import {
  type ReactNode,
} from "react";

import {
  Capacitor,
} from "@capacitor/core";


type WebJoinGateProps = {
  children:
    ReactNode;
};


function getRoomCodeFromUrl() {
  try {
    const url =
      new URL(
        window.location.href
      );

    const pathMatch =
      url.pathname.match(
        /^\/join\/([A-Z0-9]{5})\/?$/i
      );

    const pathRoom =
      pathMatch?.[1]
        ?.toUpperCase();

    const legacyRoom =
      url.searchParams
        .get("room")
        ?.trim()
        .toUpperCase();

    const roomCode =
      pathRoom ||
      legacyRoom;

    if (
      roomCode &&
      /^[A-Z0-9]{5}$/.test(
        roomCode
      )
    ) {
      return roomCode;
    }
  } catch {
    return null;
  }

  return null;
}


function WebJoinGate({
  children,
}: WebJoinGateProps) {

  /*
   * =========================
   * NATIVE
   * =========================
   */

  if (
    Capacitor.isNativePlatform()
  ) {
    return (
      <>
        {children}
      </>
    );
  }


  /*
   * =========================
   * URL
   * =========================
   */

  const roomCode =
    getRoomCodeFromUrl();

  const url =
    new URL(
      window.location.href
    );

  const webConfirmed =
    url.searchParams
      .get("web") ===
    "1";


  /*
   * Geen join-url.
   */

  if (
    !roomCode
  ) {
    return (
      <>
        {children}
      </>
    );
  }


  /*
   * Web al gekozen.
   *
   * Dan mag App.tsx gewoon
   * zijn bestaande joinpagina
   * laten zien.
   */

  if (
    webConfirmed
  ) {
    return (
      <>
        {children}
      </>
    );
  }


  const cleanJoinUrl =
    `${window.location.origin}/join/${roomCode}`;

  const webJoinUrl =
    `${cleanJoinUrl}?web=1`;

  const appJoinUrl =
    `${cleanJoinUrl}?app=1`;


  return (
    <>
      <style>
        {`

          /*
           * =========================
           * PAGINA
           * =========================
           */

          .web-join-gate {
            position:
              relative;

            min-height:
              100dvh;

            box-sizing:
              border-box;

            display:
              flex;

            align-items:
              center;

            justify-content:
              center;

            padding:
              40px 18px 120px;

            overflow:
              hidden;

            background:
              #fff8e7;

            color:
              #1d211f;

            font-family:
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }


          /*
           * Grote gele achtergrondvorm.
           *
           * Hierdoor blijft BusBende geel
           * herkenbaar zonder dat letterlijk
           * het hele scherm felgeel is.
           */

          .web-join-gate::before {
            content:
              "";

            position:
              absolute;

            width:
              min(
                900px,
                110vw
              );

            height:
              min(
                900px,
                110vw
              );

            left:
              50%;

            top:
              -520px;

            transform:
              translateX(-50%);

            border-radius:
              50%;

            background:
              #f6c945;
          }


          /*
           * Tweede subtiele vorm.
           */

          .web-join-gate::after {
            content:
              "";

            position:
              absolute;

            width:
              280px;

            height:
              280px;

            right:
              -130px;

            bottom:
              30px;

            border-radius:
              50%;

            background:
              rgba(
                246,
                201,
                69,
                .30
              );
          }


          /*
           * =========================
           * KAART
           * =========================
           */

          .web-join-card {
            position:
              relative;

            z-index:
              2;

            width:
              min(
                100%,
                430px
              );

            box-sizing:
              border-box;

            padding:
              30px 24px 25px;

            border:
              3px solid
              #1d211f;

            border-radius:
              30px;

            background:
              #fffaf0;

            box-shadow:
              8px 8px 0
              #1d211f;

            color:
              #1d211f;

            text-align:
              center;
          }


          /*
           * =========================
           * LOGO
           * =========================
           */

          .web-join-logo {
            width:
              76px;

            height:
              76px;

            margin:
              0 auto 19px;

            display:
              grid;

            place-items:
              center;

            border:
              3px solid
              #1d211f;

            border-radius:
              23px;

            background:
              #f6c945;

            box-shadow:
              4px 4px 0
              #1d211f;

            font-size:
              38px;
          }


          .web-join-eyebrow {
            display:
              block;

            margin-bottom:
              9px;

            color:
              #1d211f;

            font-size:
              11px;

            font-weight:
              950;

            letter-spacing:
              .17em;
          }


          /*
           * Heel bewust !important,
           * omdat de bestaande BusBende
           * globale h1-stijl anders
           * de lichte kleur overneemt.
           */

          .web-join-card h1 {
            margin:
              0 !important;

            color:
              #1d211f !important;

            font-size:
              clamp(
                2.15rem,
                9vw,
                3.15rem
              ) !important;

            font-weight:
              950 !important;

            line-height:
              .96 !important;

            letter-spacing:
              -.055em !important;

            text-shadow:
              none !important;
          }


          .web-join-subtitle {
            max-width:
              330px;

            margin:
              16px auto 23px;

            color:
              #666052;

            font-size:
              .97rem;

            font-weight:
              600;

            line-height:
              1.45;
          }


          /*
           * =========================
           * KAMERCODE
           * =========================
           */

          .web-join-room {
            display:
              flex;

            align-items:
              center;

            justify-content:
              space-between;

            gap:
              16px;

            margin-bottom:
              22px;

            padding:
              14px 16px;

            border:
              2px solid
              #1d211f;

            border-radius:
              17px;

            background:
              #ffffff;

            box-shadow:
              2px 2px 0
              rgba(
                29,
                33,
                31,
                .12
              );
          }


          .web-join-room span {
            color:
              #696355;

            font-size:
              .76rem;

            font-weight:
              950;

            letter-spacing:
              .06em;

            text-transform:
              uppercase;
          }


          .web-join-room strong {
            color:
              #1d211f;

            font-size:
              1.28rem;

            font-weight:
              950;

            letter-spacing:
              .14em;
          }


          /*
           * =========================
           * KNOPPEN
           * =========================
           */

          .web-join-actions {
            display:
              grid;

            gap:
              11px;
          }


          .web-join-button {
            min-height:
              55px;

            box-sizing:
              border-box;

            display:
              flex;

            align-items:
              center;

            justify-content:
              center;

            gap:
              9px;

            padding:
              12px 18px;

            border:
              2px solid
              #1d211f;

            border-radius:
              17px;

            font-size:
              .98rem;

            font-weight:
              950;

            text-decoration:
              none;

            cursor:
              pointer;

            transition:
              transform .12s ease,
              box-shadow .12s ease,
              filter .12s ease;
          }


          .web-join-button:hover {
            filter:
              brightness(.97);
          }


          .web-join-button:active {
            transform:
              translate(
                3px,
                3px
              );

            box-shadow:
              none;
          }


          /*
           * APP KNOP
           */

          .web-join-button-app {
            background:
              #1d211f;

            color:
              #fff8e7;

            box-shadow:
              4px 4px 0
              #d99b22;
          }


          /*
           * WEB KNOP
           */

          .web-join-button-primary {
            background:
              #f6c945;

            color:
              #1d211f;

            box-shadow:
              4px 4px 0
              #1d211f;
          }


          /*
           * =========================
           * INFO
           * =========================
           */

          .web-join-browser-note {
            margin:
              18px 8px 0;

            color:
              #746d5d;

            font-size:
              .72rem;

            line-height:
              1.45;
          }


          .web-join-home {
            display:
              inline-block;

            margin-top:
              19px;

            color:
              #1d211f !important;

            font-size:
              .82rem;

            font-weight:
              900;

            text-decoration:
              underline;
          }


          /*
           * =========================
           * MOBIEL
           * =========================
           */

          @media (
            max-width:
              520px
          ) {

            .web-join-gate {
              align-items:
                flex-start;

              padding:
                max(
                  24px,
                  env(
                    safe-area-inset-top
                  )
                )
                13px
                115px;
            }


            .web-join-gate::before {
              width:
                600px;

              height:
                600px;

              top:
                -390px;
            }


            .web-join-card {
              width:
                100%;

              padding:
                25px 17px 22px;

              border-radius:
                25px;

              box-shadow:
                5px 5px 0
                #1d211f;
            }


            .web-join-logo {
              width:
                66px;

              height:
                66px;

              margin-bottom:
                17px;

              border-radius:
                20px;

              font-size:
                34px;
            }


            .web-join-card h1 {
              font-size:
                2.35rem !important;
            }


            .web-join-subtitle {
              margin-top:
                13px;

              margin-bottom:
                19px;

              font-size:
                .91rem;
            }


            .web-join-room {
              padding:
                12px 13px;
            }


            .web-join-button {
              min-height:
                52px;
            }
          }

        `}
      </style>


      <main className="web-join-gate">

        <section className="web-join-card">


          <div className="web-join-logo">
            🚌
          </div>


          <span className="web-join-eyebrow">
            BUSBENDE
          </span>


          <h1>
            Je bent uitgenodigd!
          </h1>


          <p className="web-join-subtitle">
            Doe mee met het potje via
            de BusBende-app of speel
            direct verder in je browser.
          </p>


          <div className="web-join-room">

            <span>
              Kamercode
            </span>

            <strong>
              {roomCode}
            </strong>

          </div>


          <div className="web-join-actions">


            <a
              className="
                web-join-button
                web-join-button-app
              "
              href={
                appJoinUrl
              }
              data-google-vignette="false"
            >
              📱 Open in BusBende-app
            </a>


            <a
              className="
                web-join-button
                web-join-button-primary
              "
              href={
                webJoinUrl
              }
            >
              🌐 Meespelen via web
            </a>


          </div>


          <p className="web-join-browser-note">
            Via de webversie kunnen
            advertenties worden
            weergegeven. In de app
            blijft het speelscherm vrij
            van een vaste
            advertentiebalk.
          </p>


          <a
            className="web-join-home"
            href="/"
            data-google-vignette="false"
          >
            Niet meedoen
          </a>


        </section>

      </main>
    </>
  );
}


export default WebJoinGate;