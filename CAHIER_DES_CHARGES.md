# Cahier des Charges — Application de Gestion des Paiements Fournisseurs

## 1. Présentation Générale

**Projet :** Plateforme interne de suivi et de gestion des paiements fournisseurs  
**Client :** JETA GROUPE (holding regroupant les filiales AFS, Bloom Énergie, JETA Engineering, LRC)  
**Version :** 2.0.0  
**Langue de l'interface :** Français  
**Devise :** XAF (Franc CFA d'Afrique Centrale)

L'application centralise la gestion des **paiements**, **factures fournisseurs** et le **lettrage comptable** au sein d'une interface web monopage (SPA).

---

## 2. Objectifs

- Centraliser le suivi de l'ensemble des paiements émis par les filiales
- Gérer le cycle de vie des factures fournisseurs (création → lettrage → soldée)
- Permettre le lettrage (rapprochement) entre factures et paiements
- Fournir des indicateurs de pilotage et des exports CSV
- Générer des reçus de paiement au format PDF
- Assurer la traçabilité des opérations (codes auto-générés, horodatage)

---

## 3. Fonctionnalités par Module

### 3.1 Modules Principaux

#### 3.1.1 Tableau de Bord / Paiements (`/`)

**Objectif :** Visualiser, filtrer, créer, modifier, dupliquer et supprimer les paiements.

- **Cartes statistiques :**
  - Total paiements (count)
  - Montant total toutes filiales
  - Montant total par type de paiement (Cash, Chèque, Virement, Traite, Mise à disposition)
  - Montant en banque / en caisse
  - Montant en attente de validation

- **Graphiques dynamiques :**
  - Répartition par type de paiement (donut)
  - Répartition par filiale (barres)
  - Évolution mensuelle des montants (courbe)

- **Tableau des paiements :**
  - Pagination (10 lignes/page)
  - Recherche textuelle avec debounce
  - Filtres combinés : filiale, fournisseur, type, statut, période
  - Colonnes : Code paiement, Date, Filiale émettrice, Fournisseur / Filiale réceptrice, Montant, Type, Référence, Statut
  - Tri par colonne
  - Bouton d'action : Modifier, Dupliquer, Supprimer
  - Bouton d'impression PDF (reçu de paiement)
  - Ligne extensible affichant les factures lettrées + notes

#### 3.1.2 Factures Fournisseurs (`/factures`)

**Objectif :** Gérer les factures reçues des fournisseurs.

- **Génération automatique du code facture** au format `FAC-YYYYMMDD-XXXX` (incrément journalier)
- **CRUD complet :**
  - Code facture (lecture seule pour les nouvelles)
  - Fournisseur (sélecteur)
  - Filiale (sélecteur)
  - Date facture, date échéance
  - Montant TTC
  - Référence externe, notes
  - Statut (Impayée, Partiellement payée, Payée, Annulée)
- **Barre de progression** visuelle du ratio payé / total
- **Bouton "Payer"** : ouvre le formulaire de paiement avec la facture pré-sélectionnée
- **Protection contre la modification** : une facture liée à un paiement ne peut plus être modifiée tant que le lien n'est pas supprimé
- **Filtres :** statut, recherche textuelle
- **Pagination :** 15 lignes/page

#### 3.1.3 Grand Livre & Lettrage (`/grand-livre`, `/grand-livre/:fournisseurId`)

**Objectif :** Visualiser le grand livre comptable d'un fournisseur et lettrer les factures.

- **Sélection du fournisseur** : grille de tous les fournisseurs si accès sans ID
- **Vue chronologique** de toutes les écritures (factures et paiements) triées par date
- **Écritures comptables :**
  - Facture → Crédit (le fournisseur nous facture, son compte est crédité)
  - Paiement → Débit (on paie, son compte est débité)
  - Solde courant = cumul Crédits - cumul Débits
- **Cartes récapitulatives :** Total Débit, Total Crédit, Solde, Lettrage (X / Y factures lettrées)
- **Filtre par période**
- **Lettrage par lots :**
  - Cases à cocher sur chaque ligne (facture et/ou paiement)
  - Barre flottante récapitulative : nombre de factures + montant crédit, nombre de paiements + montant débit
  - Indicateur "Équilibré" si totaux égaux
  - Algorithme FIFO : les paiements sélectionnés sont alloués aux factures les plus anciennes en priorité
  - Mise à jour automatique du montant_paye et du statut de chaque facture
- **Colonne `lettre`** : booléen indiquant si la facture est lettrée (indépendant du paiement)

#### 3.1.4 Rapports & Analyses (`/rapports`)

**Objectif :** Analyser les données et exporter.

- **Cartes statistiques :** Total périodique, par type, par filiale
- **Graphique d'évolution mensuelle**
- **Ventilations avec pourcentage :**
  - Par filiale
  - Par fournisseur
  - Par type de paiement
- **Export CSV :** par section (filiale, fournisseur, type) + export master de tous les paiements filtrés
- **Derniers 10 paiements** en table récapitulative

#### 3.1.5 Filiales (`/filiales`)

**Objectif :** Gérer les entités juridiques du groupe.

- **CRUD complet** (carte avec dégradé par filiale)
- **Gestion des comptes bancaires** par filiale (liste extensible)
- **Statistiques de paiement** par filiale
- **Suppression avec confirmation** (cascade sur comptes)

#### 3.1.6 Fournisseurs (`/fournisseurs`)

**Objectif :** Gérer les fournisseurs.

- **CRUD complet** (carte avec informations de contact)
- **Gestion des comptes bancaires** par fournisseur
- **Statistiques factures** (nombre, montant impayé)
- **Lien "Grand Livre"** par fournisseur → navigation directe vers le grand livre

#### 3.1.7 Bénéficiaires (`/beneficiaires`)

**Objectif :** Gérer les bénéficiaires externes (non fournisseurs).

- **CRUD complet** (table)
- **Copie du RIB** dans le presse-papier
- **Recherche** avec debounce

---

### 3.2 Fonctionnalités Transverses

#### 3.2.1 Formulaire de Paiement (`PaiementForm`)

- **Code paiement auto-généré** au format `PAY-{CODE_FILIALE}-{YYYYMMDD}-{XXX}`
- **Type :** Paiement simple (fournisseur) ou Inter-filiale
- **Sélection du mode de paiement :** Cash, Chèque, Virement, Traite, Mise à disposition
- **Compte bancaire** dynamique selon la filiale et le type
- **Liaison aux factures :** cases à cocher pour lettrer avec une ou plusieurs factures impayées du fournisseur
- **Duplication :** pré-remplit toutes les données depuis un paiement existant, nouveau code généré

#### 3.2.2 Reçu PDF (`generateReceipt`)

- Généré via jsPDF + jspdf-autotable
- En-tête JETA GROUPE avec logo
- Coordonnées de l'émetteur et du bénéficiaire
- Tableau détaillé du paiement
- Montant en lettres (français)
- Coordonnées bancaires
- Zone de signature

#### 3.2.3 Lettrage Automatique

- **Principe :** allouer des paiements à des factures en respectant l'ordre chronologique (FIFO)
- **Algorithme :**
  1. Trier les factures sélectionnées par date (ancienne → récente)
  2. Trier les paiements sélectionnés par date
  3. Pour chaque facture, appliquer les paiements disponibles jusqu'à solder la facture
  4. Le reste d'un paiement passe à la facture suivante
  5. La dernière facture peut être partiellement réglée (montant_paye < montant)
- **Colonne `montant` sur `paiement_factures`** : permet de tracer le montant unitaire alloué à chaque liaison (support du lettrage partiel)
- **Mise à jour en cascade :** après lettrage, `montant_paye` et `statut` de chaque facture sont recalculés

---

## 4. Architecture Technique

### 4.1 Stack

| Technologie | Version | Rôle |
|---|---|---|
| React 18 | ^18.3.1 | Framework UI |
| TypeScript | ^5.5.3 | Typage statique |
| Vite | ^5.4.2 | Bundler / dev server |
| React Router v7 | ^7.18.1 | Routage client |
| Supabase JS | ^2.57.4 | Client BDD / API REST |
| Tailwind CSS | ^3.4.1 | Styles utilitaires |
| Recharts | ^3.9.0 | Graphiques |
| jsPDF | ^4.2.1 | Génération PDF |
| Lucide React | ^0.344.0 | Icônes |
| date-fns | ^4.4.0 | Manipulation dates |

### 4.2 Base de Données (PostgreSQL via Supabase)

**8 tables :**

| Table | Description |
|---|---|
| `filiales` | Entités du groupe (AFS, Bloom, JETA, LRC) |
| `banques` | Banques partenaires |
| `fournisseurs` | Fournisseurs avec coordonnées |
| `comptes_bancaires` | Comptes liés aux filiales/fournisseurs |
| `factures` | Factures fournisseurs avec statut et lettrage |
| `paiements` | Paiements émis |
| `paiement_factures` | Table de liaison N:N (paiement → facture) avec montant unitaire |
| `beneficiaires` | Bénéficiaires externes (RIB) |

### 4.3 Sécurité

- **RLS (Row Level Security) :** toutes les tables ont des politiques ouvertes aux rôles `anon` et `authenticated` (application interne monoposte / petit groupe)
- **CLI :** aucune authentification utilisateur requise

---

## 5. Règles de Gestion

### 5.1 Codes Automatiques

| Entité | Format | Règle |
|---|---|---|
| Paiement | `PAY-{FILIALE}-{YYYYMMDD}-{XXX}` | Incrément journalier par filiale |
| Facture | `FAC-{YYYYMMDD}-{XXXX}` | Incrément journalier global |

### 5.2 Statuts Facture

| Statut | Condition |
|---|---|
| Impayée | `montant_paye = 0` |
| Partiellement payée | `0 < montant_paye < montant` |
| Payée | `montant_paye >= montant` |
| Annulée | Action manuelle |

Le statut est **automatiquement recalculé** à chaque modification des liaisons `paiement_factures`.

### 5.3 Contraintes sur les Factures

- Une facture liée à au moins un paiement ne peut pas être modifiée
- La modification est possible après suppression de tous les liens `paiement_factures`
- La suppression d'une facture supprime ses liaisons (CASCADE)

### 5.4 Règles de Lettrage

- Le lettrage manuel (case à cocher "Lett.") est indépendant du paiement
- Le lettrage par lot (batch) crée des liaisons `paiement_factures` avec allocation FIFO
- Si totaux équilibrés, toutes les factures deviennent "Payée"
- Si totaux déséquilibrés, la dernière facture est partiellement réglée

### 5.5 Paiements Inter-Filiales

- Un paiement peut être émis entre deux filiales (sans fournisseur)
- `fournisseur_id` = null, `filiale_receptrice_id` = filiale destinataire

---

## 6. Évolutions Possibles

- Authentification et gestion des rôles (RBAC)
- Workflow de validation des paiements (soumission → approbation → exécution)
- Module de rapprochement bancaire (import relevé)
- Notifications email / SMS
- Mode hors-ligne (PWA)
- API REST dédiée
- Tableau de bord avancé avec indicateurs temps réel
