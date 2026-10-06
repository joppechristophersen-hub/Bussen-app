# Release voorbereiden

App-ID: com.busbende.game. Huidige eerste release: 1.0, buildcode 1. Verhoog de buildcode zodra een eerdere upload met die code bestaat.

## Android bouwen

- `npm run android:test`: vernieuwt de webcode/Android-assets en bouwt een debug-APK.
- `npm run android:release`: vernieuwt de assets en bouwt een ondertekende release-AAB.
- Beide gebruiken Java 21 en schrijven naar de genegeerde map release-artifacts.
- `scripts/build-android.ps1 -Variant Release -OutputDirectory <map>` kiest een andere uitvoermap.

Releaseondertekening gebruikt een bestaande lokale `.release-signing/busbende-upload.p12` plus de Windows-versleutelde `.release-signing/credentials.xml`, of de vier omgevingsvariabelen BUSBENDE_KEYSTORE_PATH, BUSBENDE_KEYSTORE_PASSWORD, BUSBENDE_KEY_ALIAS, BUSBENDE_KEY_PASSWORD. De releasebuild weigert een ontbrekende uploadconfiguratie; geen fallback naar de debugkey.

De credentials.xml is met Windows DPAPI gekoppeld aan het oorspronkelijke Windows-account én apparaat. Bewaar de uploadkeystore en het wachtwoord ook veilig buiten deze computer, bijvoorbeeld de keystore op een beveiligde backup en het wachtwoord in je wachtwoordmanager. Een kopie van credentials.xml alleen is geen overdraagbare wachtwoordbackup. Plaats geen sleutels/wachtwoorden in Git of in een gedeeld releasepakket. Het publieke PEM-certificaat kan wel worden gedeeld.

Lees het wachtwoord uitsluitend lokaal voor een backup in je wachtwoordmanager, zonder het hier te delen:

```powershell
$credential = Import-Clixml .release-signing/credentials.xml
$credential.GetNetworkCredential().Password
```

## Native bronbestanden in Git

De Gradle-wrapper, projectconfiguratie, MainActivity, iOS-bronnen en iconen moeten mee voor reproduceerbare builds. Gegenereerde webassets, caches, local.properties, signing, APK/AAB en IDE-gebruikersgegevens moeten buiten Git blijven. Gebruik de meegeleverde gerichte git-add-lijst; neem archive/ en rcApp.tsx niet mee.

## iOS

De bronbestanden en Swift Package-configuratie zijn aanwezig. Een iOS-archive en signing vereisen macOS/Xcode en jouw Apple-team. Deze kunnen op deze Windows-machine niet worden bevestigd. Open na npm install/build en npx cap sync ios het Xcode-project, stel het signing-team in en test op een iPhone.

## Open bij de eigenaar

- Play Console/App Store-account, storevermelding, privacy-/leeftijdsformulieren en accountgebonden testvereisten.
- AdMob-storekoppeling, app-ads.txt-verificatie en appbeoordeling.
- AdSense-goedkeuring, siteprivacybericht en automatische advertenties uit als uitsluitend eindschermadvertenties gewenst zijn.
- Toesteltests en echte store-screenshots.
- Bewaar een veilige backup van uploadkey en wachtwoord.

Er wordt door de scripts niets naar GitHub of een store gepubliceerd.
