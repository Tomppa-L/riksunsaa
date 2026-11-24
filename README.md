# Tomppa – Riksun Sää

Riihimäen sää selaimessa: sää nyt, säävaroitukset, 24 tunnin tuntiennuste lämpötilakäyrineen, 10 vuorokauden ennuste ja pikalinkit sadetutkaan. Vaalea ja tumma teema. Toimii tietokoneella ja puhelimella. Ei riippuvuuksia, ei build-vaihetta.

**Sovellus:** https://tomppa-l.github.io/riksunsaa/

---

## Tee oman kaupunkisi sääsovellus

Tästä saa kuka tahansa tehtyä oman paikkakuntansa sääsovelluksen. Ohjelmointitaitoa ei tarvita: kaikki tehdään GitHubin verkkosivulla, ja muutettavat asiat ovat yhdessä paikassa.

### Saat muuttaa nimen ja kaiken muunkin
Sovellus on julkaistu **MIT-lisenssillä**. Saat vapaasti kopioida sen, muuttaa sitä, antaa sille oman nimen ja julkaista sen omana sovelluksenasi. Voit esimerkiksi nimetä sen **Jaska – Äänekosken Sää**. Tomppaa ei tarvitse mainita sovelluksessa.

Kaksi asiaa pitää säilyttää:
1. **`LICENSE`-tiedosto** repossa sellaisenaan. MIT-lisenssi edellyttää, että alkuperäinen tekijänoikeusmerkintä pysyy mukana koodissa.
2. **Lähdemaininta** sovelluksen alareunassa: *Lähde: Ilmatieteen laitos, avoin data (CC BY 4.0)*. Ilmatieteen laitoksen avoimen datan lisenssi vaatii, että datan lähde kerrotaan.

### 1. Kopioi sovellus omaksesi
1. Luo GitHub-tunnus osoitteessa https://github.com, jos sinulla ei vielä ole sitä.
2. Avaa https://github.com/Tomppa-L/riksunsaa ja paina oikealta ylhäältä **Fork**.
3. Kirjoita **Repository name** -kenttään oma nimesi repolle, esim. `aanekoskensaa`. Käytä vain pieniä kirjaimia ilman ääkkösiä ja välilyöntejä, koska nimestä tulee osa sovelluksen osoitetta. Paina **Create fork**.

### 2. Muuta asetukset
Avaa omassa repossasi tiedosto **`public/app.js`** ja paina kynäkuvaketta (**Edit this file**). Tiedoston alussa on `OMAT ASETUKSET` -lohko. Muuta sitä, ja jätä muu koodi ennalleen.

Esimerkki Äänekoskelle:
```js
const CONFIG = {
  appName: 'Jaska – Äänekosken Sää',
  place: 'Äänekoski',
  placeIn: 'Äänekoskella',
  latlon: '62.6046,25.7262',
  warningAreas: ['äänekoski', 'keski-suomi'],
  radarUrl: 'https://www.ilmatieteenlaitos.fi/sade-ja-pilvialueet',
};
```

| Asetus | Mitä siihen laitetaan |
|---|---|
| `appName` | Sovelluksen nimi. Viimeinen sana näkyy sinisenä. |
| `place` | Paikkakunnan nimi Ilmatieteen laitoksen haussa, esim. `Äänekoski`, `Oulu` tai `Helsinki Kallio`. |
| `placeIn` | Sama paikkakunta *missä*-muodossa: `Äänekoskella`, `Oulussa`, `Kalliossa`. |
| `latlon` | Paikkakunnan koordinaatit muodossa `leveysaste,pituusaste`. Saat ne Google Mapsista: paina karttaa hiiren oikealla napilla, niin koordinaatit näkyvät valikon ylimpänä. Kopioi ne ja vaihda pilkun jälkeinen välilyönti pois. |
| `warningAreas` | Säävaroitusten alueet **pienillä kirjaimilla**: oma kunta ja maakunta, esim. `['äänekoski', 'keski-suomi']`. |
| `radarUrl` | Linkki Ilmatieteen laitoksen sadetutkaan. Avaa ilmatieteenlaitos.fi → Sade- ja pilvialueet, valitse oma alueesi ja kopioi selaimen osoiterivi tähän. |

Paina lopuksi **Commit changes**.

Vaihda vielä nimi tiedostoihin **`public/manifest.json`** (kentät `name`, `short_name` ja `description`) ja **`public/index.html`** (rivit `<title>` ja `<meta name="description">`). Nämä näkyvät, kun sovellus lisätään puhelimen aloitusnäytölle tai jaetaan linkkinä.

### 3. Julkaise sovellus
1. Avaa omassa repossasi **Actions**-välilehti. GitHub kysyy kopioiduissa repoissa luvan ajaa workflowt: paina **I understand my workflows, go ahead and enable them**.
2. Avaa **Settings → Pages** ja valitse kohdassa **Source** vaihtoehto **GitHub Actions**.
3. Palaa **Actions**-välilehdelle, valitse **Deploy to GitHub Pages** ja paina **Run workflow**.
4. Kun ajo näyttää vihreää ✓, sovelluksesi on osoitteessa `https://<käyttäjätunnuksesi>.github.io/<repon-nimi>/`, esim. `https://jaska.github.io/aanekoskensaa/`.

Valmista. Jokainen tämän jälkeen tekemäsi muutos julkaistaan automaattisesti noin minuutissa.

### Jos jokin ei toimi
- **Punainen virheilmoitus säätiedoista:** tarkista `place` ja `latlon`. Koordinaateissa erottimena on piste ja lukujen välissä pilkku ilman välilyöntiä.
- **Varoituspalkissa lukee vain "Säävaroitukset Ilmatieteen laitokselta":** varoitukset haetaan puolen tunnin välein, joten odota hetki. Tarkista, että Actions on otettu käyttöön (kohta 3.1).
- **Muutos ei näy:** paina sivulla Ctrl+Shift+R. Jos muutat `style.css`- tai `app.js`-tiedostoa, kasvata `index.html`-tiedostossa niiden perässä olevaa numeroa (`?v=4` → `?v=5`), niin selaimet hakevat uuden version.

---

## Data
Kaikki säätiedot tulevat **Ilmatieteen laitoksen avoimesta datasta** (CC BY 4.0):
- Ennuste: Ilmatieteen laitoksen virallinen, meteorologin muokkaama ennuste (`fmi::forecast::edited::weather::scandinavia::point::simple`). Varalla HARMONIE-malli.
- Sää nyt: lähimmän sääaseman havainto (`fmi::observations::weather::simple`). Jos havaintoa ei saada, näytetään ennusteen ensimmäinen tunti.
- Säävaroitukset: Ilmatieteen laitoksen CAP-varoitussyöte (`alerts.fmi.fi`). Syöte ei salli suoraa hakua selaimesta, joten julkaisu-workflow hakee sen puolen tunnin välein tiedostoksi `warnings.xml` ja julkaisee sivun uudelleen. Näytetään varoitukset, joiden alue on asetuksissa annettu kunta tai maakunta tai joiden alueeseen paikkakunnan koordinaatit osuvat. GitHub pysäyttää ajastetut ajot, jos repoon ei ole tehty muutoksia 60 päivään. Ajastuksen saa takaisin päälle Actions-välilehdeltä.
- Sadetutka: linkit Ilmatieteen laitoksen tutkaan ja Sataako.fi:hin. Ilmatieteen laitoksen WMS-karttapalvelua ei saa käyttää suoraan sovelluksissa, joten tutkakuvaa ei upoteta sivulle.

Tiedot päivittyvät 15 minuutin välein ja aina, kun sivulle palataan. Yöllä sääkuvakkeissa näkyy kuu. Yö lasketaan auringon asemasta paikkakunnan koordinaateissa, joten se toimii myös kaamoksessa ja yöttömän yön aikaan.

Ulkoasu, kuvakkeet ja nimi ovat omia. Sovellus ei käytä muiden sääpalveluiden sisältöä tai tuotemerkkejä.

## Teema
Sovellus seuraa laitteen tummaa tai vaaleaa asetusta. Kuu- tai aurinkonapista teeman voi vaihtaa itse, ja valinta muistetaan.

## Puhelimeen
Avaa sivu puhelimen selaimessa ja valitse **Lisää aloitusnäytölle**. Sovellus aukeaa silloin kuin tavallinen sovellus.

Lisenssi: MIT, katso LICENSE.
