import { useState } from 'react';
import {
  UtensilsCrossed,
  Coffee,
  Sparkles,
  Layers,
  Salad,
  Sandwich,
  CupSoda,
  Wine,
  Citrus,
  Eye,
} from 'lucide-react';
import { Language } from '../types';

interface ProductPlaceholderProps {
  variant: 'showcase' | 'card' | 'category' | 'side';
  categoryId?: string;
  image?: string;
  altText?: string;
  lang?: Language;
  onViewOnTable?: () => void;
  className?: string;
  showTableButton?: boolean;
}

export function ProductPlaceholder({
  variant,
  categoryId = 'patisserie',
  image,
  altText = "L'Walida Pastry & Coffee Shop",
  lang = 'fr',
  onViewOnTable,
  className = '',
  showTableButton = false,
}: ProductPlaceholderProps) {
  const [imageError, setImageError] = useState(false);
  const hasRealImage = Boolean(image && image.trim() !== '' && !imageError);
  const isRTL = lang === 'ar';

  // If a real image exists and has not errored, render it directly
  if (hasRealImage) {
    const defaultClasses =
      variant === 'side'
        ? 'w-full h-full object-cover rounded-full'
        : 'w-full h-full object-cover';
    return (
      <img
        src={image}
        alt={altText}
        referrerPolicy="no-referrer"
        loading="lazy"
        className={className || defaultClasses}
        onError={() => setImageError(true)}
      />
    );
  }

  // Category Icon Resolver for clean elegant SVGs
  const renderCategoryIcon = (cat: string, sizeClass = 'w-6 h-6') => {
    switch (cat) {
      case 'patisserie':
        return <Sparkles className={`${sizeClass} text-[#C9A84C]`} />;
      case 'viennoiserie':
        return <Layers className={`${sizeClass} text-[#C9A84C]`} />;
      case 'boissons-chaudes':
        return <Coffee className={`${sizeClass} text-[#C9A84C]`} />;
      case 'ice-latte':
        return <CupSoda className={`${sizeClass} text-[#C9A84C]`} />;
      case 'brunch':
        return <UtensilsCrossed className={`${sizeClass} text-[#C9A84C]`} />;
      case 'les-salees':
        return <Sandwich className={`${sizeClass} text-[#C9A84C]`} />;
      case 'salades':
        return <Salad className={`${sizeClass} text-[#C9A84C]`} />;
      case 'pancakes':
      case 'crepes':
        return <Layers className={`${sizeClass} text-[#C9A84C]`} />;
      case 'glaces':
      case 'gateaux-voyage':
        return <Sparkles className={`${sizeClass} text-[#C9A84C]`} />;
      case 'mojitos':
      case 'smoothies':
      case 'cocktails':
        return <Wine className={`${sizeClass} text-[#C9A84C]`} />;
      case 'jus-presses':
        return <Citrus className={`${sizeClass} text-[#C9A84C]`} />;
      default:
        return <UtensilsCrossed className={`${sizeClass} text-[#C9A84C]`} />;
    }
  };

  // 1. Category Ring Icon
  if (variant === 'category') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FFFDF9] to-[#F2E8DC] text-[#7B1F2A] relative group">
        <div className="w-9 h-9 rounded-full bg-[#7B1F2A]/8 flex items-center justify-center border border-[#C9A84C]/25 transition-transform duration-300 group-hover:scale-110">
          {renderCategoryIcon(categoryId, 'w-5 h-5')}
        </div>
      </div>
    );
  }

  // 2. Side Floating Depth Preview in Showcase
  if (variant === 'side') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#8C2330] to-[#50131B] border border-[#C9A84C]/30 flex items-center justify-center p-2 rounded-xl shadow-inner">
        <div className="w-6 h-6 rounded-full bg-[#C9A84C]/15 flex items-center justify-center border border-[#C9A84C]/20">
          {renderCategoryIcon(categoryId, 'w-3.5 h-3.5')}
        </div>
      </div>
    );
  }

  // 3. Main Hero Showcase Placeholder (Large circular disk)
  if (variant === 'showcase') {
    return (
      <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-b from-[#8E222F] via-[#701A24] to-[#4A1018] select-none group">
        {/* Subtle patterned rings */}
        <div className="absolute inset-2 rounded-full border border-[#C9A84C]/20 pointer-events-none" />
        <div className="absolute inset-5 rounded-full border border-dashed border-[#C9A84C]/25 pointer-events-none animate-[spin_60s_linear_infinite]" />

        {/* Center Bakery Emblem */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#9D7D28] p-[1.5px] shadow-lg mb-2 transform transition-transform group-hover:scale-105">
            <div className="w-full h-full rounded-full bg-[#5C1620] flex items-center justify-center">
              {renderCategoryIcon(categoryId, 'w-7 h-7')}
            </div>
          </div>

          <span className="font-serif text-white/95 text-sm font-semibold tracking-wider uppercase mb-1">
            {isRTL ? 'قريباً' : 'COMING SOON'}
          </span>
          <span className="text-[10px] text-[#D4B96A] font-medium tracking-wide">
            {isRTL ? 'صورة المنتج الحقيقية قريباً' : 'Photo réelle bientôt'}
          </span>
        </div>

        {/* View on table hover / tap prompt */}
        {showTableButton && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewOnTable?.();
            }}
            className="absolute bottom-3 z-20 px-3.5 py-1.5 rounded-full bg-[#C9A84C] text-[#4A1018] text-[11px] font-bold shadow-md hover:bg-[#D4B96A] active:scale-95 transition-all flex items-center gap-1.5"
            aria-label={isRTL ? 'عرض على الطاولة' : 'Voir sur table'}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isRTL ? 'عرض على الطاولة' : 'Voir sur table'}</span>
          </button>
        )}
      </div>
    );
  }

  // 4. Product Card Placeholder in Popular / Category Grid
  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-br from-[#FDFBF7] to-[#EDE3D4] p-3 select-none overflow-hidden group">
      {/* Decorative subtle texture & borders */}
      <div className="absolute inset-1.5 rounded-lg border border-[#C9A84C]/20 pointer-events-none" />

      {/* Center Icon */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7B1F2A]/10 to-[#C9A84C]/15 flex items-center justify-center border border-[#C9A84C]/30 mb-2 transition-transform duration-300 group-hover:scale-110">
        {renderCategoryIcon(categoryId, 'w-5 h-5')}
      </div>

      {/* Coming Soon Pill */}
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7B1F2A]/90 text-white shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse"></span>
        <span className="text-[9px] font-bold tracking-wider uppercase">
          {isRTL ? 'قريباً' : 'COMING SOON'}
        </span>
      </div>

      {/* View on Table button overlay on hover/mobile */}
      {showTableButton && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewOnTable?.();
          }}
          className="absolute inset-0 bg-[#5C1620]/80 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1 p-2"
          aria-label={isRTL ? 'عرض على الطاولة' : 'Voir sur table'}
        >
          <div className="w-8 h-8 rounded-full bg-[#C9A84C] text-[#5C1620] flex items-center justify-center shadow-md">
            <Eye className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold tracking-wide text-center">
            {isRTL ? 'عرض على الطاولة' : 'Voir sur table'}
          </span>
        </button>
      )}
    </div>
  );
}
