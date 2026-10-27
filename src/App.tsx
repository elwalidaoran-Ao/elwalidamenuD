import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Eye, Sparkles, Search, X, Layers, Camera, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import {
  restaurantInfo,
  uiTranslations,
  categories,
  allMenuItems,
} from './data/menuData';
import { Language, MenuItem, ShowcaseProduct } from './types';
import { ProductPlaceholder } from './components/ProductPlaceholder';
import { TableBillboardModal } from './components/TableBillboardModal';
import { ArLogoCameraModal } from './components/ArLogoCameraModal';
import { ArCameraModal } from './components/ArCameraModal';
import { AdminMenuPage } from './components/AdminMenuPage';
import { useAvailability } from './context/AvailabilityContext';

export default function App() {
  const [lang, setLang] = useState<Language>('fr');
  const [activeCategory, setActiveCategory] = useState<string>('patisserie');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  });

  // Admin routing state
  const checkIsAdminRoute = () => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    return (
      path === '/admin' ||
      path === '/gestion-menu' ||
      hash === '#admin' ||
      hash === '#gestion-menu' ||
      search.includes('admin=true')
    );
  };

  const [isAdminView, setIsAdminView] = useState<boolean>(checkIsAdminRoute);

  // Availability from Supabase context
  const { isCategoryAvailable, isProductAvailable, getEffectiveStatus } = useAvailability();

  // Table Billboard Modal State
  const [isTableModalOpen, setIsTableModalOpen] = useState<boolean>(false);
  const [selectedBillboardProduct, setSelectedBillboardProduct] = useState<
    MenuItem | ShowcaseProduct | null
  >(null);

  // AR Logo Camera Modal State
  const [isLogoModalOpen, setIsLogoModalOpen] = useState<boolean>(false);

  // AR Product Camera Modal State (e.g. Les Trompes l'œil)
  const [isArProductModalOpen, setIsArProductModalOpen] = useState<boolean>(false);
  const [selectedArProduct, setSelectedArProduct] = useState<
    MenuItem | ShowcaseProduct | null
  >(null);

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const categoriesScrollRef = useRef<HTMLDivElement | null>(null);

  const isRTL = lang === 'ar';
  const selectedCategoryObj = categories.find((c) => c.id === activeCategory);

  // Filtered menu items based on category and search query
  const filteredProducts = useMemo(() => {
    let list: MenuItem[] = [];
    if (activeCategory === 'all') {
      list = allMenuItems;
    } else {
      list = allMenuItems.filter((item) => item.categoryId === activeCategory);
    }

    if (!searchQuery.trim()) {
      return list;
    }

    const query = searchQuery.trim().toLowerCase();
    return list.filter((item) => {
      const nameFr = item.name.fr.toLowerCase();
      const nameAr = item.name.ar.toLowerCase();
      const descFr = item.desc?.fr?.toLowerCase() || '';
      const descAr = item.desc?.ar?.toLowerCase() || '';
      return (
        nameFr.includes(query) ||
        nameAr.includes(query) ||
        descFr.includes(query) ||
        descAr.includes(query)
      );
    });
  }, [activeCategory, searchQuery]);

  // Unified list of products for cycling in the Table Billboard modal
  const allAvailableProducts = useMemo(() => {
    return allMenuItems;
  }, []);

  // Sync document language and direction
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [lang, isRTL]);

  // Listen for browser navigation (popstate & hashchange)
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminView(checkIsAdminRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Sync admin mode class on body & #root for unconstrained scrolling
  useEffect(() => {
    const rootEl = document.getElementById('root');
    if (isAdminView) {
      document.body.classList.add('admin-mode');
      rootEl?.classList.add('admin-active');
    } else {
      document.body.classList.remove('admin-mode');
      rootEl?.classList.remove('admin-active');
    }
    return () => {
      document.body.classList.remove('admin-mode');
      rootEl?.classList.remove('admin-active');
    };
  }, [isAdminView]);

  const handleEnterAdmin = () => {
    setIsAdminView(true);
    window.history.pushState({}, '', '#gestion-menu');
  };

  const handleExitAdmin = () => {
    setIsAdminView(false);
    window.history.pushState({}, '', window.location.pathname.replace(/\/admin|\/gestion-menu/, '') || '/');
  };

  // Toast notification helper
  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message: msg, visible: true });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2200);
  }, []);

  // Language toggle handler
  const handleToggleLanguage = (newLang: Language) => {
    if (newLang === lang) return;
    setLang(newLang);
    showToast(newLang === 'ar' ? 'تم تحويل اللغة إلى العربية' : 'Langue changée en Français');
  };

  // Category selection handler
  const handleSelectCategory = (catId: string, label: string) => {
    setActiveCategory(catId);
    showToast(
      isRTL
        ? `${uiTranslations.selectedCategoryToast.ar} ${label}`
        : `${label} ${uiTranslations.selectedCategoryToast.fr}`
    );
  };

  // Open Table Billboard modal
  const handleOpenTableBillboard = useCallback(
    (prod: MenuItem | ShowcaseProduct) => {
      setSelectedBillboardProduct(prod);
      setIsTableModalOpen(true);
    },
    []
  );

  // Open AR Product Camera modal (e.g. Les Trompes l'œil)
  const handleOpenArProductCamera = useCallback(
    (prod: MenuItem | ShowcaseProduct) => {
      setSelectedArProduct(prod);
      setIsArProductModalOpen(true);
    },
    []
  );



  // Auto-scroll categories hint on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (categoriesScrollRef.current) {
        categoriesScrollRef.current.scrollTo({ left: isRTL ? -40 : 40, behavior: 'smooth' });
        setTimeout(() => {
          if (categoriesScrollRef.current) {
            categoriesScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          }
        }, 600);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isRTL]);

  // If in Admin view, render full administration page
  if (isAdminView) {
    return <AdminMenuPage onBackToMenu={handleExitAdmin} />;
  }

  return (
    <div className="phone-frame" id="phoneFrame" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Notch */}
      <div className="notch" id="notch"></div>

      {/* Home indicator */}
      <div className="home-indicator" id="homeIndicator"></div>

      {/* Scrollable Content */}
      <div className="content" id="content">
        {/* Header */}
        <header className="header animate-in delay-1" id="header">
          <div className="brand" id="brand">
            <div className="brand-text" id="brandText">
              {restaurantInfo.name[lang]}
            </div>
            <button
              type="button"
              className="brand-logo-btn group"
              id="brandLogoBtn"
              onClick={() => setIsLogoModalOpen(true)}
              title={uiTranslations.clickToSeeLogo[lang]}
            >
              {restaurantInfo.logoUrl ? (
                <img
                  src={restaurantInfo.logoUrl}
                  alt="L'Walida Logo"
                  className="w-3.5 h-3.5 object-contain rounded-full border border-[#C9A84C]/60"
                />
              ) : (
                <Sparkles className="w-3 h-3 text-[#C9A84C]" />
              )}
              <span>{uiTranslations.clickToSeeLogo[lang]}</span>
            </button>
          </div>

          {/* Language Switcher */}
          <div className="lang-toggle" id="langToggle" aria-label="Choisir la langue / اختيار اللغة">
            <button
              type="button"
              id="langBtnFr"
              className={`lang-btn ${lang === 'fr' ? 'active' : ''}`}
              onClick={() => handleToggleLanguage('fr')}
            >
              FR
            </button>
            <button
              type="button"
              id="langBtnAr"
              className={`lang-btn ${lang === 'ar' ? 'active' : ''}`}
              onClick={() => handleToggleLanguage('ar')}
            >
              العربية
            </button>
          </div>
        </header>

        {/* Categories Bar */}
        <div className="categories-bar animate-in delay-2" id="categoriesBar">
          <div className="categories-scroll" id="categoriesScroll" ref={categoriesScrollRef}>
            {/* "All" category button */}
            <button
              type="button"
              id="cat-all"
              className={`category-item ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => handleSelectCategory('all', uiTranslations.allCategories[lang])}
            >
              <div className="category-ring">
                <div className="category-img-wrap flex items-center justify-center bg-gradient-to-br from-[#FFFDF9] to-[#F2E8DC]">
                  <Layers className="w-5 h-5 text-[#7B1F2A]" />
                </div>
              </div>
              <span className="category-label">{uiTranslations.allCategories[lang]}</span>
            </button>

            {/* Dynamic categories - kept visible even when OFF */}
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              const catLabel = cat.label[lang];
              const isCatOn = isCategoryAvailable(cat.id);

              return (
                <button
                  key={cat.id}
                  type="button"
                  id={`cat-${cat.id}`}
                  className={`category-item ${isActive ? 'active' : ''} ${
                    !isCatOn ? 'opacity-85' : ''
                  }`}
                  data-cat={cat.id}
                  onClick={() => handleSelectCategory(cat.id, catLabel)}
                >
                  <div className="category-ring relative">
                    <div className="category-img-wrap">
                      <ProductPlaceholder
                        variant="category"
                        categoryId={cat.id}
                        image={cat.image}
                        altText={cat.alt ? cat.alt[lang] : catLabel}
                        lang={lang}
                      />
                    </div>
                    {/* Visual indicator when category is currently OFF */}
                    {!isCatOn && (
                      <span
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-white shadow-xs"
                        title={isRTL ? 'غير متوفر حالياً' : 'Catégorie indisponible'}
                      />
                    )}
                  </div>
                  <span className="category-label flex flex-col items-center">
                    <span>{catLabel}</span>
                    {!isCatOn && (
                      <span className="text-[9px] font-bold text-rose-600">
                        {isRTL ? '(غير متوفر)' : '(Indisponible)'}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="px-5 mb-4 animate-in delay-3" id="searchContainer">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#C9A84C] absolute left-3.5 rtl:left-auto rtl:right-3.5 pointer-events-none" />
            <input
              type="text"
              id="menuSearchInput"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={uiTranslations.searchPlaceholder[lang]}
              className="w-full bg-white/90 focus:bg-white text-xs text-[#2D2D2D] placeholder:text-[#8A8A8A] rounded-full py-2.5 pl-10 pr-9 rtl:pl-9 rtl:pr-10 border border-[#C9A84C]/30 focus:border-[#C9A84C] focus:outline-none shadow-xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 rtl:right-auto rtl:left-3 w-5 h-5 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-[#5A5A5A]"
                aria-label="Effacer la recherche"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Popular / Filtered Category Section */}
        <div className="popular-section animate-in delay-4" id="popularSection">
          <div className="section-header" id="popularHeader">
            <div>
              <h3 className="section-title" id="popularTitle">
                {searchQuery
                  ? isRTL
                    ? `نتائج البحث (${filteredProducts.length})`
                    : `Résultats (${filteredProducts.length})`
                  : activeCategory === 'all'
                  ? uiTranslations.allCategories[lang]
                  : selectedCategoryObj
                  ? selectedCategoryObj.label[lang]
                  : uiTranslations.popularTitle[lang]}
              </h3>
              <span className="text-[11px] text-[#8A8A8A] font-medium">
                {filteredProducts.length} {uiTranslations.itemsCount[lang]}
              </span>
            </div>

            {activeCategory !== 'all' && !searchQuery && (
              <a
                href="#voir-tout"
                className="section-link"
                id="popularLink"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveCategory('all');
                  showToast(isRTL ? 'جميع الأصناف' : 'Tous les articles');
                }}
              >
                {uiTranslations.seeAll[lang]}
              </a>
            )}
          </div>

          {filteredProducts.length > 0 ? (
            <div className="popular-grid" id="popularGrid">
              {filteredProducts.map((item) => {
                const itemName = item.name[lang];
                const effectiveStatus = getEffectiveStatus(item.id, item.categoryId);

                return (
                  <div
                    key={item.id}
                    id={`popular-${item.id}`}
                    className={`popular-card group ${
                      effectiveStatus === 'indisponible' ? 'opacity-85' : ''
                    }`}
                    onClick={() => handleOpenTableBillboard(item)}
                  >
                    <div
                      className={`popular-card-img ${
                        effectiveStatus === 'indisponible'
                          ? 'opacity-70 grayscale-[25%]'
                          : effectiveStatus === 'epuise'
                          ? 'opacity-80'
                          : ''
                      }`}
                    >
                      <ProductPlaceholder
                        variant="card"
                        categoryId={item.categoryId}
                        image={item.image}
                        altText={itemName}
                        lang={lang}
                        showTableButton={true}
                        onViewOnTable={() => handleOpenTableBillboard(item)}
                      />

                      {/* Availability Badges */}
                      {effectiveStatus === 'indisponible' ? (
                        <span className="popular-card-badge bg-[#71717A]/95 text-white border border-white/20 font-bold">
                          {isRTL ? 'غير متوفر' : 'Indisponible'}
                        </span>
                      ) : effectiveStatus === 'epuise' ? (
                        <span className="popular-card-badge bg-[#7B1F2A] text-[#F0E4C0] border border-[#C9A84C]/50 font-bold">
                          {isRTL ? 'نفذت الكمية' : 'Épuisé'}
                        </span>
                      ) : item.badge ? (
                        <span className="popular-card-badge">{item.badge[lang]}</span>
                      ) : null}

                      {item.image && (
                        <button
                          type="button"
                          className="card-ar-trigger"
                          title={uiTranslations.viewInCamera[lang]}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenArProductCamera(item);
                          }}
                        >
                          <Camera className="w-3 h-3 text-[#C9A84C]" />
                          <span>AR</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="card-table-trigger"
                        title={uiTranslations.viewOnTable[lang]}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTableBillboard(item);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="popular-card-info">
                      <div className="popular-card-name flex items-center justify-between gap-1">
                        <span className="truncate">{itemName}</span>
                      </div>
                      <div className="popular-card-price-row">
                        <div className="popular-card-price">
                          {typeof item.price === 'number' && item.price > 0
                            ? `${item.price} ${item.currency[lang]}`
                            : (lang === 'ar' ? 'قيد التأكيد' : (typeof item.price === 'string' && item.price ? item.price : 'À confirmer'))}
                        </div>
                        <span className="card-table-text-hint">
                          {uiTranslations.viewOnTable[lang]}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-[#8A8A8A]" id="emptyState">
              <Search className="w-8 h-8 mx-auto mb-2 text-[#C9A84C]/60" />
              <p className="text-sm font-medium mb-3">{uiTranslations.noResultsFound[lang]}</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('patisserie');
                }}
                className="px-4 py-2 rounded-full bg-[#7B1F2A] text-white text-xs font-bold shadow-xs hover:bg-[#9B2D3A] transition-all"
              >
                {uiTranslations.resetFilters[lang]}
              </button>
            </div>
          )}
        </div>

        {/* Bottom Bar with Restaurant Info & Discreet Admin Link */}
        <div className="bottom-bar" id="bottomBar">
          <div className="bottom-info" id="bottomInfo">
            <span className="bottom-label" id="bottomLabel">
              {restaurantInfo.openingLabel[lang]}
            </span>
            <span className="bottom-time" id="bottomTime">
              {restaurantInfo.openingHours[lang]}
            </span>
          </div>

          {/* Discreet Admin Link */}
          <div className="mt-3 pt-2 border-t border-[#7B1F2A]/10 flex items-center justify-center">
            <button
              type="button"
              onClick={handleEnterAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium text-[#7B1F2A] hover:text-[#9B2D3A] hover:bg-[#7B1F2A]/5 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#C9A84C]" />
              <span>{isRTL ? 'إدارة القائمة' : 'Gestion du menu'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Realistic On Table Modal */}
      <TableBillboardModal
        isOpen={isTableModalOpen}
        product={selectedBillboardProduct}
        lang={lang}
        allProducts={allAvailableProducts}
        onClose={() => setIsTableModalOpen(false)}
        onSelectProduct={(p) => setSelectedBillboardProduct(p)}
        onOpenArCamera={(p) => handleOpenArProductCamera(p)}
        onOrderOrSelectToast={(name) => {
          showToast(
            isRTL
              ? `تم اختيار ${name}`
              : `${name} ${uiTranslations.addedToastSuffix[lang]}`
          );
        }}
      />

      {/* Product AR Camera Modal (e.g. Les Trompes l'œil) */}
      {selectedArProduct && (
        <ArCameraModal
          isOpen={isArProductModalOpen}
          lang={lang}
          imageUrl={selectedArProduct.image || ''}
          title={selectedArProduct.name}
          subtitle={{
            fr: 'AR Produit • Aperçu Réel',
            ar: 'واقع معزز • معاينة حية للمنتج',
          }}
          tagText={
            'badge' in selectedArProduct && selectedArProduct.badge
              ? selectedArProduct.badge
              : undefined
          }
          price={
            typeof selectedArProduct.price === 'number' && selectedArProduct.price > 0
              ? `${selectedArProduct.price} ${selectedArProduct.currency[lang]}`
              : (lang === 'ar' ? 'قيد التأكيد' : (typeof selectedArProduct.price === 'string' && selectedArProduct.price ? selectedArProduct.price : 'À confirmer'))
          }
          altText={selectedArProduct.name[lang]}
          overlaySize="large"
          onClose={() => setIsArProductModalOpen(false)}
          onToast={showToast}
        />
      )}

      {/* L'Walida Official AR Camera Logo Viewer */}
      <ArLogoCameraModal
        isOpen={isLogoModalOpen}
        lang={lang}
        onClose={() => setIsLogoModalOpen(false)}
        onToast={showToast}
      />

      {/* Toast Notification */}
      <div
        className={`toast ${toast.visible ? 'show' : ''}`}
        id="toast"
        role="alert"
      >
        {toast.message}
      </div>
    </div>
  );
}
