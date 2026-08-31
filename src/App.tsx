import { useState, useRef, useEffect, useCallback, UIEvent, TouchEvent } from 'react';
import { Eye, Sparkles } from 'lucide-react';
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

export default function App() {
  const [lang, setLang] = useState<Language>('fr');
  const [activeCategory, setActiveCategory] = useState<string>('patisserie');
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

  // El Walida Brand Logo Modal State
  const [isLogoModalOpen, setIsLogoModalOpen] = useState<boolean>(false);

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
  const categoryProducts = allMenuItems.filter((item) => item.categoryId === activeCategory);
  const displayedProducts =
    categoryProducts.length > 0
      ? categoryProducts
      : allMenuItems.filter((item) => item.isPopular);

  // Unified list of products for cycling in the Table Billboard modal
  const allAvailableProducts = [
    ...showcaseProducts,
    ...allMenuItems.filter((item) => !showcaseProducts.some((sp) => sp.id === item.id)),
  ];

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
                  alt="El Walida Logo"
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

        {/* Categories */}
        <div className="categories animate-in delay-3" id="categories">
          <div
            className="categories-scroll"
            id="categoriesScroll"
            ref={categoriesScrollRef}
          >
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

        {/* Product Showcase */}
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

            {/* Dedicated "View on Table" Action Button */}
            <div>
              <button
                type="button"
                id="heroTableBtn"
                className="hero-table-btn"
                onClick={() => handleOpenTableBillboard(currentProduct)}
              >
                <Eye className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span>{uiTranslations.viewOnTable[lang]}</span>
              </button>
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

        {/* Popular / Selected Category Section */}
        <div className="popular-section animate-in delay-4" id="popularSection">
          <div className="section-header" id="popularHeader">
            <h3 className="section-title" id="popularTitle">
              {selectedCategoryObj ? selectedCategoryObj.label[lang] : uiTranslations.popularTitle[lang]}
            </h3>
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
          </div>
          <div className="popular-grid" id="popularGrid">
            {displayedProducts.map((item) => {
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
                        {item.price} {item.currency[lang]}
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

      {/* Realistic 2D Billboard on Table Modal */}
      <TableBillboardModal
        isOpen={isTableModalOpen}
        product={selectedBillboardProduct}
        lang={lang}
        allProducts={allAvailableProducts}
        onClose={() => setIsTableModalOpen(false)}
        onSelectProduct={(p) => setSelectedBillboardProduct(p)}
        onOrderOrSelectToast={(name) => {
          showToast(
            isRTL
              ? `تم اختيار ${name}`
              : `${name} ${uiTranslations.addedToastSuffix[lang]}`
          );
        }}
      />

      {/* El Walida Official AR Camera Logo Viewer */}
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
