import { useState, useRef, useEffect, useCallback, useMemo, UIEvent, TouchEvent } from 'react';
import { Eye, Sparkles, Search, X, Layers, Camera } from 'lucide-react';
import {
  restaurantInfo,
  uiTranslations,
  categories,
  showcaseProducts,
  allMenuItems,
} from './data/menuData';
import { Language, MenuItem, ShowcaseProduct } from './types';
import { ProductPlaceholder } from './components/ProductPlaceholder';
import { TableBillboardModal } from './components/TableBillboardModal';
import { ArLogoCameraModal } from './components/ArLogoCameraModal';
import { ArCameraModal } from './components/ArCameraModal';

export default function App() {
  const [lang, setLang] = useState<Language>('fr');
  const [activeCategory, setActiveCategory] = useState<string>('patisserie');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentProductIndex, setCurrentProductIndex] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [animStage, setAnimStage] = useState<'normal' | 'exiting'>('normal');
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  });

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
  const touchStartXRef = useRef<number>(0);

  const [parallaxStyle, setParallaxStyle] = useState({
    sideLeft: 'rotate(-12deg) translateY(0px)',
    sideRight: 'rotate(8deg) translateY(0px)',
    sideBL: 'rotate(-6deg) translateY(0px)',
    sideBR: 'rotate(10deg) translateY(0px)',
  });

  const isRTL = lang === 'ar';
  const currentProduct = showcaseProducts[currentProductIndex] || showcaseProducts[0];

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
    return [
      ...showcaseProducts,
      ...allMenuItems.filter((item) => !showcaseProducts.some((sp) => sp.id === item.id)),
    ];
  }, []);

  // Sync document language and direction
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [lang, isRTL]);

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

  // Product navigation transition handler
  const goToProduct = useCallback(
    (index: number) => {
      if (isAnimating || index === currentProductIndex) return;
      setIsAnimating(true);
      setAnimStage('exiting');

      setTimeout(() => {
        setCurrentProductIndex(index);
        setAnimStage('normal');

        setTimeout(() => {
          setIsAnimating(false);
        }, 400);
      }, 300);
    },
    [isAnimating, currentProductIndex]
  );

  // Parallax on scroll
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    setParallaxStyle({
      sideLeft: `rotate(-12deg) translateY(${y * 0.08}px)`,
      sideRight: `rotate(8deg) translateY(${y * 0.06}px)`,
      sideBL: `rotate(-6deg) translateY(${y * 0.04}px)`,
      sideBR: `rotate(10deg) translateY(${y * 0.05}px)`,
    });
  };

  // Touch swipe handling on product showcase (direction aware for RTL)
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartXRef.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (isRTL) {
        if (diff > 0 && currentProductIndex > 0) {
          goToProduct(currentProductIndex - 1);
        } else if (diff < 0 && currentProductIndex < showcaseProducts.length - 1) {
          goToProduct(currentProductIndex + 1);
        }
      } else {
        if (diff > 0 && currentProductIndex < showcaseProducts.length - 1) {
          goToProduct(currentProductIndex + 1);
        } else if (diff < 0 && currentProductIndex > 0) {
          goToProduct(currentProductIndex - 1);
        }
      }
    }
  };

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

  return (
    <div className="phone-frame" id="phoneFrame" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Notch */}
      <div className="notch" id="notch"></div>

      {/* Home indicator */}
      <div className="home-indicator" id="homeIndicator"></div>

      {/* Scrollable Content */}
      <div className="content" id="content" onScroll={handleScroll}>
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
            <span className="lang-divider">|</span>
            <button
              type="button"
              id="langBtnAr"
              className={`lang-btn ${lang === 'ar' ? 'active' : ''}`}
              onClick={() => handleToggleLanguage('ar')}
            >
              عربي
            </button>
          </div>
        </header>

        {/* Hero Text */}
        <div className="hero-text animate-in delay-2" id="heroText">
          <h1 className="hero-headline" id="heroHeadline">
            {restaurantInfo.headline[lang]}
          </h1>
          <p className="hero-subtitle" id="heroSubtitle">
            {restaurantInfo.subtitle[lang]}
          </p>
        </div>

        {/* Gold divider */}
        <div className="gold-line animate-in delay-2" id="goldLine"></div>

        {/* Categories Bar */}
        <div className="categories animate-in delay-3" id="categories">
          <div
            className="categories-scroll"
            id="categoriesScroll"
            ref={categoriesScrollRef}
          >
            {/* All items category option */}
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

            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              const catLabel = cat.label[lang];
              return (
                <button
                  key={cat.id}
                  type="button"
                  id={`cat-${cat.id}`}
                  className={`category-item ${isActive ? 'active' : ''}`}
                  data-cat={cat.id}
                  onClick={() => handleSelectCategory(cat.id, catLabel)}
                >
                  <div className="category-ring">
                    <div className="category-img-wrap">
                      <ProductPlaceholder
                        variant="category"
                        categoryId={cat.id}
                        image={cat.image}
                        altText={cat.alt ? cat.alt[lang] : catLabel}
                        lang={lang}
                      />
                    </div>
                  </div>
                  <span className="category-label">{catLabel}</span>
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

        {/* Product Showcase (Hidden when actively searching) */}
        {!searchQuery && (
          <div
            className="showcase animate-in delay-4"
            id="showcase"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="showcase-bg" id="showcaseBg"></div>

            {/* Surrounding products for depth */}
            <div
              className="product-side left cursor-pointer"
              id="sideLeft"
              style={{ transform: parallaxStyle.sideLeft }}
              onClick={() => handleOpenTableBillboard(currentProduct)}
            >
              <ProductPlaceholder
                variant="side"
                categoryId={currentProduct.id}
                image={currentProduct.sideImages[0]}
                lang={lang}
              />
            </div>
            <div
              className="product-side right cursor-pointer"
              id="sideRight"
              style={{ transform: parallaxStyle.sideRight }}
              onClick={() => handleOpenTableBillboard(currentProduct)}
            >
              <ProductPlaceholder
                variant="side"
                categoryId={currentProduct.id}
                image={currentProduct.sideImages[1]}
                lang={lang}
              />
            </div>
            <div
              className="product-side bottom-left cursor-pointer"
              id="sideBL"
              style={{ transform: parallaxStyle.sideBL }}
              onClick={() => handleOpenTableBillboard(currentProduct)}
            >
              <ProductPlaceholder
                variant="side"
                categoryId={currentProduct.id}
                image={currentProduct.sideImages[2]}
                lang={lang}
              />
            </div>
            <div
              className="product-side bottom-right cursor-pointer"
              id="sideBR"
              style={{ transform: parallaxStyle.sideBR }}
              onClick={() => handleOpenTableBillboard(currentProduct)}
            >
              <ProductPlaceholder
                variant="side"
                categoryId={currentProduct.id}
                image={currentProduct.sideImages[3]}
                lang={lang}
              />
            </div>

            <div className="showcase-inner" id="showcaseInner">
              <div className="product-tag" id="productTag">
                <span className="product-tag-dot"></span>
                <span className="product-tag-text">{currentProduct.tag[lang]}</span>
              </div>

              {/* Hero Product Center Circle */}
              <div
                className="hero-product cursor-pointer group"
                id="heroProduct"
                onClick={() => handleOpenTableBillboard(currentProduct)}
                style={{
                  transform:
                    animStage === 'exiting'
                      ? 'scale(0.85) translateY(20px)'
                      : 'scale(1) translateY(0)',
                  opacity: animStage === 'exiting' ? 0.5 : 1,
                }}
              >
                <div className="hero-product-glow"></div>
                <ProductPlaceholder
                  variant="showcase"
                  categoryId={currentProduct.id}
                  image={currentProduct.image}
                  altText={currentProduct.name[lang]}
                  lang={lang}
                  showTableButton={false}
                />
              </div>

              {/* Dedicated "View on Table" & AR Camera Action Buttons */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  id="heroTableBtn"
                  className="hero-table-btn"
                  onClick={() => handleOpenTableBillboard(currentProduct)}
                >
                  <Eye className="w-3.5 h-3.5 text-[#C9A84C]" />
                  <span>{uiTranslations.viewOnTable[lang]}</span>
                </button>
                {currentProduct.image && (
                  <button
                    type="button"
                    id="heroArBtn"
                    className="hero-table-btn"
                    onClick={() => handleOpenArProductCamera(currentProduct)}
                  >
                    <Camera className="w-3.5 h-3.5 text-[#C9A84C]" />
                    <span>{uiTranslations.arCamera[lang]}</span>
                  </button>
                )}
              </div>

              <h2
                className="product-name"
                id="heroName"
                style={{ opacity: animStage === 'exiting' ? 0 : 1 }}
              >
                {currentProduct.name[lang]}
              </h2>
              <p
                className="product-desc"
                id="heroDesc"
                style={{ opacity: animStage === 'exiting' ? 0 : 1 }}
              >
                {currentProduct.desc[lang]}
              </p>

              <div
                className="product-price"
                id="heroPrice"
                style={{
                  marginBottom: '16px',
                  opacity: animStage === 'exiting' ? 0 : 1,
                }}
              >
                {currentProduct.price}
                <span>{currentProduct.currency[lang]}</span>
              </div>

              {/* Navigation Dots */}
              <div className="nav-dots" id="navDots">
                {showcaseProducts.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Aller au produit ${index + 1}`}
                    id={`navDot-${index}`}
                    className={`nav-dot ${index === currentProductIndex ? 'active' : ''}`}
                    onClick={() => goToProduct(index)}
                  />
                ))}
              </div>

              {/* Swipe hint */}
              <div className="swipe-hint" id="swipeHint">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {isRTL ? (
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  ) : (
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  )}
                </svg>
                <span>{uiTranslations.swipeHint[lang]}</span>
              </div>
            </div>
          </div>
        )}

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
                const badgeText = item.badge ? item.badge[lang] : undefined;
                return (
                  <div
                    key={item.id}
                    id={`popular-${item.id}`}
                    className="popular-card group"
                    onClick={() => handleOpenTableBillboard(item)}
                  >
                    <div className="popular-card-img">
                      <ProductPlaceholder
                        variant="card"
                        categoryId={item.categoryId}
                        image={item.image}
                        altText={itemName}
                        lang={lang}
                        showTableButton={true}
                        onViewOnTable={() => handleOpenTableBillboard(item)}
                      />
                      {badgeText && (
                        <span className="popular-card-badge">{badgeText}</span>
                      )}
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
                      <div className="popular-card-name">{itemName}</div>
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
            /* Empty Search Results Card */
            <div className="p-8 text-center bg-white rounded-2xl border border-[#C9A84C]/20 shadow-xs my-2">
              <Search className="w-8 h-8 text-[#C9A84C] mx-auto mb-2 opacity-60" />
              <p className="text-xs font-semibold text-[#5A5A5A] mb-3">
                {uiTranslations.noResultsFound[lang]}
              </p>
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

        {/* Bottom Bar */}
        <div className="bottom-bar" id="bottomBar">
          <div className="bottom-info" id="bottomInfo">
            <span className="bottom-label" id="bottomLabel">
              {restaurantInfo.openingLabel[lang]}
            </span>
            <span className="bottom-time" id="bottomTime">
              {restaurantInfo.openingHours[lang]}
            </span>
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
