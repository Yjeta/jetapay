export interface Database {
  public: {
    Tables: {
      profils: {
        Row: {
          id: string;
          email: string | null;
          nom: string | null;
          role: 'admin' | 'comptable' | 'lecture';
          actif: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          nom?: string | null;
          role?: 'admin' | 'comptable' | 'lecture';
          actif?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          nom?: string | null;
          role?: 'admin' | 'comptable' | 'lecture';
          actif?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      filiales: {
        Row: {
          id: string;
          nom: string;
          code: string;
          description: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          nom: string;
          code: string;
          description?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          nom?: string;
          code?: string;
          description?: string | null;
          created_at?: string | null;
        };
      };
      banques: {
        Row: {
          id: string;
          nom: string;
          code: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          nom: string;
          code: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          nom?: string;
          code?: string;
          created_at?: string | null;
        };
      };
      fournisseurs: {
        Row: {
          id: string;
          nom: string;
          domaine_activite: string | null;
          contact: string | null;
          telephone: string | null;
          email: string | null;
          adresse: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          nom: string;
          domaine_activite?: string | null;
          contact?: string | null;
          telephone?: string | null;
          email?: string | null;
          adresse?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          nom?: string;
          domaine_activite?: string | null;
          contact?: string | null;
          telephone?: string | null;
          email?: string | null;
          adresse?: string | null;
          created_at?: string | null;
        };
      };
      comptes_bancaires: {
        Row: {
          id: string;
          entite_type: string;
          entite_id: string;
          banque_id: string;
          numero_compte: string;
          intitule: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          entite_type: string;
          entite_id: string;
          banque_id: string;
          numero_compte: string;
          intitule?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          entite_type?: string;
          entite_id?: string;
          banque_id?: string;
          numero_compte?: string;
          intitule?: string | null;
          created_at?: string | null;
        };
      };
      zones_geographiques: {
        Row: { id: string; nom: string; created_at: string | null };
        Insert: { id?: string; nom: string; created_at?: string | null };
        Update: { id?: string; nom?: string; created_at?: string | null };
      };
      chantiers: {
        Row: { id: string; nom: string; code: string; localisation_id: string | null; created_at: string | null };
        Insert: { id?: string; nom: string; code: string; localisation_id?: string | null; created_at?: string | null };
        Update: { id?: string; nom?: string; code?: string; localisation_id?: string | null; created_at?: string | null };
      };
      localisations: {
        Row: { id: string; nom: string; zone_id: string; created_at: string | null };
        Insert: { id?: string; nom: string; zone_id: string; created_at?: string | null };
        Update: { id?: string; nom?: string; zone_id?: string; created_at?: string | null };
      };
      factures: {
        Row: {
          id: string;
          code_facture: string;
          fournisseur_id: string;
          filiale_id: string | null;
          chantier_id: string | null;
          date_facture: string;
          date_echeance: string;
          montant: number;
          montant_ht: number | null;
          tva: number | null;
          taxes: number | null;
          montant_paye: number;
          statut: string;
          lettre: boolean;
          date_lettrage: string | null;
          reference: string | null;
          notes: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          code_facture: string;
          fournisseur_id: string;
          filiale_id?: string | null;
          chantier_id?: string | null;
          date_facture: string;
          date_echeance: string;
          montant: number;
          montant_ht?: number | null;
          tva?: number | null;
          taxes?: number | null;
          montant_paye?: number;
          statut?: string;
          lettre?: boolean;
          date_lettrage?: string | null;
          reference?: string | null;
          notes?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          code_facture?: string;
          fournisseur_id?: string;
          filiale_id?: string | null;
          chantier_id?: string | null;
          date_facture?: string;
          date_echeance?: string;
          montant?: number;
          montant_ht?: number | null;
          tva?: number | null;
          taxes?: number | null;
          montant_paye?: number;
          statut?: string;
          lettre?: boolean;
          date_lettrage?: string | null;
          reference?: string | null;
          notes?: string | null;
          created_at?: string | null;
        };
      };
      beneficiaires: {
        Row: {
          id: string;
          nom: string;
          rib: string;
          banque_nom: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          nom: string;
          rib: string;
          banque_nom: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          nom?: string;
          rib?: string;
          banque_nom?: string;
          created_at?: string | null;
        };
      };
      paiement_factures: {
        Row: {
          id: string;
          paiement_id: string;
          facture_id: string;
          montant: number | null;
          code_lettrage: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          paiement_id: string;
          facture_id: string;
          montant?: number | null;
          code_lettrage?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          paiement_id?: string;
          facture_id?: string;
          montant?: number | null;
          code_lettrage?: string | null;
          created_at?: string | null;
        };
      };
      paiements: {
        Row: {
          id: string;
          code_paiement: string;
          date_paiement: string;
          filiale_id: string;
          fournisseur_id: string | null;
          filiale_receptrice_id: string | null;
          montant: number;
          type_paiement: string;
          reference: string | null;
          compte_bancaire_id: string | null;
          notes: string | null;
          statut: string;
          deleted_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          code_paiement?: string;
          date_paiement: string;
          filiale_id: string;
          fournisseur_id?: string | null;
          filiale_receptrice_id?: string | null;
          montant: number;
          type_paiement: string;
          reference?: string | null;
          compte_bancaire_id?: string | null;
          notes?: string | null;
          statut?: string;
          deleted_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          code_paiement?: string;
          date_paiement?: string;
          filiale_id?: string;
          fournisseur_id?: string | null;
          filiale_receptrice_id?: string | null;
          montant?: number;
          type_paiement?: string;
          reference?: string | null;
          compte_bancaire_id?: string | null;
          notes?: string | null;
          statut?: string;
          deleted_at?: string | null;
          created_at?: string | null;
        };
      };
    };
  };
}

export type Profil = Database['public']['Tables']['profils']['Row'];
export type ProfilInsert = Database['public']['Tables']['profils']['Insert'];
export type ProfilUpdate = Database['public']['Tables']['profils']['Update'];
export type Filiale = Database['public']['Tables']['filiales']['Row'];
export type Banque = Database['public']['Tables']['banques']['Row'];
export type Fournisseur = Database['public']['Tables']['fournisseurs']['Row'];
export type CompteBancaire = Database['public']['Tables']['comptes_bancaires']['Row'];
export type Beneficiaire = Database['public']['Tables']['beneficiaires']['Row'];
export type Facture = Database['public']['Tables']['factures']['Row'];
export type PaiementFacture = Database['public']['Tables']['paiement_factures']['Row'];
export type Paiement = Database['public']['Tables']['paiements']['Row'];
export type Chantier = Database['public']['Tables']['chantiers']['Row'];
export type ZoneGeographique = Database['public']['Tables']['zones_geographiques']['Row'];
export type Localisation = Database['public']['Tables']['localisations']['Row'];

export type PaiementInsert = Database['public']['Tables']['paiements']['Insert'];
export type PaiementUpdate = Database['public']['Tables']['paiements']['Update'];
export type BeneficiaireInsert = Database['public']['Tables']['beneficiaires']['Insert'];
export type BeneficiaireUpdate = Database['public']['Tables']['beneficiaires']['Update'];
export type FilialeInsert = Database['public']['Tables']['filiales']['Insert'];
export type FilialeUpdate = Database['public']['Tables']['filiales']['Update'];
export type BanqueInsert = Database['public']['Tables']['banques']['Insert'];
export type BanqueUpdate = Database['public']['Tables']['banques']['Update'];
export type FournisseurInsert = Database['public']['Tables']['fournisseurs']['Insert'];
export type FournisseurUpdate = Database['public']['Tables']['fournisseurs']['Update'];
export type ChantierInsert = Database['public']['Tables']['chantiers']['Insert'];
export type ChantierUpdate = Database['public']['Tables']['chantiers']['Update'];
export type ZoneGeographiqueInsert = Database['public']['Tables']['zones_geographiques']['Insert'];
export type ZoneGeographiqueUpdate = Database['public']['Tables']['zones_geographiques']['Update'];
export type LocalisationInsert = Database['public']['Tables']['localisations']['Insert'];
export type LocalisationUpdate = Database['public']['Tables']['localisations']['Update'];
export type FactureInsert = Database['public']['Tables']['factures']['Insert'];
export type FactureUpdate = Database['public']['Tables']['factures']['Update'];
export type CompteBancaireInsert = Database['public']['Tables']['comptes_bancaires']['Insert'];
export type CompteBancaireUpdate = Database['public']['Tables']['comptes_bancaires']['Update'];
