import type { Filiale, Banque, Fournisseur, CompteBancaire, Beneficiaire, Paiement, Facture, PaiementFacture, Chantier, ZoneGeographique, Localisation, Profil } from './database';

export type { Filiale, Banque, Fournisseur, CompteBancaire, Beneficiaire, Paiement, Facture, PaiementFacture, Chantier, ZoneGeographique, Localisation, Profil };

export type UserRole = 'admin' | 'assistant' | 'comptable' | 'lecture';

export const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'comptable', label: 'Comptable' },
  { value: 'assistant', label: 'Assistant Comptable' },
  { value: 'lecture', label: 'Lecture seule' },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  comptable: 'Comptable',
  assistant: 'Assistant Comptable',
  lecture: 'Lecture seule',
};

// ---------------------------------------------------------------------------
// Permissions détaillées : matrices menu × action par rôle
// ---------------------------------------------------------------------------
export type MenuKey =
  | 'paiements'
  | 'factures'
  | 'fournisseurs'
  | 'grand-livre'
  | 'filiales'
  | 'zones'
  | 'localisations'
  | 'chantiers'
  | 'beneficiaires'
  | 'rapports'
  | 'validations'
  | 'admin';

export type ActionKey = 'view' | 'create' | 'edit' | 'delete';

export const ALL_ACTIONS: ActionKey[] = ['view', 'create', 'edit', 'delete'];

export const ACTION_LABELS: Record<ActionKey, string> = {
  view: 'Consulter',
  create: 'Créer',
  edit: 'Modifier',
  delete: 'Supprimer',
};

export interface MenuDef {
  key: MenuKey;
  label: string;
}

export const MENUS: MenuDef[] = [
  { key: 'paiements', label: 'Paiements' },
  { key: 'factures', label: 'Factures' },
  { key: 'fournisseurs', label: 'Fournisseurs' },
  { key: 'grand-livre', label: 'Grand Livre' },
  { key: 'filiales', label: 'Filiales' },
  { key: 'zones', label: 'Provinces' },
  { key: 'localisations', label: 'Localisations' },
  { key: 'chantiers', label: 'Chantiers' },
  { key: 'beneficiaires', label: 'Bénéficiaires' },
  { key: 'rapports', label: 'Rapports & Analyses' },
  { key: 'validations', label: 'Validations' },
  { key: 'admin', label: 'Administration' },
];

export type MenuPermissions = Partial<Record<MenuKey, ActionKey[]>>;

const crud: ActionKey[] = ['view', 'create', 'edit', 'delete'];
const rw: ActionKey[] = ['view', 'create', 'edit'];
const viewOnly: ActionKey[] = ['view'];

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, MenuPermissions> = {
  admin: {
    paiements: crud,
    factures: crud,
    fournisseurs: crud,
    'grand-livre': crud,
    filiales: crud,
    zones: crud,
    localisations: crud,
    chantiers: crud,
    beneficiaires: crud,
    rapports: crud,
    validations: crud,
    admin: crud,
  },
  comptable: {
    paiements: rw,
    factures: rw,
    fournisseurs: crud,
    'grand-livre': ['view', 'edit'],
    filiales: viewOnly,
    zones: crud,
    localisations: crud,
    chantiers: crud,
    beneficiaires: rw,
    rapports: viewOnly,
    validations: ['view', 'edit'],
  },
assistant: {
    paiements: rw,
    factures: rw,
    fournisseurs: rw,
    'grand-livre': ['view', 'edit'],
    beneficiaires: rw,
    rapports: viewOnly,
  },
  lecture: {
    paiements: viewOnly,
    factures: viewOnly,
    fournisseurs: viewOnly,
    'grand-livre': viewOnly,
    filiales: viewOnly,
    zones: viewOnly,
    localisations: viewOnly,
    chantiers: viewOnly,
    beneficiaires: viewOnly,
    rapports: viewOnly,
  },
};

export type TypePaiement = 'Cash' | 'Chèque' | 'Virement' | 'Traite' | 'Mise à disposition' | 'Opération bancaire';

export type StatutPaiement = 'Validé' | 'En attente' | 'Rejeté' | 'Annulé';

export type FilialeWithComptes = Filiale & {
  comptes_bancaires: (CompteBancaire & { banque: Banque })[];
};

export type FournisseurWithComptes = Fournisseur & {
  comptes_bancaires: (CompteBancaire & { banque: Banque })[];
};

export type PaiementWithRelations = Paiement & {
  filiale: Filiale;
  fournisseur: Fournisseur | null;
  filiale_receptrice: Filiale | null;
  compte_bancaire: (CompteBancaire & { banque: Banque }) | null;
};

export const TYPES_PAIEMENT: TypePaiement[] = ['Cash', 'Chèque', 'Virement', 'Traite', 'Mise à disposition', 'Opération bancaire'];

export const STATUTS_PAIEMENT: StatutPaiement[] = ['Validé', 'En attente', 'Rejeté', 'Annulé'];

export interface DashboardStats {
  totalPaiements: number;
  totalMontant: number;
  paiementsCash: number;
  montantCash: number;
  paiementsBanque: number;
  montantBanque: number;
  paiementsEnAttente: number;
  montantEnAttente: number;
  parFiliale: { filiale: string; count: number; montant: number }[];
  parFournisseur: { fournisseur: string; count: number; montant: number }[];
  parType: { type: string; count: number; montant: number }[];
  parMois: { mois: string; moisLabel: string; count: number; montant: number }[];
}
