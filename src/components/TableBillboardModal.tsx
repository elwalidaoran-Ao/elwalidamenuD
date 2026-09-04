import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Rotate3d,
  Sparkles,
  Layers,
  Coffee,
  CupSoda,
  UtensilsCrossed,
  Sandwich,
  Salad,
  Wine,
  Citrus,
  Eye,
  Info,
  Camera,
} from 'lucide-react';
import { MenuItem, ShowcaseProduct, Language } from '../types';

interface TableBillboardModalProps {
  isOpen: boolean;
  product: MenuItem | ShowcaseProduct | null;
  lang: Language;
  allProducts: (MenuItem | ShowcaseProduct)[];
  onClose: () => void;
  onSelectProduct: (product: MenuItem | ShowcaseProduct) => void;
  onOrderOrSelectToast: (name: string) => void;
  onOpenArCamera?: (product: MenuItem | ShowcaseProduct) => void;
}

export function TableBillboardModal({
  isOpen,
  product,
  lang,
  allProducts,
  onClose,
  onSelectProduct,
  onOrderOrSelectToast,
  onOpenArCamera,
}: TableBillboardModalProps) {
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 6, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageError, setImageError] = useState<boolean>(false);

  const isRTL = lang === 'ar';

  // Reset image error state when product changes
  useEffect(() => {
    setImageError(false);
    setTilt({ x: 6, y: 0 });
  }, [product]);

  // Handle keyboard navigation and ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNextProduct();
      if (e.key === 'ArrowLeft') handlePrevProduct();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, product, allProducts]);

  if (!isOpen || !product) return null;

  const currentIdx = allProducts.findIndex((p) => p.id === product.id);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < allProducts.length - 1;

  const handlePrevProduct = () => {
    if (hasPrev) {
      onSelectProduct(allProducts[currentIdx - 1]);
    }
  };

  const handleNextProduct = () => {
    if (hasNext) {
      onSelectProduct(allProducts[currentIdx + 1]);
    }
  };

  // Touch and pointer interaction for 3D billboard parallax
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    // Constrain tilt bounds for realistic table perspective
    const newY = Math.max(-24, Math.min(24, tilt.y + deltaX * 0.12));
    const newX = Math.max(0, Math.min(18, tilt.x - deltaY * 0.08));

    setTilt({ x: newX, y: newY });
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const resetPerspective = () => {
    setTilt({ x: 6, y: 0 });
  };

  const hasRealImage = Boolean(product.image && product.image.trim() !== '' && !imageError);
  const categoryId = 'categoryId' in product ? product.categoryId : 'patisserie';
  const desc = product.desc ? product.desc[lang] : '';
  const name = product.name[lang];
  const price = `${product.price} ${product.currency[lang]}`;

  // Category Icon Resolver
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'patisserie':
        return <Sparkles className="w-8 h-8 text-[#C9A84C]" />;
      case 'viennoiserie':
        return <Layers className="w-8 h-8 text-[#C9A84C]" />;
      case 'boissons-chaudes':
        return <Coffee className="w-8 h-8 text-[#C9A84C]" />;
      case 'ice-latte':
        return <CupSoda className="w-8 h-8 text-[#C9A84C]" />;
      case 'brunch':
        return <UtensilsCrossed className="w-8 h-8 text-[#C9A84C]" />;
      case 'les-salees':
        return <Sandwich className="w-8 h-8 text-[#C9A84C]" />;
      case 'salades':
        return <Salad className="w-8 h-8 text-[#C9A84C]" />;
      case 'pancakes':
      case 'crepes':
        return <Layers className="w-8 h-8 text-[#C9A84C]" />;
      case 'glaces':
      case 'gateaux-voyage':
        return <Sparkles className="w-8 h-8 text-[#C9A84C]" />;
      case 'mojitos':
      case 'smoothies':
      case 'cocktails':
        return <Wine className="w-8 h-8 text-[#C9A84C]" />;
      case 'jus-presses':
        return <Citrus className="w-8 h-8 text-[#C9A84C]" />;
      default:
        return <UtensilsCrossed className="w-8 h-8 text-[#C9A84C]" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-500 flex items-center justify-center p-0 md:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300"
      id="tableBillboardOverlay"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        className="w-full max-w-[420px] h-full md:h-[88vh] md:max-h-[780px] bg-[#1A1412] text-white flex flex-col relative overflow-hidden md:rounded-[40px] shadow-2xl border border-[#C9A84C]/25"
        id="tableBillboardFrame"
      >
        {/* Top Header Bar */}
        <div className="relative z-30 px-4 pt-10 pb-3 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#7B1F2A] border border-[#C9A84C]/40 flex items-center justify-center">
              <Eye className="w-3.5 h-3.5 text-[#C9A84C]" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#C9A84C]">
                {isRTL ? 'عرض ثلاثي الأبعاد على الطاولة' : '2D Billboard on Table'}
              </div>
              <div className="text-xs font-semibold text-white/90">
                L'Walida Pastry & Coffee Shop
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetPerspective}
              title={isRTL ? 'إعادة ضبط الزاوية' : 'Réinitialiser l’angle'}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 active:scale-95 transition-all text-xs flex items-center gap-1 px-2.5"
            >
              <Rotate3d className="w-3.5 h-3.5 text-[#C9A84C]" />
              <span className="text-[10px] font-medium hidden sm:inline">
                {isRTL ? 'زاوية' : 'Angle'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-all shadow-md"
              aria-label={isRTL ? 'إغلاق' : 'Fermer'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3D Realistic Table Scene Area (Centered ~50% of viewport) */}
        <div
          className="relative flex-1 flex flex-col items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          id="tableSceneStage"
        >
          {/* Ambient Salon & Light Backdrop (Upper half) */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#2B1B17] via-[#201411] to-[#120B09] pointer-events-none">
            {/* Warm Cafe Bokeh and Light Spill */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-[#C9A84C]/10 blur-3xl" />
            <div className="absolute top-16 left-1/4 w-32 h-32 rounded-full bg-[#9B2D3A]/20 blur-2xl" />
            <div className="absolute top-20 right-1/4 w-40 h-40 rounded-full bg-[#D4B96A]/15 blur-2xl" />
          </div>

          {/* Realistic 3D Table Surface (Bottom half) */}
          <div
            className="absolute bottom-0 left-[-20%] right-[-20%] h-[48%] pointer-events-none"
            style={{
              perspective: '800px',
            }}
          >
            {/* Angled Table Plane with Wood & Marble Sheen */}
            <div
              className="w-full h-full origin-bottom"
              style={{
                transform: `rotateX(62deg) translateY(10px) rotateZ(${tilt.y * 0.15}deg)`,
                background:
                  'radial-gradient(ellipse at 50% 30%, #5E3D29 0%, #3B2418 45%, #24140D 80%, #150B07 100%)',
                boxShadow: 'inset 0 20px 40px rgba(255, 255, 255, 0.08)',
                borderTop: '2px solid rgba(201, 168, 76, 0.35)',
              }}
            >
              {/* Table wood grain & light highlights */}
              <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#C9A84C_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/15 to-transparent" />
            </div>
          </div>

          {/* 3D Billboard Container (Occupying ~50% of the screen height) */}
          <div
            className="relative z-20 flex flex-col items-center justify-end w-[85%] max-w-[300px] h-[52%] max-h-[340px] transition-transform duration-75 ease-out mb-8"
            style={{
              perspective: '1000px',
              perspectiveOrigin: '50% 80%',
            }}
          >
            {/* Realistic Contact & Cast Shadows on Table Surface */}
            <div
              className="absolute -bottom-3 z-10 pointer-events-none transition-all duration-100 ease-out"
              style={{
                width: '75%',
                height: '26px',
                transform: `translateX(${tilt.y * 1.8}px) scaleY(${0.65 + tilt.x * 0.02}) scaleX(${1 + Math.abs(tilt.y) * 0.01})`,
              }}
            >
              {/* 1. Deep Contact Shadow right under the billboard base */}
              <div className="w-full h-3 rounded-full bg-black/90 blur-[2px] mx-auto" />
              {/* 2. Soft Ambient Cast Shadow spreading on table */}
              <div className="w-[120%] -ml-[10%] h-8 rounded-full bg-black/60 blur-[10px] -mt-1" />
              {/* 3. Warm Bistro Table specular glow */}
              <div className="w-[80%] h-2 rounded-full bg-[#C9A84C]/15 blur-[4px] mx-auto -mt-6" />
            </div>

            {/* The 2D Billboard Standee */}
            <div
              className="relative w-full h-full flex flex-col items-center justify-end origin-bottom transition-all duration-100 ease-out select-none"
              style={{
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(10px)`,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* If REAL IMAGE is available: Render transparent PNG Billboard */}
              {hasRealImage ? (
                <div className="relative w-full h-full flex items-end justify-center p-2">
                  {/* Subtle rim light on image */}
                  <img
                    src={product.image}
                    alt={name}
                    referrerPolicy="no-referrer"
                    className="max-w-full max-h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
                    onError={() => setImageError(true)}
                  />
                  {/* Transparent Billboard Base Stand Clamp */}
                  <div className="absolute -bottom-1.5 w-24 h-2.5 rounded-xs bg-gradient-to-r from-[#9D7D28] via-[#C9A84C] to-[#9D7D28] shadow-lg border border-[#F0E4C0]/40 flex items-center justify-center">
                    <div className="w-16 h-[1.5px] bg-[#5C1620]" />
                  </div>
                </div>
              ) : (
                /* COMING SOON Luxury Acrylic / Gold Billboard Standee */
                <div className="relative w-[90%] h-[95%] rounded-2xl bg-gradient-to-b from-[#FFFDF9]/95 via-[#F7F2E9]/90 to-[#EDE3D2]/95 backdrop-blur-md p-4 text-[#2D2D2D] shadow-[0_20px_45px_rgba(0,0,0,0.6),0_0_0_1px_rgba(201,168,76,0.5)] flex flex-col items-center justify-between border-2 border-[#C9A84C] relative overflow-hidden">
                  {/* Acrylic Glass Sheen & Highlight overlay */}
                  <div className="absolute -top-12 -left-12 w-40 h-40 bg-gradient-to-br from-white/60 via-transparent to-transparent rotate-45 pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none" />

                  {/* Standee Header */}
                  <div className="w-full flex items-center justify-between border-b border-[#C9A84C]/30 pb-2">
                    <span className="text-[9px] font-bold text-[#7B1F2A] uppercase tracking-wider">
                      {isRTL ? 'قائمة الطعام' : 'Menu Officiel'}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
                      <span className="text-[9px] font-bold text-[#C9A84C] tracking-wide">
                        L'WALIDA
                      </span>
                    </div>
                  </div>

                  {/* Standee Center Visual: Emblem + Category Icon */}
                  <div className="relative my-auto flex flex-col items-center text-center py-2">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7B1F2A] to-[#5C1620] p-1 shadow-lg mb-2 relative">
                      <div className="w-full h-full rounded-full bg-[#7B1F2A] flex items-center justify-center border border-[#C9A84C]/40">
                        {getCategoryIcon(categoryId)}
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#C9A84C] text-[#5C1620] flex items-center justify-center font-bold text-[10px] shadow-xs">
                        ★
                      </div>
                    </div>

                    <h3 className="font-serif text-base font-bold text-[#7B1F2A] line-clamp-1 leading-tight mb-0.5">
                      {name}
                    </h3>
                    <div className="font-serif text-lg font-extrabold text-[#C9A84C] tracking-tight">
                      {price}
                    </div>
                  </div>

                  {/* Standee "COMING SOON" Badge Plaque */}
                  <div className="w-full bg-gradient-to-r from-[#7B1F2A] via-[#9B2D3A] to-[#7B1F2A] text-white py-1.5 px-3 rounded-lg shadow-sm flex items-center justify-between border border-[#C9A84C]/40">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#F0E4C0]">
                      {isRTL ? 'قريباً' : 'COMING SOON'}
                    </span>
                    <span className="text-[8.5px] font-medium text-white/80">
                      {isRTL ? 'صورة حقيقية' : 'Photo réelle'}
                    </span>
                  </div>

                  {/* Solid Acrylic Base Mounting Clips */}
                  <div className="absolute -bottom-1 left-6 w-5 h-3 rounded-t-xs bg-gradient-to-b from-[#C9A84C] to-[#8C6D1F] border border-white/40 shadow-md" />
                  <div className="absolute -bottom-1 right-6 w-5 h-3 rounded-t-xs bg-gradient-to-b from-[#C9A84C] to-[#8C6D1F] border border-white/40 shadow-md" />
                </div>
              )}
            </div>
          </div>

          {/* Interaction Tip / Drag Hint */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-3 py-1 rounded-full bg-black/60 backdrop-blur-xs border border-white/10 text-white/70 text-[10px] font-medium flex items-center gap-1.5">
            <Rotate3d className="w-3 h-3 text-[#C9A84C]" />
            <span>
              {isRTL
                ? 'اسحب بإصبعك لتغيير زاوية الرؤية على الطاولة'
                : 'Glissez pour incliner la vue sur la table'}
            </span>
          </div>

          {/* Navigation Arrows (Prev / Next) */}
          <div className="absolute inset-y-0 left-2 right-2 flex items-center justify-between pointer-events-none z-30">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={handlePrevProduct}
              className={`w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all pointer-events-auto active:scale-90 ${
                !hasPrev ? 'opacity-30 cursor-not-allowed' : 'opacity-90'
              }`}
              aria-label={isRTL ? 'المنتج السابق' : 'Produit précédent'}
            >
              {isRTL ? (
                <ChevronRight className="w-5 h-5 text-[#C9A84C]" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-[#C9A84C]" />
              )}
            </button>

            <button
              type="button"
              disabled={!hasNext}
              onClick={handleNextProduct}
              className={`w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all pointer-events-auto active:scale-90 ${
                !hasNext ? 'opacity-30 cursor-not-allowed' : 'opacity-90'
              }`}
              aria-label={isRTL ? 'المنتج التالي' : 'Produit suivant'}
            >
              {isRTL ? (
                <ChevronLeft className="w-5 h-5 text-[#C9A84C]" />
              ) : (
                <ChevronRight className="w-5 h-5 text-[#C9A84C]" />
              )}
            </button>
          </div>
        </div>

        {/* Bottom Product Details Sheet */}
        <div className="relative z-30 bg-gradient-to-t from-[#120B09] via-[#1D120E] to-[#1D120E]/95 p-4 border-t border-[#C9A84C]/25 shadow-2xl">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#7B1F2A]/60 border border-[#C9A84C]/30 text-[#C9A84C] text-[10px] font-semibold mb-1">
                <span>{name}</span>
              </div>
              <h2 className="font-serif text-xl font-bold text-white leading-snug">
                {name}
              </h2>
            </div>
            <div className="text-right">
              <div className="font-serif text-xl font-extrabold text-[#C9A84C]">
                {price}
              </div>
            </div>
          </div>

          {desc && (
            <p className="text-xs text-white/70 line-clamp-2 leading-relaxed mb-3">
              {desc}
            </p>
          )}

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-1">
            {product?.image && onOpenArCamera && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenArCamera(product);
                }}
                className="py-2.5 px-3 rounded-xl bg-[#C9A84C]/20 hover:bg-[#C9A84C]/30 text-[#C9A84C] font-bold text-xs shadow-md border border-[#C9A84C]/50 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                title={isRTL ? 'معاينة عبر كاميرا AR' : 'Aperçu en Caméra AR'}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isRTL ? 'كاميرا AR' : 'Caméra AR'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onOrderOrSelectToast(name);
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#7B1F2A] to-[#9B2D3A] text-white font-bold text-xs shadow-md border border-[#C9A84C]/30 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#C9A84C]" />
              <span>{isRTL ? `اختيار ${name}` : `Choisir ${name}`}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 font-semibold text-xs active:scale-98 transition-all"
            >
              {isRTL ? 'إغلاق' : 'Fermer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
