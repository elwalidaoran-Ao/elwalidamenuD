import React, { useState, useMemo } from 'react';
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

  // Action status message
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

  // Compute status counts
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
  }, [allMenuItems, categories, getEffectiveStatus, isCategoryAvailable]);

  // Filtered products list
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
        const cat = categories.find((c) => c.id === item.categoryId);
        const catNameFr = cat?.label.fr.toLowerCase() || '';
        return (
          nameFr.includes(query) ||
          nameAr.includes(query) ||
          catNameFr.includes(query) ||
          item.id.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [allMenuItems, selectedCategoryFilter, availabilityFilter, searchQuery, getEffectiveStatus, categories]);

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
    <div className="min-h-screen w-full bg-[#18181B] text-[#EDEDED] font-sans flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#1F1F23]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToMenu}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#C9A84C] hover:text-[#E2C36E] border border-[#C9A84C]/20 transition-all text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour au menu</span>
          </button>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span>Gestion du menu</span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#7B1F2A]/80 text-[#F0E4C0] border border-[#C9A84C]/30">
                Admin
              </span>
            </h1>
            <p className="text-[11px] text-[#A1A1AA] hidden sm:block">
              L'Walida Pastry • Disponibilités en direct synchronisées avec Supabase
            </p>
          </div>
        </div>

        {/* Right side connection & Auth controls */}
        <div className="flex items-center gap-2.5">
          {/* Supabase status indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              isConfigured
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
            title={
              isConfigured
                ? `Connecté à Supabase (${supabaseUrl})`
                : 'Clé anon Supabase non configurée (Mode local actif)'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="hidden md:inline">
              {isConfigured ? 'Supabase Connecté' : 'Mode Local / Clé en attente'}
            </span>
          </div>

          {/* Admin user status */}
          {adminUser ? (
            <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[#D4D4D8] max-w-[120px] truncate">{adminUser.email}</span>
              <button
                type="button"
                onClick={logoutAdmin}
                className="text-red-400 hover:text-red-300 p-0.5"
                title="Déconnexion"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7B1F2A] hover:bg-[#9B2D3A] text-white text-xs font-semibold transition-all shadow-sm"
            >
              <Lock className="w-3 h-3" />
              <span>Connexion Admin</span>
            </button>
          )}

          {/* Refresh button */}
          <button
            type="button"
            onClick={refreshAvailability}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#A1A1AA] hover:text-white transition-all"
            title="Rafraîchir depuis la base de données"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Floating feedback alert */}
      {actionFeedback && (
        <div className="fixed top-16 right-4 sm:right-8 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-xl backdrop-blur-md border flex items-center gap-2.5 text-xs font-medium ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
                : actionFeedback.type === 'error'
                ? 'bg-red-950/90 text-red-200 border-red-500/40'
                : 'bg-amber-950/90 text-amber-200 border-amber-500/40'
            }`}
          >
            {actionFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {actionFeedback.type === 'error' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {actionFeedback.type === 'info' && <Info className="w-4 h-4 text-amber-400 shrink-0" />}
            <span>{actionFeedback.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Statistics Dashboard Banner */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Total */}
          <div className="bg-[#242429] border border-white/5 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider block">
              Total Produits
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {stats.totalProducts}
              </span>
              <span className="text-xs text-[#71717A]">
                {stats.activeCategories}/{stats.totalCategories} cat.
              </span>
            </div>
          </div>

          {/* Disponibles */}
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Disponible</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-300">
                {stats.disponible}
              </span>
              <span className="text-[11px] text-emerald-400/70 font-medium">
                {Math.round((stats.disponible / stats.totalProducts) * 100)}%
              </span>
            </div>
          </div>

          {/* Épuisés */}
          <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-amber-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Épuisé</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-300">
                {stats.epuise}
              </span>
              <span className="text-[11px] text-amber-400/70 font-medium">Produit OFF</span>
            </div>
          </div>

          {/* Indisponibles */}
          <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-rose-400">
              <XCircle className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Indisponible</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-rose-300">
                {stats.indisponible}
              </span>
              <span className="text-[11px] text-rose-400/70 font-medium">Catégorie OFF</span>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 gap-2 sm:gap-4 overflow-x-auto">
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
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 text-white">
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
            <span>Catégories</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 text-white">
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
            <Database className="w-3.5 h-3.5" />
            <span>Configuration Supabase & SQL</span>
          </button>
        </div>

        {/* TAB 1: PRODUCTS LIST & TOGGLES */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {/* Filter and Search Bar Controls */}
            <div className="bg-[#242429] p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom (FR/AR), catégorie ou identifiant..."
                  className="w-full bg-[#18181B] text-xs text-white placeholder:text-[#71717A] rounded-xl py-2.5 pl-10 pr-4 border border-white/10 focus:border-[#C9A84C] focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#71717A] hover:text-white"
                  >
                    Effacer
                  </button>
                )}
              </div>

              {/* Category Filter Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="bg-[#18181B] text-xs text-white rounded-xl py-2.5 px-3 border border-white/10 focus:border-[#C9A84C] focus:outline-none cursor-pointer"
                >
                  <option value="all">Toutes les catégories ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label.fr} {isCategoryAvailable(c.id) ? '' : '⚠️ (Catégorie OFF)'}
                    </option>
                  ))}
                </select>

                {/* Availability Filter Buttons */}
                <div className="inline-flex rounded-xl bg-[#18181B] p-1 border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setAvailabilityFilter('all')}
                    className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                      availabilityFilter === 'all'
                        ? 'bg-[#C9A84C] text-[#18181B] font-bold shadow-xs'
                        : 'text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    Tous
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
                    Disponible
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
                    Épuisé
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
                    Indisponible
                  </button>
                </div>
              </div>
            </div>

            {/* Products Table / Cards */}
            <div className="bg-[#242429] rounded-2xl border border-white/5 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between text-xs text-[#A1A1AA]">
                <span>
                  Affichage de <strong className="text-white">{filteredProducts.length}</strong> sur{' '}
                  {allMenuItems.length} produits
                </span>
                <span className="text-[11px] text-[#71717A] hidden sm:inline">
                  Basculez le bouton pour changer l'état en temps réel
                </span>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="p-12 text-center text-[#71717A] space-y-2">
                  <Filter className="w-8 h-8 mx-auto text-[#52525B]" />
                  <p className="text-sm">Aucun produit ne correspond à ces critères de recherche.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategoryFilter('all');
                      setAvailabilityFilter('all');
                    }}
                    className="text-xs text-[#C9A84C] hover:underline"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredProducts.map((item) => {
                    const effectiveStatus = getEffectiveStatus(item.id, item.categoryId);
                    const prodToggleOn = isProductAvailable(item.id);
                    const catToggleOn = isCategoryAvailable(item.categoryId);
                    const catObj = categories.find((c) => c.id === item.categoryId);

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors ${
                          effectiveStatus === 'indisponible'
                            ? 'opacity-70 bg-black/10'
                            : ''
                        }`}
                      >
                        {/* Left: Product Thumbnail & Details */}
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-black/40 border border-white/10 shrink-0 overflow-hidden flex items-center justify-center relative">
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
                              <Sparkles className="w-5 h-5 text-[#C9A84C]/50" />
                            )}
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-xs sm:text-sm text-white truncate">
                                {item.name.fr}
                              </span>
                              <span className="text-xs text-[#A1A1AA] font-arabic font-normal">
                                {item.name.ar}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-[#A1A1AA]">
                              <span className="text-[#C9A84C] font-semibold">
                                {typeof item.price === 'number' && item.price > 0
                                  ? `${item.price} DA`
                                  : item.price}
                              </span>
                              <span>•</span>
                              <span className="text-[#71717A]">
                                {catObj?.label.fr || item.categoryId}
                              </span>
                              {!catToggleOn && (
                                <span className="text-[10px] text-rose-400 font-medium">
                                  (Catégorie OFF)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Status Label & Toggle Switch */}
                        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                          {/* Status Badge */}
                          <div className="text-right">
                            {effectiveStatus === 'disponible' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Disponible</span>
                              </span>
                            )}
                            {effectiveStatus === 'epuise' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                <AlertCircle className="w-3 h-3" />
                                <span>Épuisé</span>
                              </span>
                            )}
                            {effectiveStatus === 'indisponible' && (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                title="Indisponible car la catégorie est désactivée"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Indisponible</span>
                              </span>
                            )}
                          </div>

                          {/* Interactive Toggle Switch */}
                          <div className="flex flex-col items-center">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={prodToggleOn}
                              onClick={() => handleToggleProduct(item)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:ring-offset-2 focus:ring-offset-[#18181B] ${
                                prodToggleOn ? 'bg-[#7B1F2A]' : 'bg-[#3F3F46]'
                              }`}
                              title={
                                prodToggleOn
                                  ? 'Cliquez pour marquer Épuisé'
                                  : 'Cliquez pour marquer Disponible'
                              }
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                  prodToggleOn ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span className="text-[9px] text-[#71717A] mt-0.5">
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

        {/* TAB 2: CATEGORIES LIST & TOGGLES */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="bg-[#242429] p-4 rounded-2xl border border-white/5 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Disponibilité globale par catégorie</h3>
                <p className="text-xs text-[#A1A1AA]">
                  Désactiver une catégorie rend tous ses produits <strong>Indisponibles</strong> sur le
                  menu public sans écraser leurs paramètres individuels.
                </p>
              </div>

              {/* Bulk actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAllCategoryAvailability(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all"
                >
                  Tout activer
                </button>
                <button
                  type="button"
                  onClick={() => setAllCategoryAvailability(false)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
                >
                  Tout désactiver
                </button>
              </div>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {categories.map((cat) => {
                const isCatOn = isCategoryAvailable(cat.id);
                const categoryProducts = allMenuItems.filter((p) => p.categoryId === cat.id);
                const activeProductsCount = categoryProducts.filter((p) => isProductAvailable(p.id)).length;

                return (
                  <div
                    key={cat.id}
                    className={`bg-[#242429] border rounded-2xl p-4 transition-all flex flex-col justify-between gap-4 ${
                      isCatOn
                        ? 'border-white/10 hover:border-[#C9A84C]/40'
                        : 'border-rose-500/30 bg-rose-950/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 shrink-0 overflow-hidden">
                          {cat.image ? (
                            <img
                              src={cat.image}
                              alt={cat.label.fr}
                              className={`w-full h-full object-cover ${
                                !isCatOn ? 'opacity-40 grayscale' : ''
                              }`}
                            />
                          ) : (
                            <Layers className="w-6 h-6 text-[#C9A84C] m-3" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{cat.label.fr}</h4>
                          <span className="text-xs text-[#A1A1AA] font-arabic font-normal block">
                            {cat.label.ar}
                          </span>
                          <span className="text-[11px] text-[#71717A] mt-0.5 block">
                            {categoryProducts.length} articles • {activeProductsCount} actifs
                          </span>
                        </div>
                      </div>

                      {/* Category Toggle Switch */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isCatOn}
                          onClick={() => handleToggleCategory(cat)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:ring-offset-2 focus:ring-offset-[#18181B] ${
                            isCatOn ? 'bg-emerald-600' : 'bg-[#3F3F46]'
                          }`}
                          title={isCatOn ? 'Catégorie Activée' : 'Catégorie Désactivée'}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              isCatOn ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span
                          className={`text-[9px] font-bold mt-0.5 ${
                            isCatOn ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isCatOn ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge & Sub-actions */}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                      <div>
                        {isCatOn ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Disponible</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-semibold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Indisponible (Catégorie OFF)</span>
                          </span>
                        )}
                      </div>

                      {/* Quick action to view in products list */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategoryFilter(cat.id);
                          setActiveTab('products');
                        }}
                        className="text-[11px] text-[#C9A84C] hover:underline flex items-center gap-1"
                      >
                        <span>Gérer ses {categoryProducts.length} produits</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: CONFIGURATION SUPABASE & SQL SCRIPT */}
        {activeTab === 'setup' && (
          <div className="space-y-6">
            {/* Card 1: Vercel & Environment Variables */}
            <div className="bg-[#242429] rounded-2xl border border-white/5 p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#C9A84C]">
                <Database className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">
                  Variables d'environnement requises (Vercel & Framework Vite)
                </h3>
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Ce projet utilise le framework <strong>Vite (React SPA)</strong>. Dans Vite, toutes les
                variables exposées au navigateur client doivent obligatoirement être préfixées par{' '}
                <code className="text-[#C9A84C] bg-black/40 px-1 py-0.5 rounded">VITE_</code>.
              </p>

              <div className="bg-[#18181B] rounded-xl p-4 border border-white/10 space-y-3 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-white/5">
                  <span className="text-[#C9A84C]">VITE_SUPABASE_URL</span>
                  <span className="text-[#D4D4D8] select-all">https://kyybplhoanqumlvxqmys.supabase.co</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[#C9A84C]">VITE_SUPABASE_ANON_KEY</span>
                  <span className="text-[#A1A1AA] select-all">
                    {supabaseAnonKey ? `${supabaseAnonKey.slice(0, 16)}...` : '<votre_cle_anon_publique>'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-[#A1A1AA] space-y-1.5">
                <h4 className="font-bold text-white">Comment configurer dans Vercel :</h4>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[#D4D4D8]">
                  <li>Ouvrez votre projet sur le tableau de bord <strong>Vercel</strong>.</li>
                  <li>Allez dans <strong>Settings &gt; Environment Variables</strong>.</li>
                  <li>Ajoutez <code className="text-[#C9A84C]">VITE_SUPABASE_URL</code> avec la valeur <code className="text-white">https://kyybplhoanqumlvxqmys.supabase.co</code>.</li>
                  <li>Ajoutez <code className="text-[#C9A84C]">VITE_SUPABASE_ANON_KEY</code> avec votre clé anon/public Supabase (trouvée dans Supabase &gt; Project Settings &gt; API).</li>
                  <li>Cochez les environnements (Production, Preview, Development) puis cliquez sur <strong>Save</strong>.</li>
                </ol>
              </div>
            </div>

            {/* Card 2: Supabase SQL Setup Script */}
            <div className="bg-[#242429] rounded-2xl border border-white/5 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-[#C9A84C]">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-sm text-white">
                    Script SQL Supabase (Tables, Sécurité RLS & Realtime)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={copySqlSchema}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C9A84C] hover:bg-[#D4B96A] text-[#18181B] font-bold text-xs transition-all shadow-sm"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Script copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copier le script SQL</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-[#A1A1AA]">
                Exécutez ce script dans le <strong>SQL Editor</strong> de votre projet Supabase. Il
                crée automatiquement les tables <code className="text-white">category_availability</code>{' '}
                et <code className="text-white">product_availability</code>, active les stratégies RLS
                (Row Level Security) afin que seuls les administrateurs authentifiés puissent modifier
                les disponibilités, et configure la réplication temps réel.
              </p>

              <pre className="bg-[#18181B] text-[#D4D4D8] p-4 rounded-xl border border-white/10 text-xs font-mono overflow-x-auto max-h-72">
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

-- 3. Row Level Security (RLS)
ALTER TABLE public.category_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_availability ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: Public can read, authenticated can write
CREATE POLICY "Public read category_availability"
  ON public.category_availability FOR SELECT TO public USING (true);

CREATE POLICY "Public read product_availability"
  ON public.product_availability FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated write category_availability"
  ON public.category_availability FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated write product_availability"
  ON public.product_availability FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.category_availability;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_availability;`}
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* Admin Login Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#242429] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white"
            >
              ✕
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#C9A84C]" />
                <span>Connexion Administrateur</span>
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                Authentifiez-vous avec votre compte Supabase pour appliquer les modifications protégées
                par RLS.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@lwalida.com"
                  className="w-full bg-[#18181B] text-xs text-white rounded-xl py-2.5 px-3 border border-white/10 focus:border-[#C9A84C] focus:outline-none"
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
                  className="w-full bg-[#18181B] text-xs text-white rounded-xl py-2.5 px-3 border border-white/10 focus:border-[#C9A84C] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="px-3 py-2 rounded-xl text-xs text-[#A1A1AA] hover:text-white font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="px-4 py-2 rounded-xl bg-[#7B1F2A] hover:bg-[#9B2D3A] text-white text-xs font-bold transition-all shadow-sm"
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
