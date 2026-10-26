# Product Requirements Document (PRD)

## 1. Overview

**Product Name:** lucapirrone — sito personale "La città"
**Version:** 1.0
**Date:** 2026-10-26
**Owner:** Luca Pirrone

### Executive Summary

Sito personale di Luca Pirrone, Product Engineer a Roma. Una città 3D in cui ogni edificio è un progetto (Learnn, VoxeraOS, Gestio, SmallTalk), con una versione classica equivalente e pagine progetto indicizzabili.

## 2. Product Vision & Mission

### Vision

Il portfolio di un product engineer che si ricorda: si esplora come una città, si legge come una pagina.

### Mission

Mostrare cosa costruisce Luca, da quando e con che stack, in modo memorabile ma trovabile su Google.

## 3. Problem Statement

### Current State

Il concept esiste come singolo file HTML (Three.js r128, ~520 KB) pubblicato come artifact: nessun dominio, nessuna SEO, contenuti non indicizzabili (generati in JS).

### Pain Points

- **Indicizzazione:** testo e progetti esistono solo dopo il JS, nessuna pagina per progetto.
- **Prestazioni:** loghi in base64 e motore 3D nel documento iniziale.
- **Manutenzione:** dati, aspetto e motore nello stesso file.

## 4. Goals & Success Metrics

### Primary Goals

1. Contenuti e progetti indicizzabili, con dati strutturati.
2. Esperienza 3D identica al concept, caricata senza bloccare il primo render.
3. Aggiungere un progetto = modificare solo i dati.

### Success Metrics (KPIs)

- **Lighthouse SEO:** 100 su home e pagine progetto.
- **Lighthouse Performance (mobile):** ≥ 90 su pagine progetto; LCP < 2.5 s sulla home.
- **Rich results:** Person, WebSite, SoftwareApplication validi.

## 5. Target Users

### Primary Users

**Recruiter / founder / cliente**

- Needs: capire in un minuto chi è Luca, su cosa lavora, con che stack.
- Behaviors: arriva da Google, LinkedIn o link diretto, spesso da telefono.

**Sviluppatore curioso**

- Needs: esplorare la città, entrare negli edifici, vedere architettura e timeline.

### User Journey

Ricerca o link → home (città 3D o classica) → edificio → cartello → "Entra" o pagina progetto → contatto.

## 6. Solution Overview

### Core Solution

Next.js (App Router) con pagine statiche: home con contenuto classico server-rendered e città 3D come isola client caricata dopo, una pagina statica per progetto, metadati completi, sitemap, robots, Open Graph generate.

### Key Features

#### Must-Have (P0)

1. **Città 3D:** porting del concept (viale, edifici, cartelli, interni, meteo e ora di Roma).
2. **Versione classica:** stessi dati, HTML semantico server-rendered.
3. **Pagine progetto:** `/progetti/[slug]` statiche con inizio, stack, timeline, architettura.
4. **SEO tecnica:** metadata, canonical, OG/Twitter image, JSON-LD, sitemap, robots, manifest.

#### Should-Have (P1)

1. **Contatto:** canale reale per "Proponi un progetto".
2. **Contenuti interni:** tappe e architetture riviste da Luca.

#### Could-Have (P2)

1. **Inglese:** versione `/en` con hreflang.
2. **Analytics:** PostHog o Vercel Analytics.

## 7. User Stories & Acceptance Criteria

### Epic 1: Sito Next.js dalla città 3D

**User Story 1.1:** Come visitatore voglio esplorare la città 3D sul sito così da vedere i progetti in modo memorabile.

- **AC1:** la città si comporta come il concept v17 (tappe, cartelli, Entra, interni, meteo).
- **AC2:** il primo render mostra nome e contenuti senza attendere il motore 3D.

**User Story 1.2:** Come visitatore che arriva da Google voglio una pagina per ogni progetto così da leggere i dettagli.

- **AC1:** `/progetti/[slug]` generata staticamente per ogni progetto in `content`.
- **AC2:** titolo, descrizione, canonical e OG image specifici per pagina.

**User Story 1.3:** Come motore di ricerca voglio dati strutturati e sitemap così da indicizzare il sito.

- **AC1:** JSON-LD Person + WebSite in home, SoftwareApplication + BreadcrumbList per progetto.
- **AC2:** `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` validi.

## 8. Technical Considerations

### Architecture Overview

Vedi `.pair/adoption/tech/architecture.md`.

## 9. Out of Scope

- CMS, blog, autenticazione, backend.
