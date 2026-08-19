import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Filiale, Fournisseur, Beneficiaire, Paiement, CompteBancaire, Banque, Facture, PaiementFacture, DashboardStats, Chantier, ZoneGeographique, Localisation } from '../types';

interface UseQueryResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

type SupabaseError = { message: string } | null;

export type PaiementFetched = Paiement & {
  filiale: Filiale;
  fournisseur: Fournisseur | null;
  filiale_receptrice: Filiale | null;
  compte_bancaire: (CompteBancaire & { banque: Banque }) | null;
  paiement_factures: (PaiementFacture & { facture: Facture })[];
  validation_status?: string | null;
};

export type FactureFetched = Facture & {
  fournisseur: Fournisseur;
  filiale: Filiale | null;
  chantier: (Chantier & { localisation: (Localisation & { zone: ZoneGeographique }) | null }) | null;
  validation_status?: string | null;
};

export type ChantierFetched = Chantier & {
  localisation: (Localisation & { zone: ZoneGeographique }) | null;
  validation_status?: string | null;
};

export type FournisseurFetched = Fournisseur & {
  validation_status?: string | null;
};

export type LocalisationFetched = Localisation & {
  zone?: ZoneGeographique | null;
  validation_status?: string | null;
};

export type ZoneFetched = ZoneGeographique & {
  validation_status?: string | null;
};

function useQuery<T>(
  fetcher: () => Promise<{ data: T[] | null; error: SupabaseError }>
): UseQueryResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const { data, error: err } = await fetcher();
    if (err) {
      setError(err.message);
      setData([]);
    } else {
      setData(data || []);
    }
    setLoading(false);
  }, [fetcher]);

  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}

async function filialesFetcher() {
  return await supabase.from('filiales').select('*').order('nom');
}

async function fournisseursFetcher() {
  return await supabase.from('fournisseurs').select('*').order('nom');
}

async function paiementsFetcher() {
  const pageSize = 1000;
  let from = 0;
  let allData: PaiementFetched[] = [];
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('paiements')
      .select(`
        *,
        filiale:filiales!filiale_id(*),
        fournisseur:fournisseurs(*),
        filiale_receptrice:filiales!filiale_receptrice_id(*),
        compte_bancaire:comptes_bancaires(*, banque:banques(*)),
        paiement_factures!paiement_id(*, facture:factures(*))
      `)
      .order('date_paiement', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) return { data: null, error };
    if (data) allData = allData.concat(data);
    hasMore = data && data.length === pageSize;
    from += pageSize;
  }

  return { data: allData, error: null };
}

async function banquesFetcher() {
  return await supabase.from('banques').select('*').order('nom');
}

async function beneficiairesFetcher() {
  return await supabase.from('beneficiaires').select('*').order('nom');
}

async function facturesFetcher() {
  const pageSize = 1000;
  let from = 0;
  let allData: FactureFetched[] = [];
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('factures')
      .select('*, fournisseur:fournisseurs(*), filiale:filiales(*), chantier:chantiers(*, localisation:localisations(*, zone:zones_geographiques(*)))')
      .order('date_facture', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) return { data: null, error };
    if (data) allData = allData.concat(data);
    hasMore = data && data.length === pageSize;
    from += pageSize;
  }

  return { data: allData, error: null };
}

async function zonesFetcher() {
  return await supabase.from('zones_geographiques').select('*').order('nom');
}

async function chantiersFetcher() {
  return await supabase.from('chantiers').select('*, localisation:localisations(*, zone:zones_geographiques(*))').order('nom');
}

async function localisationsFetcher() {
  return await supabase.from('localisations').select('*, zone:zones_geographiques(*)').order('nom');
}

async function comptesFetcher() {
  return await supabase
    .from('comptes_bancaires')
    .select('*, banque:banques(*)')
    .order('created_at');
}

export function useFilialles() {
  return useQuery<Filiale>(filialesFetcher);
}

export function useFournisseurs() {
  return useQuery<FournisseurFetched>(fournisseursFetcher);
}

export function usePaiements() {
  return useQuery<PaiementFetched>(paiementsFetcher);
}

export function useBanques() {
  return useQuery<Banque>(banquesFetcher);
}

export function useBeneficiaires() {
  return useQuery<Beneficiaire>(beneficiairesFetcher);
}

export function useFactures() {
  return useQuery<FactureFetched>(facturesFetcher);
}

export function useComptesBancaires() {
  return useQuery<CompteBancaire & { banque: Banque }>(comptesFetcher);
}

export function useZonesGeographiques() {
  return useQuery<ZoneFetched>(zonesFetcher);
}

export function useChantiers() {
  return useQuery<ChantierFetched>(chantiersFetcher);
}

export function useLocalisations() {
  return useQuery<LocalisationFetched>(localisationsFetcher);
}

export function useDashboardStats(paiements: (Paiement & { filiale: Filiale; fournisseur: Fournisseur | null; filiale_receptrice?: Filiale | null })[]) {
  const [stats, setStats] = useState<DashboardStats>({
    totalPaiements: 0,
    totalMontant: 0,
    paiementsCash: 0,
    montantCash: 0,
    paiementsBanque: 0,
    montantBanque: 0,
    paiementsEnAttente: 0,
    montantEnAttente: 0,
    parFiliale: [],
    parFournisseur: [],
    parType: [],
    parMois: [],
  });

  useEffect(() => {
    const totalMontant = paiements.reduce((s, p) => s + p.montant, 0);
    const cash = paiements.filter(p => p.type_paiement === 'Cash');
    const banque = paiements.filter(p => p.type_paiement !== 'Cash');
    const enAttente = paiements.filter(p => p.statut === 'En attente');

    const parFiliale = Object.entries(
      paiements.reduce((acc, p) => {
        const key = p.filiale.code;
        if (!acc[key]) acc[key] = { count: 0, montant: 0 };
        acc[key].count++;
        acc[key].montant += p.montant;
        return acc;
      }, {} as Record<string, { count: number; montant: number }>)
    ).map(([filiale, v]) => ({ filiale, ...v }));

    const parFournisseur = Object.entries(
      paiements.reduce((acc, p) => {
        const key = p.fournisseur ? p.fournisseur.nom : (p.filiale_receptrice ? `${p.filiale_receptrice.nom} (interne)` : 'Inconnu');
        if (!acc[key]) acc[key] = { count: 0, montant: 0 };
        acc[key].count++;
        acc[key].montant += p.montant;
        return acc;
      }, {} as Record<string, { count: number; montant: number }>)
    ).map(([fournisseur, v]) => ({ fournisseur, ...v }));

    const parType = Object.entries(
      paiements.reduce((acc, p) => {
        const key = p.type_paiement;
        if (!acc[key]) acc[key] = { count: 0, montant: 0 };
        acc[key].count++;
        acc[key].montant += p.montant;
        return acc;
      }, {} as Record<string, { count: number; montant: number }>)
    ).map(([type, v]) => ({ type, ...v }));

    const parMois = Object.entries(
      paiements.reduce((acc, p) => {
        const key = p.date_paiement.slice(0, 7);
        if (!acc[key]) acc[key] = { count: 0, montant: 0 };
        acc[key].count++;
        acc[key].montant += p.montant;
        return acc;
      }, {} as Record<string, { count: number; montant: number }>)
    ).map(([mois, v]) => ({
      mois,
      moisLabel: new Date(mois + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      ...v,
    })).sort((a, b) => a.mois.localeCompare(b.mois));

    setStats({
      totalPaiements: paiements.length,
      totalMontant,
      paiementsCash: cash.length,
      montantCash: cash.reduce((s, p) => s + p.montant, 0),
      paiementsBanque: banque.length,
      montantBanque: banque.reduce((s, p) => s + p.montant, 0),
      paiementsEnAttente: enAttente.length,
      montantEnAttente: enAttente.reduce((s, p) => s + p.montant, 0),
      parFiliale,
      parFournisseur,
      parType,
      parMois,
    });
  }, [paiements]);

  return stats;
}
