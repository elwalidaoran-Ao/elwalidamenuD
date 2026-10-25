import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ShieldCheck,
  Database,
  Lock,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  Layers,
  Sparkles,
  ExternalLink,
  Info,
  ChevronUp,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  Store,
  CheckCheck,
  Ban,
} from 'lucide-react';
import { useAvailability, EffectiveStatus } from '../context/AvailabilityContext';
import { supabaseAnonKey } from '../lib/supabase';
import { categories, allMenuItems, restaurantInfo } from '../data/menuData';
import { Category, MenuItem } from '../types';

interface AdminMenuPageProps {
  onBackToMenu: () => void;
}

export const AdminMenuPage: React.FC<AdminMenuPageProps> = ({ onBackToMenu }) => {
  const {
    categoryAvailability,
    productAvailability,
    isLoading,
    isConfigured,
    supabaseUrl,
    adminUser,
    refreshAvailability,
    toggleCategory,
    toggleProduct,
    setAllCategoryAvailability,
    setAllProductsInCategory,
    isCategoryAvailable,
    isProductAvailable,
    getEffectiveStatus,
    loginAdmin,
    logoutAdmin,
  } = useAvailability();

  // Active view tab: 'products' | 'categories' | 'setup'
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'setup'>('products');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<
    'all' | 'disponible' | 'epuise' | 'indisponible'
  >('all');

  // Auth form states
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // SQL Copy state
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Scroll to top button visibility
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // Action status notification message
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => {
      setActionFeedback((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  // Scroll listener for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 350) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Compute status counts across all products
  const stats = useMemo(() => {
    let disponibleCount = 0;
    let epuiseCount = 0;
    let indisponibleCount = 0;

    allMenuItems.forEach((item) => {
      const status = getEffectiveStatus(item.id, item.categoryId);
      if (status === 'disponible') disponibleCount++;
      else if (status === 'epuise') epuiseCount++;
      else if (status === 'indisponible') indisponibleCount++;
    });

    const activeCategoriesCount = categories.filter((c) => isCategoryAvailable(c.id)).length;

    return {
      totalProducts: allMenuItems.length,
      disponible: disponibleCount,
      epuise: epuiseCount,
      indisponible: indisponibleCount,
      activeCategories: activeCategoriesCount,
      totalCategories: categories.length,
    };
  }, [getEffectiveStatus, isCategoryAvailable]);

  // Filtered products list with search and availability filters
  const filteredProducts = useMemo(() => {
    return allMenuItems.filter((item) => {
      // Category filter
      if (selectedCategoryFilter !== 'all' && item.categoryId !== selectedCategoryFilter) {
        return false;
      }

      // Effective status filter
      const status = getEffectiveStatus(item.id, item.categoryId);
      if (availabilityFilter !== 'all' && status !== availabilityFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const nameFr = item.name.fr.toLowerCase();
        const nameAr = item.name.ar.toLowerCase();
        const descFr = item.desc?.fr?.toLowerCase() || '';
        const descAr = item.desc?.ar?.toLowerCase() || '';
        const cat = categories.find((c) => c.id === item.categoryId);
        const catNameFr = cat?.label.fr.toLowerCase() || '';
        const catNameAr = cat?.label.ar.toLowerCase() || '';
        return (
          nameFr.includes(query) ||
          nameAr.includes(query) ||
          descFr.includes(query) ||
          descAr.includes(query) ||
          catNameFr.includes(query) ||
          catNameAr.includes(query) ||
          item.id.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [selectedCategoryFilter, availabilityFilter, searchQuery, getEffectiveStatus]);

  // Handle Auth submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmittingAuth(true);

    const res = await loginAdmin(email, password);
    setIsSubmittingAuth(false);

    if (res.error) {
      setAuthError(res.error);
    } else {
      setShowAuthModal(false);
      showFeedback('success', 'Connexion administrateur réussie.');
    }
  };

  // Handle product toggle
  const handleToggleProduct = async (item: MenuItem) => {
    const isCatOn = isCategoryAvailable(item.categoryId);
    const currentlyOn = isProductAvailable(item.id);
    const nextState = !currentlyOn;

    const res = await toggleProduct(item.id, item.categoryId);
    if (!res.success) {
      showFeedback('error', res.error || 'Erreur lors de la mise à jour');
    } else {
      if (!isCatOn) {
        showFeedback(
          'info',
          `${item.name.fr} : Disponibilité mise à jour (${nextState ? 'ON' : 'OFF'}). Note : La catégorie "${
            categories.find((c) => c.id === item.categoryId)?.label.fr
          }" est actuellement OFF.`
        );
      } else {
        showFeedback(
          'success',
          `${item.name.fr} marqué comme ${nextState ? 'Disponible' : 'Épuisé'}`
        );
      }
    }
  };

  // Handle category toggle
  const handleToggleCategory = async (cat: Category) => {
    const currentlyOn = isCategoryAvailable(cat.id);
    const nextState = !currentlyOn;

    const res = await toggleCategory(cat.id);
    if (!res.success) {
      showFeedback('error', res.error || 'Erreur lors de la mise à jour de la catégorie');
    } else {
      showFeedback(
        'success',
        `Catégorie "${cat.label.fr}" ${nextState ? 'activée (Disponible)' : 'désactivée (Indisponible)'}`
      );
    }
  };

  // Quick bulk toggle for currently filtered category
  const handleBulkCategoryProducts = async (isAvailable: boolean) => {
    if (selectedCategoryFilter === 'all') {
      showFeedback('info', 'Veuillez sélectionner une catégorie spécifique pour cette action groupée.');
      return;
    }
    const catObj = categories.find((c) => c.id === selectedCategoryFilter);
    await setAllProductsInCategory(selectedCategoryFilter, isAvailable);
    showFeedback(
      'success',
      `Tous les produits de "${catObj?.label.fr || selectedCategoryFilter}" sont maintenant ${
        isAvailable ? 'Disponibles (ON)' : 'Épuisés (OFF)'
      }.`
    );
  };

  const copySqlSchema = () => {
    const sqlScript = `-- ====================================================================
-- L'Walida Pastry & Coffee Shop - Supabase Database Schema
-- Project URL: https://kyybplhoanqumlvxqmys.supabase.co
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.category_availability (
  category_id TEXT PRIMARY KEY,
  is_available BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_availability (
  product_id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_availability_category_id 
  ON public.product_availability(category_id);

ALTER TABLE public.category_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read category_availability"
  ON public.category_availability FOR SELECT TO public USING (true);

CREATE POLICY "Public read product_availability"
  ON public.product_availability FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated write category_availability"
  ON public.category_availability FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated write product_availability"
  ON public.product_availability FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'category_availability'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.category_availability;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'product_availability'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_availability;
  END IF;
END $$;
`;
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="min-h-screen w-full bg-[#121214] text-[#EDEDED] font-sans flex flex-col pb-36 relative">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#17171C]/95 backdrop-blur-md border-b border-[#C9A84C]/25 shadow-md px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left Brand & Return */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              type="button"
              onClick={onBackToMenu}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#7B1F2A]/15 hover:bg-[#7B1F2A]/30 text-[#C9A84C] hover:text-[#E2C36E] border border-[#C9A84C]/30 transition-all text-xs font-semibold shrink-0 shadow-sm"
              title="Retourner au menu digital client"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden xs:inline">Retour au menu</span>
            </button>

            <div className="h-5 w-px bg-white/10 hidden sm:block shrink-0" />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2 font-serif truncate">
                  <span>Gestion du menu</span>
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#7B1F2A] text-[#F0E4C0] border border-[#C9A84C]/40 shrink-0">
                  L'Walida Admin
                </span>
              </div>
              <p className="text-[11px] text-[#A1A1AA] truncate hidden sm:block">
                Contrôle des disponibilités en temps réel • Synchronisation Supabase
              </p>
            </div>
          </div>

          {/* Right Status Indicators & Auth */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Supabase status indicator */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border shadow-xs ${
                isConfigured
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
              title={
                isConfigured
                  ? `Connecté en direct à Supabase (${supabaseUrl})`
                  : 'Mode local actif (clé anon en attente de configuration)'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="hidden md:inline font-semibold">
                {isConfigured ? 'Supabase Synchronisé' : 'Mode Local'}
              </span>
            </div>

            {/* Admin User / Auth Button */}
            {adminUser ? (
              <div className="flex items-center gap-2 bg-[#222228] px-3 py-1 rounded-xl border border-white/10 text-xs shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[#D4D4D8] max-w-[110px] sm:max-w-[150px] truncate">
                  {adminUser.email}
                </span>
                <button
                  type="button"
                  onClick={logoutAdmin}
                  className="text-red-400 hover:text-red-300 p-0.5 ml-1 transition-colors"
                  title="Déconnexion"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7B1F2A] hover:bg-[#9B2D3A] text-white text-xs font-semibold transition-all border border-[#C9A84C]/30 shadow-sm"
              >
                <Lock className="w-3 h-3 text-[#C9A84C]" />
                <span className="hidden sm:inline">Connexion Admin</span>
                <span className="sm:hidden">Connexion</span>
              </button>
            )}

            {/* Refresh button */}
            <button
              type="button"
              onClick={refreshAvailability}
              disabled={isLoading}
              className="p-2 rounded-xl bg-[#222228] hover:bg-[#2C2C34] text-[#C9A84C] border border-white/10 transition-all shadow-xs"
              title="Rafraîchir les données depuis Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Floating Action Feedback Banner */}
      {actionFeedback && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border flex items-start gap-3 text-xs font-medium ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/40'
                : actionFeedback.type === 'error'
                ? 'bg-red-950/95 text-red-200 border-red-500/40'
                : 'bg-amber-950/95 text-amber-200 border-amber-500/40'
            }`}
          >
            {actionFeedback.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            {actionFeedback.type === 'error' && (
              <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            {actionFeedback.type === 'info' && (
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <span className="leading-snug">{actionFeedback.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area - Full unconstrained flow */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Statistics Dashboard Banner */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Catalog Card */}
          <div className="bg-[#1A1A20] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#C9A84C]/10 to-transparent rounded-bl-full pointer-events-none" />
            <div className="flex items-center justify-between text-[#A1A1AA] text-xs font-semibold uppercase tracking-wider">
              <span>Catalogue L'Walida</span>
              <Store className="w-4 h-4 text-[#C9A84C]" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-serif">
                {stats.totalProducts}
              </span>
              <span className="text-xs text-[#A1A1AA] font-medium">
                {stats.activeCategories}/{stats.totalCategories} catégories actives
              </span>
            </div>
            <div className="mt-2 text-[11px] text-[#71717A]">
              173 créations pâtissières & boissons
            </div>
          </div>

          {/* Disponible KPI */}
          <div
            onClick={() => {
              setActiveTab('products');
              setAvailabilityFilter('disponible');
            }}
            className="cursor-pointer bg-gradient-to-br from-emerald-950/25 to-[#1A1A20] border border-emerald-500/25 hover:border-emerald-500/50 rounded-2xl p-4 sm:p-5 shadow-sm transition-all"
          >
            <div className="flex items-center justify-between text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Disponible</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                Menu Live
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-300 font-serif">
                {stats.disponible}
              </span>
              <span className="text-xs text-emerald-400 font-bold">
                {Math.round((stats.disponible / stats.totalProducts) * 100)}%
              </span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-400/80">
              Prêt à servir aux clients
            </div>
          </div>

          {/* Épuisé KPI */}
          <div
            onClick={() => {
              setActiveTab('products');
              setAvailabilityFilter('epuise');
            }}
            className="cursor-pointer bg-gradient-to-br from-amber-950/25 to-[#1A1A20] border border-amber-500/25 hover:border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-sm transition-all"
          >
            <div className="flex items-center justify-between text-amber-400 text-xs font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Épuisé</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                Produit OFF
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-serif">
                {stats.epuise}
              </span>
              <span className="text-xs text-amber-400/80 font-medium">
                Badge « Épuisé »
              </span>
            </div>
            <div className="mt-2 text-[11px] text-amber-400/80">
              Visible avec badge Épuisé sur le menu
            </div>
          </div>

          {/* Indisponible KPI */}
          <div
            onClick={() => {
              setActiveTab('products');
              setAvailabilityFilter('indisponible');
            }}
            className="cursor-pointer bg-gradient-to-br from-rose-950/25 to-[#1A1A20] border border-rose-500/25 hover:border-rose-500/50 rounded-2xl p-4 sm:p-5 shadow-sm transition-all"
          >
            <div className="flex items-center justify-between text-rose-400 text-xs font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Indisponible</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                Catégorie OFF
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-rose-300 font-serif">
                {stats.indisponible}
              </span>
              <span className="text-xs text-rose-400/80 font-medium">
                {stats.totalCategories - stats.activeCategories} cat. désact.
              </span>
            </div>
            <div className="mt-2 text-[11px] text-rose-400/80">
              Catégorie parente désactivée
            </div>
          </div>
        </section>

        {/* Informative notification if any categories are currently OFF */}
        {stats.activeCategories < stats.totalCategories && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-[#1A1A20] to-rose-950/30 border border-rose-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>Note importante :</strong> {stats.totalCategories - stats.activeCategories}{' '}
                catégorie(s) sont désactivées. Leurs produits apparaissent automatiquement comme{' '}
                <span className="text-rose-300 font-bold underline">« Indisponible »</span> sur le menu client
                tout en conservant leurs réglages individuels intacts.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className="shrink-0 px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-colors"
            >
              Gérer les catégories
            </button>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b border-white/10 gap-2 sm:gap-4 overflow-x-auto pb-px">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'products'
                  ? 'border-[#C9A84C] text-[#C9A84C]'
                  : 'border-transparent text-[#A1A1AA] hover:text-white'
              }`}
            >
              <span>Produits du menu</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7B1F2A]/60 text-[#F0E4C0] border border-[#C9A84C]/30">
                {stats.totalProducts}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'categories'
                  ? 'border-[#C9A84C] text-[#C9A84C]'
                  : 'border-transparent text-[#A1A1AA] hover:text-white'
              }`}
            >
              <span>Disponibilité par Catégorie</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white">
                {stats.totalCategories}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('setup')}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'setup'
                  ? 'border-[#C9A84C] text-[#C9A84C]'
                  : 'border-transparent text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-[#C9A84C]" />
              <span>Configuration Supabase & Guide Vercel</span>
            </button>
          </div>
        </div>

        {/* TAB 1: PRODUCTS LIST & AVAILABILITY TOGGLES */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {/* Filter and Search Panel */}
            <div className="bg-[#1A1A20] p-4 sm:p-5 rounded-2xl border border-white/10 shadow-sm space-y-3.5">
              {/* Row 1: Search + Category Dropdown */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#C9A84C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par nom (FR/AR), catégorie, description ou ID..."
                    className="w-full bg-[#121214] text-xs text-white placeholder:text-[#71717A] rounded-xl py-2.5 pl-10 pr-9 border border-white/10 focus:border-[#C9A84C] focus:outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#71717A] hover:text-white px-1"
                      title="Effacer la recherche"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Dropdown Filter */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="bg-[#121214] text-xs text-white rounded-xl py-2.5 px-3 border border-white/10 focus:border-[#C9A84C] focus:outline-none cursor-pointer"
                  >
                    <option value="all">Toutes les catégories ({categories.length})</option>
                    {categories.map((c) => {
                      const count = allMenuItems.filter((p) => p.categoryId === c.id).length;
                      const isCatOn = isCategoryAvailable(c.id);
                      return (
                        <option key={c.id} value={c.id}>
                          {c.label.fr} ({count} produits) {isCatOn ? '' : '⚠️ (Catégorie OFF)'}
                        </option>
                      );
                    })}
                  </select>

                  {/* Availability Status Filter Pills */}
                  <div className="inline-flex rounded-xl bg-[#121214] p-1 border border-white/10 text-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setAvailabilityFilter('all')}
                      className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                        availabilityFilter === 'all'
                          ? 'bg-[#C9A84C] text-[#121214] font-bold shadow-xs'
                          : 'text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      Tous ({stats.totalProducts})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvailabilityFilter('disponible')}
                      className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                        availabilityFilter === 'disponible'
                          ? 'bg-emerald-500 text-white font-bold shadow-xs'
                          : 'text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      Disponible ({stats.disponible})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvailabilityFilter('epuise')}
                      className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                        availabilityFilter === 'epuise'
                          ? 'bg-amber-500 text-black font-bold shadow-xs'
                          : 'text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      Épuisé ({stats.epuise})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvailabilityFilter('indisponible')}
                      className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                        availabilityFilter === 'indisponible'
                          ? 'bg-rose-600 text-white font-bold shadow-xs'
                          : 'text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      Indisponible ({stats.indisponible})
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Horizontal Category Chips for 1-Click Fast Navigation */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
                    selectedCategoryFilter === 'all'
                      ? 'bg-[#7B1F2A] text-white border border-[#C9A84C]/50 font-bold shadow-xs'
                      : 'bg-[#121214] text-[#A1A1AA] hover:text-white border border-white/5'
                  }`}
                >
                  Toutes ({stats.totalProducts})
                </button>
                {categories.map((c) => {
                  const count = allMenuItems.filter((p) => p.categoryId === c.id).length;
                  const isSelected = selectedCategoryFilter === c.id;
                  const isCatOn = isCategoryAvailable(c.id);

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(c.id)}
                      className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#7B1F2A] text-white border border-[#C9A84C]/50 font-bold shadow-xs'
                          : 'bg-[#121214] text-[#A1A1AA] hover:text-white border border-white/5'
                      }`}
                    >
                      <span>{c.label.fr}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-black/30 text-[#F0E4C0]' : 'bg-white/5 text-[#71717A]'
                        }`}
                      >
                        {count}
                      </span>
                      {!isCatOn && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Catégorie désactivée" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Row 3: Current selection stats & category bulk actions */}
              {selectedCategoryFilter !== 'all' && (
                <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-[#A1A1AA] flex items-center gap-2">
                    <span className="text-[#C9A84C] font-semibold">
                      Catégorie sélectionnée : {categories.find((c) => c.id === selectedCategoryFilter)?.label.fr}
                    </span>
                    <span>•</span>
                    <span>{filteredProducts.length} articles</span>
                    {!isCategoryAvailable(selectedCategoryFilter) && (
                      <span className="text-rose-400 font-bold bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-500/30">
                        Catégorie désactivée
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkCategoryProducts(true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Tout marquer Disponible</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkCategoryProducts(false)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Tout marquer Épuisé</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Products List Container - natural document flow allowing unconstrained scrolling */}
            <div className="bg-[#1A1A20] rounded-2xl border border-white/10 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-[#16161B] border-b border-white/5 flex items-center justify-between text-xs text-[#A1A1AA]">
                <div className="flex items-center gap-2">
                  <span>
                    Affichage de <strong className="text-white">{filteredProducts.length}</strong> sur{' '}
                    <strong>{allMenuItems.length}</strong> créations
                  </span>
                  <span className="text-[11px] text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-0.5 rounded-full font-medium hidden sm:inline">
                    Ordre alphabétique A à Z
                  </span>
                </div>
                <span className="text-[11px] text-[#71717A] hidden md:inline">
                  Basculez le bouton ON/OFF pour actualiser l'état instantanément
                </span>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="p-16 text-center text-[#71717A] space-y-3">
                  <Filter className="w-10 h-10 mx-auto text-[#52525B]" />
                  <p className="text-sm font-medium text-white">Aucun produit ne correspond aux filtres actuels.</p>
                  <p className="text-xs max-w-sm mx-auto">
                    Essayez de modifier votre mot-clé de recherche ou de réinitialiser les filtres de catégorie et de disponibilité.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategoryFilter('all');
                      setAvailabilityFilter('all');
                    }}
                    className="mt-2 px-4 py-2 rounded-xl bg-[#7B1F2A] hover:bg-[#9B2D3A] text-white text-xs font-bold transition-all border border-[#C9A84C]/30"
                  >
                    Réinitialiser tous les filtres
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredProducts.map((item, index) => {
                    const effectiveStatus = getEffectiveStatus(item.id, item.categoryId);
                    const prodToggleOn = isProductAvailable(item.id);
                    const catToggleOn = isCategoryAvailable(item.categoryId);
                    const catObj = categories.find((c) => c.id === item.categoryId);

                    return (
                      <div
                        key={item.id}
                        id={`admin-product-${item.id}`}
                        className={`p-3.5 sm:p-4.5 flex items-center justify-between gap-3 sm:gap-4 hover:bg-white/[0.02] transition-colors ${
                          effectiveStatus === 'indisponible'
                            ? 'bg-rose-950/5'
                            : effectiveStatus === 'epuise'
                            ? 'bg-amber-950/5'
                            : ''
                        }`}
                      >
                        {/* Left Section: Thumbnail & Bilingual Details */}
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                          {/* Pastry Preview Thumbnail */}
                          <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-xl bg-black/50 border border-white/10 shrink-0 overflow-hidden flex items-center justify-center relative shadow-sm">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name.fr}
                                className={`w-full h-full object-cover transition-opacity ${
                                  effectiveStatus !== 'disponible' ? 'opacity-50 grayscale-20' : ''
                                }`}
                                loading="lazy"
                              />
                            ) : (
                              <Sparkles className="w-6 h-6 text-[#C9A84C]/60" />
                            )}
                            <span className="absolute bottom-0.5 right-0.5 text-[9px] font-mono text-[#A1A1AA] bg-black/70 px-1 rounded-sm">
                              #{index + 1}
                            </span>
                          </div>

                          {/* Product Info */}
                          <div className="min-w-0 space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-[#C9A84C] transition-colors">
                                {item.name.fr}
                              </h3>
                              <span className="text-xs text-[#D4B96A]/90 font-arabic font-normal truncate">
                                {item.name.ar}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#A1A1AA]">
                              {/* Price Pill */}
                              <span className="text-[#C9A84C] font-bold text-xs px-2 py-0.5 rounded-md bg-[#C9A84C]/10 border border-[#C9A84C]/25">
                                {typeof item.price === 'number' && item.price > 0
                                  ? `${item.price} DA`
                                  : item.price}
                              </span>

                              {/* Category Chip */}
                              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[#D4D4D8]">
                                {catObj?.label.fr || item.categoryId}
                              </span>

                              {/* Warning if category is OFF */}
                              {!catToggleOn && (
                                <span className="text-[10px] text-rose-300 font-semibold px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30">
                                  Catégorie Désactivée
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Section: Status Badge & Interactive Switch */}
                        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                          {/* Status Badge */}
                          <div className="text-right hidden xs:block">
                            {effectiveStatus === 'disponible' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Disponible</span>
                              </span>
                            )}
                            {effectiveStatus === 'epuise' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Épuisé</span>
                              </span>
                            )}
                            {effectiveStatus === 'indisponible' && (
                              <span
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-xs"
                                title="Indisponible car la catégorie entière est désactivée"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Indisponible</span>
                              </span>
                            )}
                          </div>

                          {/* Toggle Switch */}
                          <div className="flex flex-col items-center">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={prodToggleOn}
                              onClick={() => handleToggleProduct(item)}
                              className={`relative inline-flex h-7 w-12 sm:w-14 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:ring-offset-2 focus:ring-offset-[#121214] ${
                                prodToggleOn
                                  ? 'bg-[#7B1F2A] border-[#C9A84C]/50 shadow-inner'
                                  : 'bg-[#27272A] border-white/10'
                              }`}
                              title={
                                prodToggleOn
                                  ? 'Actuellement ON (Disponible). Cliquez pour marquer Épuisé.'
                                  : 'Actuellement OFF (Épuisé). Cliquez pour marquer Disponible.'
                              }
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5.5 w-5.5 sm:h-5.5 sm:w-5.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                                  prodToggleOn ? 'translate-x-5 sm:translate-x-7' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span
                              className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${
                                prodToggleOn ? 'text-[#C9A84C]' : 'text-[#71717A]'
                              }`}
                            >
                              {prodToggleOn ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CATEGORIES AVAILABILITY */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            {/* Header info & bulk controls */}
            <div className="bg-[#1A1A20] p-4 sm:p-5 rounded-2xl border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white font-serif flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#C9A84C]" />
                  <span>Disponibilité globale par catégorie</span>
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-1 max-w-2xl leading-relaxed">
                  Désactiver une catégorie rend instantanément tous ses produits <strong>Indisponibles</strong> sur
                  le menu public, tout en préservant leurs réglages individuels intacts. Dès la réactivation de la
                  catégorie, les produits retrouvent leur état précédent sans perte de données.
                </p>
              </div>

              {/* Bulk actions */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setAllCategoryAvailability(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Tout activer (15/15)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAllCategoryAvailability(false)}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Ban className="w-4 h-4" />
                  <span>Tout désactiver</span>
                </button>
              </div>
            </div>

            {/* Categories Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const isCatOn = isCategoryAvailable(cat.id);
                const categoryProducts = allMenuItems.filter((p) => p.categoryId === cat.id);
                const activeProductsCount = categoryProducts.filter((p) => isProductAvailable(p.id)).length;

                return (
                  <div
                    key={cat.id}
                    className={`bg-[#1A1A20] border rounded-2xl p-4 sm:p-5 transition-all flex flex-col justify-between gap-4 shadow-sm ${
                      isCatOn
                        ? 'border-white/10 hover:border-[#C9A84C]/50'
                        : 'border-rose-500/30 bg-rose-950/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 shrink-0 overflow-hidden shadow-inner">
                          {cat.image ? (
                            <img
                              src={cat.image}
                              alt={cat.label.fr}
                              className={`w-full h-full object-cover transition-opacity ${
                                !isCatOn ? 'opacity-40 grayscale' : ''
                              }`}
                            />
                          ) : (
                            <Layers className="w-6 h-6 text-[#C9A84C] m-4" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white font-serif">{cat.label.fr}</h4>
                          <span className="text-xs text-[#D4B96A] font-arabic block">
                            {cat.label.ar}
                          </span>
                          <span className="text-[11px] text-[#A1A1AA] mt-1 block">
                            {categoryProducts.length} créations •{' '}
                            <strong className="text-white">{activeProductsCount}</strong> disponibles
                          </span>
                        </div>
                      </div>

                      {/* Category Switch */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isCatOn}
                          onClick={() => handleToggleCategory(cat)}
                          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:ring-offset-2 focus:ring-offset-[#121214] ${
                            isCatOn ? 'bg-emerald-600 border-emerald-400/50 shadow-inner' : 'bg-[#27272A] border-white/10'
                          }`}
                          title={isCatOn ? 'Catégorie Activée (ON)' : 'Catégorie Désactivée (OFF)'}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                              isCatOn ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span
                          className={`text-[9px] font-bold mt-1 uppercase tracking-wider ${
                            isCatOn ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isCatOn ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Status & Quick Link */}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                      <div>
                        {isCatOn ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Catégorie Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-400 font-semibold text-xs">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Catégorie Désactivée</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategoryFilter(cat.id);
                          setActiveTab('products');
                        }}
                        className="text-xs text-[#C9A84C] hover:text-[#E2C36E] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Gérer ses {categoryProducts.length} articles</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: CONFIGURATION SUPABASE & SQL */}
        {activeTab === 'setup' && (
          <div className="space-y-6">
            {/* Vercel Environment Variables Card */}
            <div className="bg-[#1A1A20] rounded-2xl border border-white/10 p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5 text-[#C9A84C]">
                <Database className="w-5 h-5" />
                <h3 className="font-bold text-base text-white font-serif">
                  Variables d'environnement requises (Vercel & Framework Vite)
                </h3>
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Ce projet fonctionne avec le framework <strong>Vite (React SPA)</strong>. Dans l'écosystème Vite,
                toutes les variables d'environnement exposées au frontend dans le navigateur doivent obligatoirement
                être préfixées par <code className="text-[#C9A84C] bg-black/40 px-1.5 py-0.5 rounded font-mono">VITE_</code>.
              </p>

              <div className="bg-[#121214] rounded-xl p-4 border border-white/10 space-y-3 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-white/5">
                  <span className="text-[#C9A84C] font-semibold">VITE_SUPABASE_URL</span>
                  <span className="text-[#D4D4D8] select-all">https://kyybplhoanqumlvxqmys.supabase.co</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[#C9A84C] font-semibold">VITE_SUPABASE_ANON_KEY</span>
                  <span className="text-[#A1A1AA] select-all">
                    {supabaseAnonKey ? `${supabaseAnonKey.slice(0, 20)}...` : '<votre_clé_anon_publique>'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-[#A1A1AA] space-y-2 pt-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                  Procédure de configuration sur Vercel :
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[#D4D4D8]">
                  <li>Ouvrez le tableau de bord de votre projet sur <strong>Vercel</strong>.</li>
                  <li>Allez dans l'onglet <strong>Settings &gt; Environment Variables</strong>.</li>
                  <li>
                    Ajoutez la variable <code className="text-[#C9A84C]">VITE_SUPABASE_URL</code> avec la valeur exacte :<br />
                    <code className="text-white bg-black/40 px-2 py-0.5 rounded font-mono text-[11px] inline-block mt-0.5">
                      https://kyybplhoanqumlvxqmys.supabase.co
                    </code>
                  </li>
                  <li>
                    Ajoutez la variable <code className="text-[#C9A84C]">VITE_SUPABASE_ANON_KEY</code> avec votre clé anon/public Supabase (accessible dans votre console Supabase : <em>Project Settings &gt; API &gt; Project API keys &gt; anon/public</em>).
                  </li>
                  <li>Cochez les environnements (<strong>Production, Preview, Development</strong>) puis enregistrez.</li>
                </ol>
              </div>
            </div>

            {/* Supabase SQL Migration Script */}
            <div className="bg-[#1A1A20] rounded-2xl border border-white/10 p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5 text-[#C9A84C]">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-base text-white font-serif">
                    Script SQL Supabase (Tables, Sécurité RLS & Realtime)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={copySqlSchema}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#C9A84C] hover:bg-[#D4B96A] text-[#121214] font-bold text-xs transition-all shadow-sm"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Script copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copier le script SQL</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Ce script crée les deux tables <code className="text-white font-mono">category_availability</code> et{' '}
                <code className="text-white font-mono">product_availability</code>, applique les stratégies Row Level
                Security (RLS) pour autoriser la lecture publique tout en réservant la modification aux administrateurs
                connectés, et active la publication <strong>supabase_realtime</strong> pour la synchronisation instantanée.
              </p>

              <pre className="bg-[#121214] text-[#D4D4D8] p-4 rounded-xl border border-white/10 text-xs font-mono overflow-x-auto max-h-80 leading-relaxed">
{`-- 1. Table Category Availability
CREATE TABLE IF NOT EXISTS public.category_availability (
  category_id TEXT PRIMARY KEY,
  is_available BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Table Product Availability
CREATE TABLE IF NOT EXISTS public.product_availability (
  product_id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les recherches par catégorie
CREATE INDEX IF NOT EXISTS idx_product_availability_category_id 
  ON public.product_availability(category_id);

-- 3. Row Level Security (RLS)
ALTER TABLE public.category_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_availability ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS : Lecture publique, écriture sécurisée (authentifiée)
CREATE POLICY "Public read category_availability"
  ON public.category_availability FOR SELECT TO public USING (true);

CREATE POLICY "Public read product_availability"
  ON public.product_availability FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated write category_availability"
  ON public.category_availability FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated write product_availability"
  ON public.product_availability FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Publication Realtime Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.category_availability;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_availability;`}
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-[#7B1F2A] hover:bg-[#9B2D3A] text-[#C9A84C] border border-[#C9A84C]/50 shadow-2xl transition-all flex items-center justify-center animate-in fade-in zoom-in duration-200"
          title="Remonter en haut de la page"
          aria-label="Remonter en haut"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}

      {/* Admin Login Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1A20] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white text-sm p-1"
            >
              ✕
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-serif">
                <Lock className="w-4 h-4 text-[#C9A84C]" />
                <span>Connexion Administrateur</span>
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                Connectez-vous avec votre compte Supabase pour enregistrer les modifications protégées par RLS.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">Email Administrateur</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@lwalida.com"
                  className="w-full bg-[#121214] text-xs text-white rounded-xl py-2.5 px-3 border border-white/10 focus:border-[#C9A84C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">Mot de passe</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#121214] text-xs text-white rounded-xl py-2.5 px-3 border border-white/10 focus:border-[#C9A84C] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-[#A1A1AA] hover:text-white font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="px-4 py-2 rounded-xl bg-[#7B1F2A] hover:bg-[#9B2D3A] text-white text-xs font-bold transition-all shadow-sm border border-[#C9A84C]/30"
                >
                  {isSubmittingAuth ? 'Connexion en cours...' : 'Se connecter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
