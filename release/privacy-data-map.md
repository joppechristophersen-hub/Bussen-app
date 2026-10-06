# Privacy-/gegevensformulier: technische invulhulp

Dit is een technische inventaris, geen ingediend storeformulier. Controleer de uiteindelijke antwoorden tegen de actuele SDK-configuratie, hosting en accountinstellingen.

| Onderdeel | In de broncode vastgesteld | Te beoordelen in de store |
| --- | --- | --- |
| Multiplayer | Spelersnaam, kamercode, socket-ID en spelhandelingen gaan via HTTPS/WSS naar bussen-server.onrender.com. Spelersnamen/spelstatus worden zichtbaar voor andere kamerleden. | Door gebruiker opgegeven naam/pseudoniem, app-activiteit, functioneel gebruik; bepaal de toepasselijke categorieën. |
| Serverbewaring | Kamers staan in servergeheugen; de kamer wordt verwijderd bij host-disconnect. | Controleer apart Render-/proxy-/toegangslogs en bewaartermijnen. Niet claimen dat er nergens logs zijn. |
| Lokale instellingen | Geluid, uiterlijk/shopselecties en privacykeuze worden lokaal opgeslagen. | Alleen lokale gegevens zijn anders dan gegevens die naar een server worden verzonden. |
| Google Mobile Ads | SDK in de Android-/iOS-app; productie-interstitials, niet-gepersonaliseerde aanvraag (npa), UMP-consentcontrole. | Google meldt dat de SDK IP-adres, interacties, diagnostiek en apparaat-/account-ID's kan verzamelen en delen. Niet-gepersonaliseerd betekent niet gegevensvrij. |
| Web | AdSense-loader en display-advertentie op het eindscherm op busbende.nl. | Website-goedkeuring en gecertificeerd Google/CMP-privacybericht controleren. De lokale app-popup vervangt geen Google-gecertificeerde CMP. |
| Accounts/aankopen | Geen eigen accountregistratie en geen werkende betalingen; betaalde shopitems geblokkeerd. | Formulieren invullen op basis van deze versie, niet op toekomstige plannen. |

De Android-manifestmerge bevat advertentie-ID-permissies vanuit de advertentie-SDK. Er is geen eigen GPS-, contacten- of camerafunctie gevonden. QR-codes worden weergegeven; de app vraagt niet zelf om cameratoegang.

Publiceer/controleer het Europese privacybericht in zowel AdMob als AdSense voor de juiste app/site. Controleer op echte apparaten dat toestemming vragen, weigeren en privacykeuzes aanpassen werken. In iOS moet de feitelijke tracking-/ATT-configuratie samen met de Google-SDK worden gecontroleerd; alleen een gebruiksbeschrijving in Info.plist is geen bewijs dat deze stroom getest is.

Privacybeleid: https://busbende.nl/privacy/
Privacycontact: info@busbende.nl

Bronnen:
- https://developers.google.com/admob/android/privacy/play-data-disclosure
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/app-store/user-privacy-and-data-use/
