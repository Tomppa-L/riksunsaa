# Tomppa – Riksun Sää

Riihimäen sää selaimessa: sää nyt, 24 tunnin tuntiennuste lämpötilakäyrineen ja 10 vuorokauden ennuste. Toimii tietokoneella ja puhelimella. Ei riippuvuuksia, ei build-vaihetta.

## Data
Kaikki säätiedot tulevat **Ilmatieteen laitoksen avoimesta datasta** (CC BY 4.0), suoraan selaimesta:
- Ennuste: Ilmatieteen laitoksen virallinen, meteorologin muokkaama ennuste (`fmi::forecast::edited::weather::scandinavia::point::simple`). Varalla HARMONIE-malli.
- Sää nyt: lähimmän sääaseman havainto (`fmi::observations::weather::simple`). Jos havaintoa ei saada, näytetään ennusteen ensimmäinen tunti.
- Säävaroitukset: linkki Ilmatieteen laitoksen varoitussivulle.

Tiedot päivittyvät 15 minuutin välein ja aina, kun sivulle palataan.

Ulkoasu, kuvakkeet ja nimi ovat omia. Sovellus ei käytä muiden sääpalveluiden sisältöä tai tuotemerkkejä.

## Puhelimeen
Avaa sivu puhelimen selaimessa ja valitse **Lisää aloitusnäytölle**. Sovellus aukeaa silloin kuin tavallinen sovellus.

## Julkaisu GitHub Pagesiin
1. Luo GitHubissa uusi repo `riksunsaa` ja työnnä tämän kansion sisältö sinne (`main`-haara).
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. Workflow `pages.yml` julkaisee `public/`-kansion. Osoite: `https://<käyttäjätunnus>.github.io/riksunsaa/`

## Paikkakunnan vaihto
Muuta `public/app.js`-tiedoston alussa `PLACE` (paikkakunnan nimi) ja `LATLON` (koordinaatit).

Lisenssi: katso LICENSE.
