# UPC RideConnect — Documentation Technique

## Table des matieres
1. [Architecture globale](#1-architecture-globale)
2. [Base de donnees](#2-base-de-donnees)
3. [Authentification](#3-authentification)
4. [Les 3 Intelligences](#4-les-3-intelligences)
5. [Systeme de paiement](#5-systeme-de-paiement)
6. [Carte et suivi GPS](#6-carte-et-suivi-gps)
7. [Frontend](#7-frontend)
8. [Flux utilisateur complet](#8-flux-utilisateur-complet)
9. [Notes Prisma v7](#9-notes-prisma-v7)

---

## 1. Architecture globale

### Pattern MVC (Model-View-Controller)

```
Requete HTTP
    │
    ▼
[Express Router]  →  routes/*.routes.js
    │
    ▼
[Controller]      →  controllers/*.controller.js  (validation, formatage)
    │
    ▼
[Service]         →  services/*.service.js         (logique metier)
    │
    ▼
[Prisma ORM]      →  prisma/schema.prisma          (acces BD)
    │
    ▼
[PostgreSQL]
```

Chaque couche a une responsabilite claire :
- **Routes** : definissent les endpoints HTTP et les middlewares appliques
- **Controllers** : couche mince qui extrait les parametres et appelle les services
- **Services** : contiennent toute la logique metier, les calculs, les validations
- **Prisma** : couche d'acces aux donnees avec types generes automatiquement

### Middlewares

| Middleware | Fichier | Role |
|-----------|---------|------|
| `authMiddleware` | `middleware/auth.js` | Verifie le JWT, bloque si invalide |
| `optionalAuth` | `middleware/auth.js` | Decode le JWT si present, ne bloque pas |
| `errorHandler` | `middleware/errorHandler.js` | Capture toutes les erreurs, retourne JSON |

---

## 2. Base de donnees

### Schema relationnel (9 modeles)

```
User ──────────┬── Trip ─────── Booking ─── Payment
               │      │              │
               │      ├── Rating     │
               │      │              │
               └──────┘    MeetingPoint
                              │
Neighborhood ─── NeighborhoodAdjacency
      │
      └── MeetingPoint
```

### Modeles principaux

**User** — Etudiant (conducteur et/ou passager)
- Email unique `@upc.ac.cd`, carte etudiante unique
- Role : `driver`, `passenger`, ou `both`
- Reputation calculee par moyenne bayesienne
- Compteurs : `totalTrips`, `totalEarnedFc`, `totalSavedFc`

**Neighborhood** — Quartier de Kinshasa
- 12 quartiers avec coordonnees GPS
- `zoneGroup` : centre, ouest, sud, est, est-lointain
- Relations d'adjacence bidirectionnelles avec distance en km

**Trip** — Trajet publie
- Lie a un conducteur et un quartier de depart
- Destination implicite : Campus UPC
- Statuts : `active` → `full` → `in_progress` → `completed` / `cancelled`
- `availableSeats` decremente a chaque reservation confirmee

**Booking** — Reservation
- Contrainte unique : un passager ne peut reserver qu'une fois par trajet
- Statuts : `pending` → `paid` → `confirmed` → `completed` / `cancelled`
- Lie optionnellement a un point de rencontre

**Payment** — Paiement Mobile Money
- Split automatique : 70% conducteur / 30% plateforme
- Operateurs : M-Pesa, Airtel Money, Orange Money
- Reference de transaction generee : `RC-XXXXXX`
- Simulation asynchrone (pending → processing → completed)

**Rating** — Notation
- Score 1 a 5 + commentaire optionnel
- Contrainte unique : un seul avis par paire (rater, rated) par trajet
- Uniquement apres trajet complete

---

## 3. Authentification

### Inscription
```
POST /api/auth/register
{
  "firstName": "Jean-Paul",
  "lastName": "Kabongo",
  "email": "jp.kabongo@upc.ac.cd",     // DOIT finir par @upc.ac.cd
  "studentCard": "UPC-2024-0847",
  "phone": "+243 81 111 1111",
  "role": "both",
  "password": "motdepasse123"
}
```

1. Validation email `@upc.ac.cd`
2. Hash du mot de passe avec bcryptjs (12 rounds)
3. Creation utilisateur en BD
4. Generation JWT (expire dans 7 jours)
5. Retourne `{ token, user }`

### Connexion
```
POST /api/auth/login
{ "email": "...", "password": "..." }
```

1. Recherche utilisateur par email
2. Comparaison bcrypt du hash
3. Generation nouveau JWT
4. Retourne `{ token, user }`

### JWT Payload
```json
{
  "userId": 1,
  "email": "jp.kabongo@upc.ac.cd",
  "role": "both",
  "iat": 1711411200,
  "exp": 1712016000
}
```

Le token est envoye dans le header : `Authorization: Bearer <token>`

---

## 4. Les 3 Intelligences

### 4.1 Intelligence de recherche (Scoring des trajets)

**Fichier** : `services/trip.service.js` — fonction `searchTrips()`

Quand un passager recherche un trajet, l'algorithme :

1. **Filtre par quartier** : recherche le quartier exact + quartiers adjacents (via `NeighborhoodAdjacency`)
2. **Score chaque trajet** :
   - Reputation du conducteur × 4 points
   - Place unique restante : +5 points (urgence)
3. **Trie par score decroissant**

Recherche avec adjacence :
```
Passager cherche "Lingwala"
  → Lingwala (exact)
  → Barumbu (adjacent, 1.2 km)
  → Kinshasa commune (adjacent, 1.5 km)
  → Gombe (adjacent, 2.0 km)
```

### 4.2 Intelligence de reputation (Moyenne bayesienne)

**Fichier** : `services/rating.service.js` — fonction `updateReputation()`

Formule :
```
reputation = (C × m + somme_des_notes) / (C + nombre_de_notes)

C = 3   (seuil minimum de notes)
m = 3.5 (moyenne globale par defaut)
```

**Pourquoi bayesien ?** Un conducteur avec 1 seule note de 5/5 n'a pas forcement une reputation de 5.0. La formule tire vers la moyenne globale (3.5) tant qu'il n'y a pas assez de notes. Plus il accumule de notes, plus sa reputation reflete la realite.

**Niveaux de confiance** :
| Condition | Niveau |
|-----------|--------|
| 0 notes | Nouveau |
| Reputation >= 4.0, 5+ trajets | Bon conducteur |
| Reputation >= 4.5, 10+ trajets | Conducteur de confiance |
| Reputation < 2.0 | Compte signale |

### 4.3 Intelligence geographique (Points de rencontre)

**Fichier** : `services/geo.service.js` — fonction `suggestMeetingPoint()`

**Algorithme** :
1. Recuperer tous les points de rencontre du quartier du trajet
2. Pour chaque point, calculer :
   - `distFromPassenger` = distance Haversine entre le passager et le point
   - `distFromNeighborhoodCenter` = distance Haversine entre le centre du quartier et le point
3. Score = `0.6 × distFromPassenger + 0.4 × distFromNeighborhoodCenter`
4. Le point avec le **score le plus bas** est le meilleur

**Formule de Haversine** (`utils/haversine.js`) :
```
a = sin²(dLat/2) + cos(lat1) × cos(lat2) × sin²(dLon/2)
distance = R × 2 × atan2(√a, √(1-a))
```
Ou R = 6371 km (rayon de la Terre).

**Types de points de rencontre** : rond-point, arret-bus, intersection, marche

---

## 5. Systeme de paiement

### Flux de paiement Mobile Money

```
[Passager]
    │ Choisit M-Pesa/Airtel/Orange
    │ Entre son numero
    ▼
[POST /api/payments]
    │ Calcul du split :
    │   amountFc = prix du trajet
    │   driverShareFc = prix × 0.70
    │   platformFeeFc = prix × 0.30
    │ Genere transactionRef = "RC-XXXXXX"
    │ Status = "pending"
    ▼
[Simulation asynchrone]  (setTimeout 5s en dev)
    │ Status → "processing"
    │ Status → "completed"
    ▼
[Confirmation]
    │ Booking status → "paid"
    │ Trip availableSeats -= 1
    │ User totalEarnedFc += driverShareFc
    │ Notification au conducteur
    ▼
[Frontend affiche succes]
```

### Exemple de paiement
```
Trajet : 2500 FC
├── Conducteur recoit : 1750 FC (70%)
└── Plateforme garde  : 750 FC (30%)

Reference : RC-847291
Operateur : M-Pesa
Numero    : +243 81 111 1111
```

---

## 6. Carte et suivi GPS

### Architecture (Phase 7)

**Backend** : `services/tracking.service.js`
- `getTripLocation(tripId)` : retourne la position simulee du conducteur
- `getTripRoute(tripId)` : retourne l'itineraire complet avec waypoints

**Frontend** : `js/map.js`
- Carte Leaflet.js avec tuiles OpenStreetMap (gratuit, sans cle API)
- Marqueurs personnalises par couleur (depart, point de rencontre, campus, conducteur)
- Chargement paresseux (IntersectionObserver)

### Simulation de position GPS

La position du conducteur est interpolee entre le depart et le campus :

```
Progress 0%   → Position = quartier de depart
Progress 30%  → En route vers le point de rencontre
Progress 35%  → Au point de rencontre (ramassage)
Progress 100% → Arrive au Campus UPC
```

Un bruit aleatoire de ±0.0005 degres est ajoute pour simuler un trajet reel.

### Polling temps reel
- Le frontend interroge `GET /api/trips/:id/location` toutes les 10 secondes
- En mode demo (sans backend), la simulation avance de 3% toutes les 3 secondes
- Le marqueur du conducteur se deplace fluidement sur la carte

---

## 7. Frontend

### Architecture des fichiers JS

| Fichier | Responsabilite |
|---------|---------------|
| `config.js` | Constantes : API_URL, URLs d'images placeholder |
| `api.js` | Fonction `apiCall()`, logique metier (login, register, trips, booking, payment, rating) |
| `app.js` | UI : rendu des cartes, modals, dashboard, animations, event listeners |
| `map.js` | Carte Leaflet.js, suivi GPS, marqueurs, routes |

### Mode de secours (fallback)

Toutes les fonctions API utilisent `apiCall()` qui retourne `null` si le backend est indisponible. Chaque fonction verifie le resultat et utilise des donnees locales en fallback :

```javascript
async function loadTrips() {
  const res = await apiCall('GET', '/trips');
  if (res && res.trips) {
    renderTrips(res.trips);     // Donnees reelles
  } else {
    renderTrips(TRIPS_DATA);    // Donnees demo locales
  }
}
```

### Systeme de modals
5 modals : login, register, newTrip, booking, rating
- Ouverture/fermeture via `openModal(name)` / `closeModal(name)`
- Fermeture sur clic overlay
- `switchModal(from, to)` pour basculer entre login et register

### Animations
- **fade-up** : apparition au scroll via IntersectionObserver
- **Compteurs** : animation incrementale des statistiques
- **Navbar** : classe `scrolled` ajoutee au scroll > 60px
- **Cartes de trajet** : apparition decalee (staggered)

---

## 8. Flux utilisateur complet

### Scenario : Un passager reserve un trajet

```
1. INSCRIPTION
   → Remplit le formulaire (prenom, nom, email @upc.ac.cd, carte, tel, mdp)
   → POST /api/auth/register
   → Recoit un JWT stocke dans localStorage

2. RECHERCHE
   → Tape "Lingwala" dans la barre de recherche
   → GET /api/trips/search?neighborhood=Lingwala&includeNearby=true
   → Recooit les trajets de Lingwala + quartiers adjacents, tries par score

3. RESERVATION
   → Clique "Reserver" sur un trajet
   → POST /api/bookings { tripId: 1 }
   → Le systeme verifie : places dispo ? deja reserve ?

4. PAIEMENT
   → Choisit M-Pesa, entre son numero
   → POST /api/payments { tripId: 1, operator: "M-Pesa", phoneNumber: "+243..." }
   → Simulation : pending → processing → completed (5 sec)
   → Le conducteur recoit 70%, la plateforme 30%

5. POINT DE RENCONTRE
   → GET /api/meeting-points/suggest?tripId=1
   → Recoit le point optimal (ex: "Rond-point Victoire, 07h15")

6. SUIVI GPS
   → Ouvre la carte, clique "Suivre en direct"
   → GET /api/trips/1/location (poll toutes les 10 sec)
   → Voit le marqueur du conducteur se deplacer

7. NOTATION
   → Apres le trajet, note le conducteur (1-5 etoiles + commentaire)
   → POST /api/ratings { score: 5, comment: "Excellent !" }
   → La reputation du conducteur est recalculee (bayesien)
```

---

## 9. Notes Prisma v7

Ce projet utilise **Prisma 7** qui a des differences majeures avec les versions precedentes :

### Driver Adapter obligatoire
Prisma 7 n'inclut plus de moteur binaire. Il faut un **driver adapter** :

```javascript
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
```

### URL de connexion
L'URL de la base de donnees n'est **plus dans `schema.prisma`**. Elle est configuree dans `prisma.config.ts` ou passee via le driver adapter.

### Generator
Pour un projet JavaScript (CommonJS), utiliser :
```prisma
generator client {
  provider = "prisma-client-js"    // PAS "prisma-client"
}
```

`prisma-client` (sans `-js`) genere des fichiers TypeScript uniquement.

### Packages necessaires
```json
{
  "@prisma/client": "^7.x",
  "@prisma/adapter-pg": "^7.x",
  "pg": "^8.x",
  "prisma": "^7.x"
}
```

---

## Donnees de seed

Le fichier `prisma/seed.js` cree :
- **12 quartiers** de Kinshasa avec GPS et zone
- **20+ points de rencontre** (ronds-points, arrets bus, marches, intersections)
- **17 relations d'adjacence** bidirectionnelles avec distances en km
- **1 utilisateur demo** : Jean-Paul Kabongo (`etudiant@upc.ac.cd` / `demo123`)
- **6 trajets demo** depuis differents quartiers

---

*Documentation generee pour le projet UPC RideConnect — Universite Protestante au Congo, Kinshasa, RDC.*
