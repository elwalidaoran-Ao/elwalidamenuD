import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  ChevronUp,
  ChevronDown,
  ChevronRight,
  X,
  RotateCcw,
  Store,
  CheckCheck,
  Ban,
  ArrowUpRight,
  Info,
  Loader2,
  Mail,
  Cake,
  Utensils,
  Wifi,
  Package,
} from 'lucide-react';
import { useAvailability, EffectiveStatus } from '../context/AvailabilityContext';
import { supabaseAnonKey } from '../lib/supabase';
import { categories, allMenuItems } from '../data/menuData';
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

  // Pending actions state (prevent accidental double-clicks & show instant feedback)
  const [pendingProductIds, setPendingProductIds] = useState<Set<string>>(new Set());
  const [pendingCategoryIds, setPendingCategoryIds] = useState<Set<string>>(new Set());

  // Image load error fallback tracking
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Category horizontal scroll ref
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // User account dropdown toggle
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

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

  const showFeedback = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setActionFeedback({ type, message });
    const timer = setTimeout(() => {
      setActionFeedback((prev) => (prev?.message === message ? null : prev));
    }, 3800);
    return () => clearTimeout(timer);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Scroll listener for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
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

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'right' ? 260 : -260;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Reset all filters in one click
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategoryFilter('all');
    setAvailabilityFilter('all');
    showFeedback('info', 'Filtres réinitialisés.');
  };

  // Compute real status counts across all products
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
    const unavailableCategoriesCount = categories.length - activeCategoriesCount;

    return {
      totalProducts: allMenuItems.length,
      disponible: disponibleCount,
      epuise: epuiseCount,
      indisponible: indisponibleCount,
      activeCategories: activeCategoriesCount,
      unavailableCategories: unavailableCategoriesCount,
      totalCategories: categories.length,
    };
  }, [getEffectiveStatus, isCategoryAvailable]);

  // Filtered products list with search, category, and availability filters
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

      // Search query filter (FR, AR, Description, or ID)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const nameFr = item.name.fr.toLowerCase();
        const nameAr = item.name.ar?.toLowerCase() || '';
        const descFr = item.desc?.fr?.toLowerCase() || '';
        const descAr = item.desc?.ar?.toLowerCase() || '';
        const cat = categories.find((c) => c.id === item.categoryId);
        const catNameFr = cat?.label.fr.toLowerCase() || '';
        const catNameAr = cat?.label.ar?.toLowerCase() || '';
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
      setUserDropdownOpen(false);
      showFeedback('success', 'Connexion administrateur réussie.');
    }
  };

  // Handle product toggle with duplicate prevention & visual saving feedback
  const handleToggleProduct = async (item: MenuItem) => {
    if (pendingProductIds.has(item.id)) return;

    setPendingProductIds((prev) => new Set(prev).add(item.id));
    const isCatOn = isCategoryAvailable(item.categoryId);
    const currentlyOn = isProductAvailable(item.id);
    const nextState = !currentlyOn;

    try {
      const res = await toggleProduct(item.id, item.categoryId);
      if (!res.success) {
        showFeedback('error', res.error || 'Erreur lors de la mise à jour du produit');
      } else {
        if (!isCatOn) {
          showFeedback(
            'info',
            `${item.name.fr} : Disponibilité mise à jour (${nextState ? 'ON' : 'OFF'}). Note : La catégorie "${
              categories.find((c) => c.id === item.categoryId)?.label.fr
            }" est actuellement désactivée.`
          );
        } else {
          showFeedback(
            'success',
            `${item.name.fr} marqué comme ${nextState ? 'Disponible' : 'Épuisé'}`
          );
        }
      }
    } finally {
      setPendingProductIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // Handle category toggle with duplicate prevention
  const handleToggleCategory = async (cat: Category) => {
    if (pendingCategoryIds.has(cat.id)) return;

    setPendingCategoryIds((prev) => new Set(prev).add(cat.id));
    const currentlyOn = isCategoryAvailable(cat.id);
    const nextState = !currentlyOn;

    try {
      const res = await toggleCategory(cat.id);
      if (!res.success) {
        showFeedback('error', res.error || 'Erreur lors de la mise à jour de la catégorie');
      } else {
        showFeedback(
          'success',
          `Catégorie "${cat.label.fr}" ${nextState ? 'activée (Disponible)' : 'désactivée (Indisponible)'}`
        );
      }
    } finally {
      setPendingCategoryIds((prev) => {
        const next = new Set(prev);
        next.delete(cat.id);
        return next;
      });
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

  // Copy SQL script to clipboard
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

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCategoryFilter !== 'all' ||
    availabilityFilter !== 'all';

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryFilter);

  return (
    <div className="min-h-screen w-full bg-[#F8F6F3] text-[#1C1917] font-sans flex flex-col pb-24 relative antialiased">
      {/* 1. Header: Clean and elegant top navigation bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAE6DF] shadow-[0_2px_12px_rgba(0,0,0,0.03)] px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left Zone: Brand & "Retour au menu" button */}
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <button
              type="button"
              onClick={onBackToMenu}
              className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white hover:bg-[#7B1F2A]/5 text-[#7B1F2A] border border-[#EAE6DF] hover:border-[#7B1F2A]/30 transition-all text-xs font-semibold shrink-0 shadow-xs"
              title="Retourner au menu digital client"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline">Retour au menu</span>
            </button>

            <div className="h-6 w-px bg-stone-200 hidden sm:block shrink-0" />

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#7B1F2A]/10 border border-[#7B1F2A]/20 flex items-center justify-center shrink-0">
                <Cake className="w-4.5 h-4.5 text-[#7B1F2A]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#1C1917] font-serif truncate leading-tight">
                  L’Walida Pastry
                </h1>
                <p className="text-xs text-[#78716C] truncate mt-0.5">
                  Gérez vos produits et leur disponibilité
                </p>
              </div>
            </div>
          </div>

          {/* Right Zone: Supabase Connection Badge, Refresh button, Account controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Supabase Connection State Badge */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-xs transition-all ${
                isConfigured
                  ? 'bg-[#E8F8F0] text-[#0E7A4A] border-[#C3ECD6]'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
              title={
                isConfigured
                  ? `Supabase connecté en direct (${supabaseUrl})`
                  : 'Mode local (variables Vercel à configurer)'
              }
            >
              <Wifi className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">
                {isConfigured ? 'Supabase Connecté' : 'Mode Local'}
              </span>
            </div>

            {/* Refresh Data Button */}
            <button
              type="button"
              onClick={refreshAvailability}
              disabled={isLoading}
              className="p-2 rounded-full bg-white hover:bg-[#F8F6F3] text-[#78716C] hover:text-[#1C1917] border border-[#EAE6DF] transition-all shadow-xs"
              title="Rafraîchir les disponibilités"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#7B1F2A]' : ''}`} />
            </button>

            {/* User Account Controls with elwalidaoran@gmail.com */}
            <div className="relative" ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white hover:bg-stone-50 border border-[#EAE6DF] text-xs font-medium text-[#1C1917] transition-all shadow-xs"
                title="Options du compte administrateur"
              >
                <Mail className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                <span className="hidden sm:inline font-medium">elwalidaoran@gmail.com</span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {/* Account Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-[#EAE6DF] shadow-xl p-3 z-50 text-xs space-y-2 animate-in fade-in duration-150">
                  <div className="px-2 py-1.5 border-b border-stone-100">
                    <p className="text-[11px] text-[#78716C]">Compte connecté :</p>
                    <p className="font-bold text-[#1C1917] truncate">elwalidaoran@gmail.com</p>
                    <span className="inline-block mt-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                      Synchronisation active
                    </span>
                  </div>

                  {adminUser ? (
                    <button
                      type="button"
                      onClick={() => {
                        logoutAdmin();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 font-semibold flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Se déconnecter de Supabase</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAuthModal(true);
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-[#7B1F2A] hover:bg-[#7B1F2A]/10 font-semibold flex items-center gap-2 transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5 text-[#C9A84C]" />
                      <span>Connexion Administrateur Supabase</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Floating Action Feedback Notification */}
      {actionFeedback && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md border flex items-start gap-3 text-xs font-medium ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : actionFeedback.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-300'
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}
          >
            {actionFeedback.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            {actionFeedback.type === 'error' && (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            {actionFeedback.type === 'info' && (
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <span className="leading-snug flex-1">{actionFeedback.message}</span>
            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* 2. Statistics Cards: 4 well-designed cards in a single row on desktop */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total produits */}
          <div className="bg-[#FFFDF9] border border-[#EDE8DF] rounded-2xl p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-[#5A5550]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#FCEFD8] text-[#9A5B18] flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <span>Total produits</span>
              </div>
              <span className="text-xs text-[#78716C] font-semibold tabular-nums">
                {stats.activeCategories}/{stats.totalCategories} cat.
              </span>
            </div>

            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#1C1917] font-serif tabular-nums tracking-tight">
                {stats.totalProducts}
              </span>
              <p className="text-xs text-[#78716C] mt-0.5">Catalogue global L’Walida</p>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-200/60">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('products');
                  setAvailabilityFilter('all');
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-full bg-[#7B1F2A] hover:bg-[#631721] text-white text-xs font-semibold transition-all shadow-xs"
              >
                <span>Produits du menu</span>
                <span className="flex items-center gap-1">
                  <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px] tabular-nums">
                    {stats.totalProducts}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </button>
            </div>
          </div>

          {/* Card 2: Disponibles */}
          <div
            onClick={() => {
              setActiveTab('products');
              setAvailabilityFilter('disponible');
            }}
            className="cursor-pointer bg-[#F7FCF9] border border-[#D1F0E0] hover:border-emerald-400 rounded-2xl p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[#0E7A4A]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#D9F5E5] text-[#0E7A4A] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span>Disponibles</span>
              </div>
              <span className="text-xs font-bold text-[#0E7A4A] tabular-nums">
                {stats.totalProducts > 0
                  ? Math.round((stats.disponible / stats.totalProducts) * 100)
                  : 0}
                %
              </span>
            </div>

            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#0E7A4A] font-serif tabular-nums tracking-tight">
                {stats.disponible}
              </span>
              <p className="text-xs text-[#0E7A4A]/80 mt-0.5">Commandable au menu</p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#D1F0E0]">
              <div className="w-full h-1.5 bg-[#D1F0E0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      stats.totalProducts > 0
                        ? (stats.disponible / stats.totalProducts) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Épuisés */}
          <div
            onClick={() => {
              setActiveTab('products');
              setAvailabilityFilter('epuise');
            }}
            className="cursor-pointer bg-[#FFFDF5] border border-[#F7E5C3] hover:border-amber-400 rounded-2xl p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[#B45309]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#FEF1D6] text-[#B45309] flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <span>Épuisés</span>
              </div>
              <span className="text-xs font-medium text-[#B45309] tabular-nums">
                {stats.totalProducts > 0
                  ? Math.round((stats.epuise / stats.totalProducts) * 100)
                  : 0}
                %
              </span>
            </div>

            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#B45309] font-serif tabular-nums tracking-tight">
                {stats.epuise}
              </span>
              <p className="text-xs text-[#B45309]/80 mt-0.5">Badge « Épuisé » sur le menu</p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#F7E5C3]">
              <div className="w-full h-1.5 bg-[#FEF1D6] rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      stats.totalProducts > 0
                        ? (stats.epuise / stats.totalProducts) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card 4: Catégories indisponibles */}
          <div
            onClick={() => {
              setActiveTab('categories');
            }}
            className="cursor-pointer bg-[#FFF8F8] border border-[#FCDADA] hover:border-rose-400 rounded-2xl p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[#BE123C]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#FEE4E4] text-[#BE123C] flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
                <span>Catégories indisponibles</span>
              </div>
              <span className="text-xs font-medium text-[#BE123C] tabular-nums">
                {stats.indisponible} prod.
              </span>
            </div>

            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#BE123C] font-serif tabular-nums tracking-tight">
                {stats.unavailableCategories}
              </span>
              <p className="text-xs text-[#BE123C]/80 mt-0.5">Catégories coupées</p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#FCDADA] flex items-center justify-between text-xs font-semibold text-[#BE123C]">
              <span>Gérer les catégories</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </section>

        {/* 3. Navigation Tabs: 3 stylish tabs, deep burgundy background for active tab */}
        <div className="flex items-center gap-2 border-b border-[#EAE6DF] pb-2 overflow-x-auto">
          {/* Tab 1: Produits du menu */}
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-xs ${
              activeTab === 'products'
                ? 'bg-[#7B1F2A] text-white shadow-sm'
                : 'bg-white hover:bg-stone-100 text-[#78716C] border border-[#EAE6DF]'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Produits du menu</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] tabular-nums font-bold ${
                activeTab === 'products' ? 'bg-black/25 text-white' : 'bg-stone-100 text-stone-700'
              }`}
            >
              {stats.totalProducts}
            </span>
          </button>

          {/* Tab 2: Gestion des catégories */}
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-xs ${
              activeTab === 'categories'
                ? 'bg-[#7B1F2A] text-white shadow-sm'
                : 'bg-white hover:bg-stone-100 text-[#78716C] border border-[#EAE6DF]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Gestion des catégories</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] tabular-nums font-bold ${
                activeTab === 'categories' ? 'bg-black/25 text-white' : 'bg-stone-100 text-stone-700'
              }`}
            >
              {stats.totalCategories}
            </span>
          </button>

          {/* Tab 3: Configuration Supabase */}
          <button
            type="button"
            onClick={() => setActiveTab('setup')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-xs ${
              activeTab === 'setup'
                ? 'bg-[#7B1F2A] text-white shadow-sm'
                : 'bg-white hover:bg-stone-100 text-[#78716C] border border-[#EAE6DF]'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#C9A84C]" />
            <span>Configuration Supabase</span>
          </button>
        </div>

        {/* TAB 1: PRODUCT MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {/* 4. Search & Filters Toolbar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EAE6DF] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3.5">
              {/* Row 1: Aligned Toolbar Controls */}
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un produit (français ou arabe)..."
                    className="w-full bg-[#F8F6F3] text-xs text-[#1C1917] placeholder:text-[#A8A29E] rounded-xl py-2.5 pl-10 pr-9 border border-[#EAE6DF] focus:border-[#7B1F2A] focus:outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
                      title="Effacer la recherche"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Right controls: Category Dropdown, Status Filters, Reset */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  {/* Category Dropdown */}
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="bg-[#F8F6F3] text-xs text-[#1C1917] font-semibold rounded-xl py-2.5 px-3 border border-[#EAE6DF] focus:border-[#7B1F2A] focus:outline-none cursor-pointer"
                  >
                    <option value="all">Toutes les catégories ({categories.length})</option>
                    {categories.map((c) => {
                      const count = allMenuItems.filter((p) => p.categoryId === c.id).length;
                      const isCatOn = isCategoryAvailable(c.id);
                      return (
                        <option key={c.id} value={c.id}>
                          {c.label.fr} ({count} produits) {isCatOn ? '' : '⚠️ (OFF)'}
                        </option>
                      );
                    })}
                  </select>

                  {/* Status Dropdown */}
                  <select
                    value={availabilityFilter}
                    onChange={(e) =>
                      setAvailabilityFilter(
                        e.target.value as 'all' | 'disponible' | 'epuise' | 'indisponible'
                      )
                    }
                    className="bg-[#F8F6F3] text-xs text-[#1C1917] font-semibold rounded-xl py-2.5 px-3 border border-[#EAE6DF] focus:border-[#7B1F2A] focus:outline-none cursor-pointer"
                  >
                    <option value="all">Tous ({stats.totalProducts})</option>
                    <option value="disponible">Disponible ({stats.disponible})</option>
                    <option value="epuise">Épuisé ({stats.epuise})</option>
                    <option value="indisponible">Indisponible ({stats.indisponible})</option>
                  </select>

                  {/* Status Pills */}
                  <div className="hidden sm:inline-flex rounded-xl bg-[#F8F6F3] p-1 border border-[#EAE6DF] text-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setAvailabilityFilter('disponible')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                        availabilityFilter === 'disponible'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-[#78716C] hover:text-emerald-700'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Disponible ({stats.disponible})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvailabilityFilter('indisponible')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                        availabilityFilter === 'indisponible'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-[#78716C] hover:text-rose-700'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      <span>Indisponible ({stats.indisponible})</span>
                    </button>
                  </div>

                  {/* Reset Button */}
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-3 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-[#78716C] hover:text-[#1C1917] border border-[#EAE6DF] text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0"
                      title="Réinitialiser les filtres"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#C9A84C]" />
                      <span className="hidden sm:inline">Réinitialiser</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 5. Category Chips: Horizontal scrolling chips */}
              <div className="relative flex items-center gap-2 pt-1">
                <div
                  ref={categoryScrollRef}
                  className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs scroll-smooth flex-1"
                >
                  {/* If specific category is filtered, show active tag */}
                  {selectedCategoryFilter !== 'all' && selectedCategoryObj && (
                    <div className="px-3 py-1.5 rounded-full bg-[#7B1F2A] text-white font-bold shrink-0 shadow-xs flex items-center gap-1.5">
                      <Filter className="w-3 h-3 text-[#C9A84C]" />
                      <span>Catégorie : {selectedCategoryObj.label.fr}</span>
                      <span className="text-[10px] bg-black/25 px-1.5 py-0.5 rounded-full">
                        {allMenuItems.filter((p) => p.categoryId === selectedCategoryFilter).length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryFilter('all')}
                        className="hover:text-stone-300 ml-0.5"
                        title="Désélectionner"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('all')}
                    className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-all ${
                      selectedCategoryFilter === 'all'
                        ? 'bg-[#7B1F2A] text-white font-bold shadow-xs'
                        : 'bg-[#F8F6F3] text-[#78716C] hover:text-[#1C1917] border border-[#EAE6DF]'
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
                        className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#7B1F2A] text-white font-bold shadow-xs'
                            : 'bg-[#F8F6F3] text-[#78716C] hover:text-[#1C1917] border border-[#EAE6DF]'
                        }`}
                      >
                        <span>{c.label.fr}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                            isSelected ? 'bg-black/25 text-white' : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {count}
                        </span>
                        {!isCatOn && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-rose-500"
                            title="Catégorie désactivée"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Smooth horizontal scroll button */}
                <button
                  type="button"
                  onClick={() => scrollCategories('right')}
                  className="p-1.5 rounded-full bg-[#F8F6F3] hover:bg-stone-200 text-[#78716C] hover:text-[#1C1917] border border-[#EAE6DF] transition-colors shrink-0 shadow-2xs"
                  title="Défiler vers la droite"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Category bulk quick action banner if a category is selected */}
              {selectedCategoryFilter !== 'all' && (
                <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-[#78716C] flex items-center gap-2">
                    <span className="text-[#7B1F2A] font-semibold">
                      Catégorie sélectionnée : {selectedCategoryObj?.label.fr}
                    </span>
                    <span>•</span>
                    <span>{filteredProducts.length} articles</span>
                    {!isCategoryAvailable(selectedCategoryFilter) && (
                      <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        Catégorie désactivée (OFF)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkCategoryProducts(true)}
                      className="px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-all flex items-center gap-1 shadow-2xs"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tout marquer Disponible</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkCategoryProducts(false)}
                      className="px-3 py-1 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-all flex items-center gap-1 shadow-2xs"
                    >
                      <Ban className="w-3.5 h-3.5 text-amber-600" />
                      <span>Tout marquer Épuisé</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 6. Product List Container */}
            <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
              {/* Product List Sub-header */}
              <div className="px-4 py-3 bg-[#FAF8F5] border-b border-[#EAE6DF] flex items-center justify-between text-xs text-[#78716C]">
                <div>
                  Affichage de <strong className="text-[#1C1917]">{filteredProducts.length}</strong> sur{' '}
                  <strong className="text-[#1C1917]">{allMenuItems.length}</strong> créations
                </div>
                <div className="hidden sm:flex items-center gap-1 text-[#78716C]">
                  <span>Cliquer sur l'interrupteur pour changer l'état instantanément</span>
                  <Info className="w-3.5 h-3.5 text-stone-400" />
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="p-16 text-center text-[#78716C] space-y-3">
                  <Filter className="w-10 h-10 mx-auto text-stone-300" />
                  <p className="text-sm font-semibold text-[#1C1917]">
                    Aucun produit ne correspond à votre recherche.
                  </p>
                  <p className="text-xs max-w-sm mx-auto">
                    Vérifiez l’orthographe ou réinitialisez les filtres de catégorie et de disponibilité.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-2 px-4 py-2 rounded-full bg-[#7B1F2A] hover:bg-[#631721] text-white text-xs font-bold transition-all shadow-xs"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#EAE6DF]">
                  {filteredProducts.map((item, index) => {
                    const effectiveStatus = getEffectiveStatus(item.id, item.categoryId);
                    const prodToggleOn = isProductAvailable(item.id);
                    const catToggleOn = isCategoryAvailable(item.categoryId);
                    const catObj = categories.find((c) => c.id === item.categoryId);
                    const isPending = pendingProductIds.has(item.id);
                    const isBroken = brokenImages[item.id];

                    return (
                      <div
                        key={item.id}
                        id={`product-row-${item.id}`}
                        className={`group p-3.5 sm:p-4.5 flex items-center justify-between gap-3 sm:gap-4 hover:bg-[#FAF8F5] transition-colors ${
                          effectiveStatus === 'indisponible'
                            ? 'bg-stone-50/60'
                            : effectiveStatus === 'epuise'
                            ? 'bg-amber-50/20'
                            : ''
                        }`}
                      >
                        {/* Left: Thumbnail & Details */}
                        <div className="flex items-center gap-3.5 sm:gap-4.5 min-w-0 flex-1">
                          {/* Pastry Thumbnail */}
                          <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-xl bg-stone-100 border border-stone-200 shrink-0 overflow-hidden flex items-center justify-center relative shadow-xs">
                            {item.image && !isBroken ? (
                              <img
                                src={item.image}
                                alt={item.name.fr}
                                referrerPolicy="no-referrer"
                                onError={() =>
                                  setBrokenImages((prev) => ({ ...prev, [item.id]: true }))
                                }
                                className={`w-full h-full object-cover transition-opacity ${
                                  effectiveStatus !== 'disponible' ? 'opacity-50 grayscale-20' : ''
                                }`}
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-stone-50 text-stone-400">
                                <Cake className="w-5 h-5 text-[#C9A84C]" />
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="min-w-0 space-y-1 flex-1">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <h3 className="font-bold text-sm sm:text-base text-[#1C1917] truncate">
                                {item.name.fr}
                              </h3>
                              {item.name.ar && (
                                <span className="text-xs sm:text-sm text-[#78716C] font-arabic font-normal truncate" dir="rtl">
                                  {item.name.ar}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2.5 flex-wrap text-xs">
                              {/* Price badge in soft pink/cream with burgundy text */}
                              <span className="text-[#7B1F2A] font-bold text-xs px-2.5 py-0.5 rounded-lg bg-[#7B1F2A]/8 border border-[#7B1F2A]/15 tabular-nums shadow-2xs">
                                {typeof item.price === 'number' && item.price > 0
                                  ? `${item.price} DA`
                                  : item.price}
                              </span>

                              {/* Category tag with dessert icon */}
                              <span className="text-[11px] text-[#78716C] font-semibold flex items-center gap-1">
                                <Utensils className="w-3 h-3 text-[#C9A84C]" />
                                <span>{catObj?.label.fr || item.categoryId}</span>
                              </span>

                              {/* Category OFF indicator */}
                              {!catToggleOn && (
                                <span className="text-[10px] text-rose-700 font-semibold px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200">
                                  Catégorie désactivée
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: High-contrast ON/OFF toggle switch & Chevron */}
                        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                          {/* ON/OFF Switch Button */}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={prodToggleOn}
                            disabled={isPending}
                            onClick={() => handleToggleProduct(item)}
                            className={`relative inline-flex items-center h-8 w-16 px-1 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7B1F2A]/40 shadow-xs ${
                              prodToggleOn ? 'bg-[#7B1F2A]' : 'bg-stone-300'
                            } ${isPending ? 'opacity-60 cursor-wait' : ''}`}
                            title={
                              prodToggleOn
                                ? 'Produit activé (ON / Disponible). Cliquez pour marquer Épuisé.'
                                : 'Produit désactivé (OFF / Épuisé). Cliquez pour marquer Disponible.'
                            }
                          >
                            {/* Inside ON / OFF Text */}
                            <span
                              className={`text-[11px] font-extrabold uppercase tracking-wider select-none px-1 transition-opacity ${
                                prodToggleOn ? 'text-white' : 'text-stone-700 ml-auto'
                              }`}
                            >
                              {prodToggleOn ? 'ON' : 'OFF'}
                            </span>

                            {/* White Slider Knob */}
                            <span
                              aria-hidden="true"
                              className={`flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                                prodToggleOn ? 'ml-auto' : 'mr-auto order-first'
                              }`}
                            >
                              {isPending && (
                                <Loader2 className="w-3 h-3 text-[#7B1F2A] animate-spin" />
                              )}
                            </span>
                          </button>

                          {/* Subtle chevron right */}
                          <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CATEGORY MANAGEMENT */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            {/* Explanatory callout & bulk controls */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EAE6DF] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#1C1917] font-serif flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#7B1F2A]" />
                  <span>Gestion des catégories</span>
                </h3>
                <p className="text-xs text-[#78716C] mt-1 max-w-2xl leading-relaxed">
                  Désactiver une catégorie rend instantanément tous ses produits <strong>Indisponibles</strong> sur le menu public, sans écraser leurs réglages individuels. Dès la réactivation de la catégorie, les produits retrouvent immédiatement leur état de disponibilité précédent.
                </p>
              </div>

              {/* Bulk actions */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setAllCategoryAvailability(true)}
                  className="px-3.5 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <CheckCheck className="w-4 h-4 text-emerald-600" />
                  <span>Tout activer (15/15)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAllCategoryAvailability(false)}
                  className="px-3.5 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Ban className="w-4 h-4 text-rose-600" />
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
                const isPending = pendingCategoryIds.has(cat.id);

                return (
                  <div
                    key={cat.id}
                    className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all flex flex-col justify-between gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] ${
                      isCatOn
                        ? 'border-[#EAE6DF] hover:border-[#7B1F2A]/30'
                        : 'border-rose-200 bg-rose-50/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-2xl bg-stone-100 border border-stone-200 shrink-0 overflow-hidden shadow-xs">
                          {cat.image ? (
                            <img
                              src={cat.image}
                              alt={cat.label.fr}
                              referrerPolicy="no-referrer"
                              className={`w-full h-full object-cover transition-opacity ${
                                !isCatOn ? 'opacity-40 grayscale' : ''
                              }`}
                            />
                          ) : (
                            <Layers className="w-6 h-6 text-[#7B1F2A] m-4" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#1C1917] font-serif">{cat.label.fr}</h4>
                          <span className="text-xs text-[#78716C] font-arabic block" dir="rtl">
                            {cat.label.ar}
                          </span>
                          <span className="text-[11px] text-[#78716C] mt-1 block">
                            {categoryProducts.length} créations •{' '}
                            <strong className="text-[#1C1917]">{activeProductsCount}</strong> disponibles
                          </span>
                        </div>
                      </div>

                      {/* Category Switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isCatOn}
                        disabled={isPending}
                        onClick={() => handleToggleCategory(cat)}
                        className={`relative inline-flex items-center h-8 w-16 px-1 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7B1F2A]/40 shadow-xs shrink-0 ${
                          isCatOn ? 'bg-emerald-600' : 'bg-stone-300'
                        } ${isPending ? 'opacity-60 cursor-wait' : ''}`}
                        title={isCatOn ? 'Catégorie Activée (ON)' : 'Catégorie Désactivée (OFF)'}
                      >
                        <span
                          className={`text-[11px] font-extrabold uppercase tracking-wider select-none px-1 transition-opacity ${
                            isCatOn ? 'text-white' : 'text-stone-700 ml-auto'
                          }`}
                        >
                          {isCatOn ? 'ON' : 'OFF'}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                            isCatOn ? 'ml-auto' : 'mr-auto order-first'
                          }`}
                        >
                          {isPending && (
                            <Loader2 className="w-3 h-3 text-emerald-600 animate-spin" />
                          )}
                        </span>
                      </button>
                    </div>

                    {/* Bottom Status & Quick Link */}
                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                      <div>
                        {isCatOn ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Catégorie Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-700 font-semibold text-xs">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
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
                        className="text-xs text-[#7B1F2A] hover:text-[#631721] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Gérer ses {categoryProducts.length} articles</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
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
            <div className="bg-white rounded-2xl border border-[#EAE6DF] p-5 sm:p-6 space-y-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2.5 text-[#7B1F2A]">
                <Database className="w-5 h-5 text-[#C9A84C]" />
                <h3 className="font-bold text-base text-[#1C1917] font-serif">
                  Variables d’environnement requises (Vercel & Framework Vite)
                </h3>
              </div>
              <p className="text-xs text-[#78716C] leading-relaxed">
                Ce projet fonctionne avec le framework <strong>Vite (React SPA)</strong>. Dans l’écosystème Vite,
                toutes les variables d’environnement exposées au frontend dans le navigateur doivent obligatoirement
                être préfixées par <code className="text-[#7B1F2A] bg-stone-100 px-1.5 py-0.5 rounded font-mono">VITE_</code>.
              </p>

              <div className="bg-[#FAF8F5] rounded-xl p-4 border border-[#EAE6DF] space-y-3 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-stone-200">
                  <span className="text-[#7B1F2A] font-semibold">VITE_SUPABASE_URL</span>
                  <span className="text-[#1C1917] select-all">https://kyybplhoanqumlvxqmys.supabase.co</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[#7B1F2A] font-semibold">VITE_SUPABASE_ANON_KEY</span>
                  <span className="text-[#78716C] select-all">
                    {supabaseAnonKey ? `${supabaseAnonKey.slice(0, 20)}...` : '<votre_clé_anon_publique>'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-[#78716C] space-y-2 pt-2">
                <h4 className="font-bold text-[#1C1917] text-xs uppercase tracking-wider">
                  Procédure de configuration sur Vercel :
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[#44403C]">
                  <li>Ouvrez le tableau de bord de votre projet sur <strong>Vercel</strong>.</li>
                  <li>Allez dans l’onglet <strong>Settings &gt; Environment Variables</strong>.</li>
                  <li>
                    Ajoutez la variable <code className="text-[#7B1F2A]">VITE_SUPABASE_URL</code> avec la valeur :<br />
                    <code className="text-[#1C1917] bg-stone-100 px-2 py-0.5 rounded font-mono text-[11px] inline-block mt-0.5">
                      https://kyybplhoanqumlvxqmys.supabase.co
                    </code>
                  </li>
                  <li>
                    Ajoutez la variable <code className="text-[#7B1F2A]">VITE_SUPABASE_ANON_KEY</code> avec votre clé anon/public Supabase (disponible dans votre console Supabase : <em>Project Settings &gt; API &gt; Project API keys &gt; anon/public</em>).
                  </li>
                  <li>Cochez les environnements (<strong>Production, Preview, Development</strong>) puis enregistrez.</li>
                </ol>
              </div>
            </div>

            {/* Supabase SQL Migration Script */}
            <div className="bg-white rounded-2xl border border-[#EAE6DF] p-5 sm:p-6 space-y-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5 text-[#7B1F2A]">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-base text-[#1C1917] font-serif">
                    Script SQL Supabase (Tables, Sécurité RLS & Realtime)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={copySqlSchema}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B1F2A] hover:bg-[#631721] text-white font-bold text-xs transition-all shadow-xs"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-4 h-4 text-[#C9A84C]" />
                      <span>Script copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#C9A84C]" />
                      <span>Copier le script SQL</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-[#78716C] leading-relaxed">
                Ce script crée les deux tables <code className="text-[#1C1917] font-mono">category_availability</code> et{' '}
                <code className="text-[#1C1917] font-mono">product_availability</code>, configure la sécurité Row Level
                Security (RLS) pour autoriser la lecture publique tout en réservant la modification aux administrateurs
                connectés, et active la publication <strong>supabase_realtime</strong> pour la synchronisation instantanée.
              </p>

              <pre className="bg-[#FAF8F5] text-[#1C1917] p-4 rounded-xl border border-[#EAE6DF] text-xs font-mono overflow-x-auto max-h-80 leading-relaxed">
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
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-[#7B1F2A] hover:bg-[#631721] text-white shadow-xl transition-all flex items-center justify-center animate-in fade-in zoom-in duration-200 border border-[#C9A84C]/40"
          title="Remonter en haut de la page"
          aria-label="Remonter en haut"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}

      {/* Admin Login Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-[#EAE6DF] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#1C1917] flex items-center gap-2 font-serif">
                <Lock className="w-4 h-4 text-[#7B1F2A]" />
                <span>Connexion Administrateur</span>
              </h3>
              <p className="text-xs text-[#78716C]">
                Connectez-vous avec votre compte Supabase pour enregistrer les modifications protégées par RLS.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1">
                  Email Administrateur
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@lwalida.com"
                  className="w-full bg-[#F8F6F3] text-xs text-[#1C1917] rounded-xl py-2.5 px-3 border border-[#EAE6DF] focus:border-[#7B1F2A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1">
                  Mot de passe
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#F8F6F3] text-xs text-[#1C1917] rounded-xl py-2.5 px-3 border border-[#EAE6DF] focus:border-[#7B1F2A] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="px-3.5 py-2 rounded-full text-xs text-[#78716C] hover:text-[#1C1917] font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="px-4 py-2 rounded-full bg-[#7B1F2A] hover:bg-[#631721] text-white text-xs font-bold transition-all shadow-xs"
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
