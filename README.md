# UPC RideConnect — Covoiturage Universitaire

Plateforme de covoiturage intelligente pour les etudiants de l'**Universite Protestante au Congo** (Kinshasa, RDC).

---

## Apercu

UPC RideConnect permet aux etudiants de partager leurs trajets quotidiens vers le campus. Les conducteurs publient leurs trajets, les passagers reservent et paient via Mobile Money (M-Pesa, Airtel Money, Orange Money).

**Fonctionnalites principales :**
- Inscription/connexion avec email universitaire `@upc.ac.cd`
- Publication et recherche de trajets avec scoring intelligent
- Reservation + paiement Mobile Money (simulation)
- Systeme de notation avec reputation bayesienne
- Points de rencontre optimises par geolocalisation (Haversine)
- Carte interactive Leaflet.js avec suivi GPS en temps reel
- Dashboard conducteur/passager
- Notifications en temps reel

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | HTML5 + Tailwind CSS (CDN) + Vanilla JS |
| **Backend** | Node.js + Express 5 |
| **Base de donnees** | PostgreSQL + Prisma 7 ORM |
| **Auth** | JWT (jsonwebtoken) + bcryptjs |
| **Carte** | Leaflet.js (OpenStreetMap) |
| **Paiement** | Simulation Mobile Money |

---

## Structure du projet

```
esther/
├── README.md                          # Ce fichier
├── DOCUMENTATION.md                   # Documentation technique detaillee
└── RIDE-STUDENT/
    ├── frontend/                      # Application web (SPA)
    │   ├── index.html                 # Page principale
    │   ├── css/style.css              # Styles personnalises
    │   └── js/
    │       ├── config.js              # Configuration (API_URL, placeholders)
    │       ├── api.js                 # Couche API + logique metier
    │       ├── app.js                 # UI, modals, animations
    │       └── map.js                 # Carte Leaflet.js + suivi GPS
    │
    └── upc-rideconnect-api/           # Backend API REST
        ├── .env                       # Variables d'environnement
        ├── package.json
        ├── prisma/
        │   ├── schema.prisma          # Schema base de donnees (9 modeles)
        │   ├── prisma.config.ts       # Config Prisma v7
        │   └── seed.js                # Donnees initiales (quartiers, demo)
        └── src/
            ├── server.js              # Point d'entree Express
            ├── config/
            │   ├── database.js        # Instance Prisma (driver adapter PG)
            │   └── constants.js       # Constantes (quartiers, campus, etc.)
            ├── middleware/
            │   ├── auth.js            # JWT middleware
            │   ├── validate.js        # Validation
            │   └── errorHandler.js    # Gestion d'erreurs globale
            ├── routes/                # Definition des routes
            ├── controllers/           # Controleurs (thin wrappers)
            └── services/              # Logique metier
                ├── auth.service.js
                ├── trip.service.js
                ├── booking.service.js
                ├── payment.service.js
                ├── rating.service.js
                ├── geo.service.js
                ├── notification.service.js
                └── tracking.service.js
```

---

## Installation et demarrage

### Prerequis

- **Node.js** >= 18
- **PostgreSQL** >= 14
- **npm** ou **yarn**

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd esther
```

### 2. Configurer la base de donnees

```bash
# Creer la base PostgreSQL
createdb upc_rideconnect
```

### 3. Installer les dependances backend

```bash
cd RIDE-STUDENT/upc-rideconnect-api
npm install
```

### 4. Configurer l'environnement

Creer (ou modifier) le fichier `.env` :

```env
DATABASE_URL="postgresql://VOTRE_USER@localhost:5432/upc_rideconnect?schema=public"
JWT_SECRET="votre-secret-jwt-tres-long-et-securise"
PORT=3000
```

### 5. Appliquer les migrations et seeder

```bash
npx prisma migrate dev --name init
npm run db:seed
```

Cela cree :
- 12 quartiers de Kinshasa avec coordonnees GPS
- 20+ points de rencontre (ronds-points, arrets bus, carrefours)
- Donnees d'adjacence entre quartiers
- 1 utilisateur demo : `etudiant@upc.ac.cd` / `demo123`
- 6 trajets de demonstration

### 6. Demarrer le serveur

```bash
npm run dev
```

Le serveur demarre sur `http://localhost:3000` :
- **Frontend** : http://localhost:3000
- **API** : http://localhost:3000/api
- **Health check** : http://localhost:3000/api/health

---

## Endpoints API

### Authentification
| Methode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/auth/register` | Inscription (email @upc.ac.cd obligatoire) |
| `POST` | `/api/auth/login` | Connexion (retourne JWT) |
| `GET` | `/api/auth/me` | Profil utilisateur connecte |

### Trajets
| Methode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/trips` | Lister les trajets actifs |
| `GET` | `/api/trips/search` | Recherche intelligente (quartier, adjacent) |
| `GET` | `/api/trips/:id` | Details d'un trajet |
| `POST` | `/api/trips` | Publier un trajet (auth) |
| `PATCH` | `/api/trips/:id/status` | Changer le statut (auth) |
| `GET` | `/api/trips/:id/location` | Position GPS du conducteur |
| `GET` | `/api/trips/:id/route` | Itineraire complet avec waypoints |

### Reservations
| Methode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/bookings` | Reserver un trajet (auth) |
| `GET` | `/api/bookings` | Mes reservations (auth) |
| `PATCH` | `/api/bookings/:id/cancel` | Annuler (auth) |

### Paiements
| Methode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/payments` | Initier un paiement Mobile Money |
| `GET` | `/api/payments/:id/status` | Verifier le statut |

### Notations
| Methode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/ratings` | Noter un conducteur/passager (auth) |
| `GET` | `/api/ratings/user/:id` | Notes d'un utilisateur |

### Points de rencontre
| Methode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/meeting-points/suggest` | Suggestion optimale (score geo) |
| `GET` | `/api/meeting-points/:neighborhoodId` | Points par quartier |

### Dashboard
| Methode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/dashboard/stats` | Statistiques utilisateur |

### Notifications
| Methode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/notifications` | Mes notifications (auth) |
| `PATCH` | `/api/notifications/:id/read` | Marquer comme lu |

---

## Mode Demo

Le frontend fonctionne **avec ou sans backend**. Sans backend :
- Les donnees de demonstration locales sont utilisees
- L'inscription/connexion fonctionne en mode simule
- La carte affiche les quartiers et simule le suivi GPS

Identifiants demo : `etudiant@upc.ac.cd` / `demo123`

---

## Scripts disponibles

```bash
npm start          # Demarrer en production
npm run dev        # Demarrer avec auto-reload (--watch)
npm run db:migrate # Appliquer les migrations Prisma
npm run db:seed    # Seeder la base de donnees
npm run db:reset   # Reset complet (attention: supprime les donnees)
npm run db:studio  # Interface graphique Prisma Studio
```

---

## Quartiers couverts

| Quartier | Zone | Coordonnees |
|----------|------|-------------|
| Lingwala | Centre | -4.3167, 15.3000 |
| Barumbu | Centre | -4.3200, 15.3100 |
| Kinshasa (commune) | Centre | -4.3250, 15.3150 |
| Gombe | Ouest | -4.3100, 15.2900 |
| Ngaliema | Ouest | -4.3250, 15.2500 |
| Kalamu | Centre-Sud | -4.3350, 15.3150 |
| Lemba | Sud | -4.3500, 15.3300 |
| Limete | Est | -4.3400, 15.3350 |
| Makala | Sud | -4.3600, 15.3000 |
| Ndjili | Est-lointain | -4.3750, 15.3700 |
| Masina | Est-lointain | -4.3600, 15.3800 |
| Kimbanseke | Est-lointain | -4.3900, 15.3500 |

**Destination** : Campus UPC (-4.3222, 15.3125)

---

## Securite

- Mots de passe hashes avec **bcryptjs** (12 rounds)
- Authentification via **JWT** (expiration 7 jours)
- Validation des emails universitaires `@upc.ac.cd`
- Helmet.js pour les headers HTTP securises
- CORS configure pour les origines autorisees
- Middleware d'erreurs centralise (pas de stack traces en prod)

---

## Licence

Projet academique — Universite Protestante au Congo, Kinshasa, RDC.
# ride
