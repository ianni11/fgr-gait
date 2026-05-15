# FGR · GAIT Analysis

Tool di analisi biomeccanica della corsa per ASD Foggia Running.  
Hostato su GitHub Pages · Backend API su Aruba (`foggiarunning.it/gare/api/`)

## Stack

- **Frontend:** React 18 + Vite 5
- **Pose detection:** MediaPipe Pose (33 keypoint, via CDN)
- **Hosting:** GitHub Pages (deploy automatico via Actions)
- **Auth:** Bearer token FGR (sessionStorage)
- **Font:** Barlow Condensed + Barlow + JetBrains Mono

## Funzionalità

- Caricamento video (MP4/MOV/AVI) o webcam live
- Skeleton overlay real-time con 33 keypoint
- 7 angoli articolari con alert verde/giallo/rosso
- **Grafico a corsie parallele** scorrevole per tutti gli angoli
- **Campionamento automatico** ogni 2 secondi (media + SD + min/max)
- **Report post-sessione** con distribuzione statistica, frame catturati, timeline
- Login con account FGR + salvataggio su DB Aruba
- Modalità guest (senza salvataggio)
- Compatibile con WebView Flutter (`window.fgrToken` injection)

## Setup locale

```bash
npm install
npm run dev
```

## Deploy su GitHub Pages

1. Creare repo `fgr-gait` su GitHub
2. Andare in **Settings → Pages → Source: GitHub Actions**
3. Push su `main` → il workflow `.github/workflows/deploy.yml` builda e deploya
4. URL finale: `https://[username].github.io/fgr-gait/`

## Configurazione `vite.config.js`

```js
base: '/fgr-gait/'  // deve corrispondere al nome del repo GitHub
```

## Sicurezza

- CORS su API Aruba: whitelist `github.io` + `foggiarunning.it`
- Token in `sessionStorage` (non `localStorage`)
- Rate limiting login: tabella `gare_login_attempts`
- IDOR protection: ogni query filtra per `user_id` autenticato
- HTTPS forzato su Aruba via `.htaccess`

## Backend PHP richiesto (Aruba)

- `login.php` — autenticazione, ritorna Bearer token
- `save_gait_session.php` — salva sessione su `gare_gait_reports`
- `get_gait_reports.php` — lista report per utente
- `get_gait_report_detail.php` — dettaglio singolo report

## Integrazione Flutter (WebView)

```dart
controller.runJavaScript(
  "window.fgrToken = '${authProvider.token}'; window.fgrUsername = '${user.username}';"
);
```

## Evoluzione futura

- **Fase 2:** integrazione Claude AI (`ai_gait_analyze.php`) con quota per utente
- **Fase 3:** benchmarking pool FGR (dopo 50+ sessioni reali)
- **Fase 4:** sistema di apprendimento continuo (RAG + feedback infortuni)
- **Kiosk mode:** sessione collettiva con claim code (tabella `gare_gait_pending`)
