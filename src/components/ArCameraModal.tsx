import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  RotateCcw,
  Camera,
  SwitchCamera,
  Sparkles,
  Move,
  ZoomIn,
  Zap,
} from 'lucide-react';
import { Language, LocalizedText } from '../types';

export interface ArCameraModalProps {
  isOpen: boolean;
  lang: Language;
  imageUrl: string;
  title: string | LocalizedText;
  subtitle?: string | LocalizedText;
  tagText?: string | LocalizedText;
  price?: string;
  altText?: string;
  overlaySize?: 'small' | 'normal' | 'large';
  onClose: () => void;
  onToast?: (message: string) => void;
}

interface TransformState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export function ArCameraModal({
  isOpen,
  lang,
  imageUrl,
  title,
  subtitle,
  tagText,
  price,
  altText,
  overlaySize = 'normal',
  onClose,
  onToast,
}: ArCameraModalProps) {
  const isRTL = lang === 'ar';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef<boolean>(false);

  // Camera states
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);

  // Transform state: position (dx, dy from center), scale, rotation
  const [transform, setTransform] = useState<TransformState>({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
  });

  // Touch gesture tracking ref
  const gestureRef = useRef<{
    isDragging: boolean;
    startTouches: { id: number; x: number; y: number }[];
    startTransform: TransformState;
    initialDistance: number;
    initialAngle: number;
    lastMousePos: { x: number; y: number };
  }>({
    isDragging: false,
    startTouches: [],
    startTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
    initialDistance: 0,
    initialAngle: 0,
    lastMousePos: { x: 0, y: 0 },
  });

  // Helper: Stop all media tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  // Start Camera Stream
  const startCamera = useCallback(
    async (mode: 'environment' | 'user' = facingMode) => {
      stopCamera();
      setCameraError(null);

      // Check browser support for getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          isRTL
            ? 'الكاميرا غير مدعومة في هذا المتصفح'
            : 'La caméra n’est pas supportée sur ce navigateur'
        );
        return;
      }

      try {
        let stream: MediaStream | null = null;

        // 1. First attempt: ideal constraints with rear camera
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: mode },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
        } catch {
          // 2. Fallback: try without resolution constraints
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: mode,
              },
              audio: false,
            });
          } catch {
            // 3. Fallback: any available video
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        }

        // Check if modal was closed while stream was acquiring
        if (!isMountedRef.current || !isOpen) {
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }
          return;
        }

        if (stream && videoRef.current) {
          streamRef.current = stream;
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');
          await videoRef.current.play().catch(() => {});
          setCameraActive(true);

          // Check if torch is supported on this track
          const track = stream.getVideoTracks()[0];
          if (track) {
            const capabilities =
              typeof track.getCapabilities === 'function' ? track.getCapabilities() : null;
            if (capabilities && (capabilities as any).torch) {
              setHasTorch(true);
            } else {
              setHasTorch(false);
            }
          }
        }
      } catch (err: any) {
        console.error('Camera acquisition error:', err);
        let msg = isRTL
          ? 'تعذر الوصول إلى الكاميرا. يرجى التحقق من الأذونات.'
          : 'Impossible d’accéder à la caméra. Vérifiez les autorisations.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg =
            isRTL
              ? 'تم رفض إذن الكاميرا. يرجى السماح بالوصول للكاميرا في إعدادات المتصفح.'
              : 'Permission caméra refusée. Veuillez l’activer dans les paramètres.';
        }
        if (isMountedRef.current) {
          setCameraError(msg);
        }
      }
    },
    [facingMode, isRTL, stopCamera, isOpen]
  );

  // Toggle torch / flashlight
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextState = !torchOn;
      const constraints: MediaTrackConstraints & { advanced?: Array<{ torch?: boolean }> } = {
        advanced: [{ torch: nextState }],
      };
      await track.applyConstraints(constraints as MediaTrackConstraints);
      setTorchOn(nextState);
    } catch (e) {
      console.warn('Torch constraint not applied', e);
    }
  };

  // Switch between Rear and Front cameras
  const handleSwitchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
    if (onToast) {
      onToast(
        nextMode === 'environment'
          ? isRTL
            ? 'الكاميرا الخلفية'
            : 'Caméra arrière'
          : isRTL
          ? 'الكاميرا الأمامية'
          : 'Caméra frontale'
      );
    }
  };

  // Reset overlay transform
  const handleResetTransform = () => {
    setTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
    if (onToast) {
      onToast(isRTL ? 'تمت إعادة الضبط' : 'Position réinitialisée');
    }
  };

  // Lifecycle: open/close camera stream
  useEffect(() => {
    isMountedRef.current = true;
    if (isOpen) {
      setTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera, facingMode]);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  // Touch & Multi-Touch Gestures
  const getDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getAngle = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      gestureRef.current.isDragging = true;
      gestureRef.current.startTouches = [
        { id: e.touches[0].identifier, x: e.touches[0].clientX, y: e.touches[0].clientY },
      ];
      gestureRef.current.startTransform = { ...transform };
    } else if (e.touches.length >= 2) {
      gestureRef.current.isDragging = true;
      gestureRef.current.startTouches = [
        { id: e.touches[0].identifier, x: e.touches[0].clientX, y: e.touches[0].clientY },
        { id: e.touches[1].identifier, x: e.touches[1].clientX, y: e.touches[1].clientY },
      ];
      gestureRef.current.startTransform = { ...transform };
      gestureRef.current.initialDistance = getDistance(e.touches[0], e.touches[1]);
      gestureRef.current.initialAngle = getAngle(e.touches[0], e.touches[1]);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!gestureRef.current.isDragging) return;

    if (e.touches.length === 1) {
      const currentTouch = e.touches[0];
      const startTouch = gestureRef.current.startTouches[0];
      if (!startTouch) return;

      const deltaX = currentTouch.clientX - startTouch.x;
      const deltaY = currentTouch.clientY - startTouch.y;

      setTransform((prev) => ({
        ...prev,
        x: gestureRef.current.startTransform.x + deltaX,
        y: gestureRef.current.startTransform.y + deltaY,
      }));
    } else if (e.touches.length >= 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      // 1. Pan calculation (midpoint movement)
      const currentMidX = (touch1.clientX + touch2.clientX) / 2;
      const currentMidY = (touch1.clientY + touch2.clientY) / 2;
      const startMidX =
        (gestureRef.current.startTouches[0].x + gestureRef.current.startTouches[1].x) / 2;
      const startMidY =
        (gestureRef.current.startTouches[0].y + gestureRef.current.startTouches[1].y) / 2;

      const deltaMidX = currentMidX - startMidX;
      const deltaMidY = currentMidY - startMidY;

      // 2. Pinch Scale calculation
      const currentDist = getDistance(touch1, touch2);
      const scaleFactor = currentDist / (gestureRef.current.initialDistance || 1);
      const newScale = Math.max(
        0.3,
        Math.min(4.0, gestureRef.current.startTransform.scale * scaleFactor)
      );

      // 3. Rotation calculation
      const currentAngle = getAngle(touch1, touch2);
      const angleDiff = currentAngle - gestureRef.current.initialAngle;
      const newRotation = gestureRef.current.startTransform.rotation + angleDiff;

      setTransform({
        x: gestureRef.current.startTransform.x + deltaMidX,
        y: gestureRef.current.startTransform.y + deltaMidY,
        scale: newScale,
        rotation: newRotation,
      });
    }
  };

  const handleTouchEnd = () => {
    gestureRef.current.isDragging = false;
    gestureRef.current.startTouches = [];
  };

  // Mouse drag & scroll wheel fallback for desktop preview
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    gestureRef.current.isDragging = true;
    gestureRef.current.lastMousePos = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gestureRef.current.isDragging) return;

    const deltaX = e.clientX - gestureRef.current.lastMousePos.x;
    const deltaY = e.clientY - gestureRef.current.lastMousePos.y;

    setTransform((prev) => ({
      ...prev,
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));

    gestureRef.current.lastMousePos = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    gestureRef.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.3, Math.min(4.0, prev.scale + zoomDelta)),
    }));
  };

  if (!isOpen) return null;

  const displayTitle = typeof title === 'object' ? title[lang] : title;
  const displaySubtitle =
    subtitle ? (typeof subtitle === 'object' ? subtitle[lang] : subtitle) : null;
  const displayTag =
    tagText ? (typeof tagText === 'object' ? tagText[lang] : tagText) : null;

  const sizeClasses =
    overlaySize === 'large'
      ? 'w-64 sm:w-80 max-w-[85vw]'
      : overlaySize === 'small'
      ? 'w-44 sm:w-52 max-w-[70vw]'
      : 'w-56 sm:w-64 max-w-[80vw]';

  return (
    <div
      className="fixed inset-0 z-500 bg-black flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-300"
      id="arCameraViewer"
      dir={isRTL ? 'rtl' : 'ltr'}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 1. Fullscreen Live Camera Video Feed */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
        style={{
          transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
        }}
      />

      {/* Camera Dark Gradient Overlay for Header & Footer Legibility */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-black/70 via-transparent to-black/80" />

      {/* 2. Camera Error or Permission Denied Notice */}
      {cameraError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-black/80 backdrop-blur-md">
          <div className="w-16 h-16 rounded-full bg-[#7B1F2A]/90 border border-[#C9A84C]/50 flex items-center justify-center mb-4 shadow-xl">
            <Camera className="w-8 h-8 text-[#C9A84C]" />
          </div>
          <h3 className="font-serif text-lg font-bold text-white mb-2">
            {isRTL ? 'إذن الكاميرا مطلوب' : 'Accès Caméra Requis'}
          </h3>
          <p className="text-xs text-white/80 max-w-xs mb-5 leading-relaxed">
            {cameraError}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => startCamera(facingMode)}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#7B1F2A] to-[#9B2D3A] text-white text-xs font-bold shadow-lg border border-[#C9A84C]/50 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#C9A84C]" />
              <span>{isRTL ? 'إعادة المحاولة' : 'Réessayer'}</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-full bg-white/15 text-white text-xs font-semibold hover:bg-white/25 active:scale-95 transition-all"
            >
              {isRTL ? 'إغلاق' : 'Fermer'}
            </button>
          </div>
        </div>
      )}

      {/* 3. Top Controls Bar */}
      <header className="relative z-40 px-4 pt-10 pb-3 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2.5 max-w-[65%]">
          <div className="w-8 h-8 rounded-full bg-[#7B1F2A]/90 border border-[#C9A84C]/60 flex items-center justify-center shadow-md shrink-0">
            <Sparkles className="w-4 h-4 text-[#C9A84C]" />
          </div>
          <div className="truncate">
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#C9A84C]">
              {displaySubtitle || (isRTL ? 'واقع معزز • AR Camera' : 'AR Camera • Live View')}
            </div>
            <div className="text-xs font-bold text-white drop-shadow-sm truncate">
              {displayTitle}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Torch button (if supported) */}
          {hasTorch && (
            <button
              type="button"
              onClick={handleToggleTorch}
              className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all active:scale-90 border ${
                torchOn
                  ? 'bg-[#C9A84C] text-[#5C1620] border-white'
                  : 'bg-black/40 text-white/80 border-white/20 hover:bg-black/60'
              }`}
              title={isRTL ? 'الفلاش' : 'Lampe torche'}
            >
              <Zap className="w-4 h-4" />
            </button>
          )}

          {/* Switch Camera button */}
          <button
            type="button"
            onClick={handleSwitchCamera}
            className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 active:scale-90 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all shadow-md"
            title={isRTL ? 'تبديل الكاميرا' : 'Changer de caméra'}
          >
            <SwitchCamera className="w-4 h-4 text-[#C9A84C]" />
          </button>

          {/* Reset position button */}
          <button
            type="button"
            onClick={handleResetTransform}
            className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 active:scale-90 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all shadow-md"
            title={isRTL ? 'إعادة ضبط الموضع' : 'Centrer'}
          >
            <RotateCcw className="w-4 h-4 text-[#C9A84C]" />
          </button>

          {/* Close (X) button */}
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 active:scale-90 backdrop-blur-md text-white border border-white/30 flex items-center justify-center transition-all shadow-lg ml-1"
            aria-label={isRTL ? 'إغلاق' : 'Fermer'}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      {/* 4. Interactive AR Overlay (Preserves PNG Transparency) */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center z-30 pointer-events-none overflow-hidden">
        <div
          id="arInteractiveContainer"
          className="absolute cursor-grab active:cursor-grabbing pointer-events-auto touch-none select-none flex items-center justify-center"
          style={{
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
            transformOrigin: 'center center',
            transition: gestureRef.current.isDragging ? 'none' : 'transform 0.05s ease-out',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
        >
          {/* Transparent Raw PNG with subtle dynamic shadow */}
          <div className="relative group p-2 flex flex-col items-center">
            {displayTag && (
              <span className="mb-2 px-2.5 py-0.5 rounded-full bg-[#7B1F2A]/80 border border-[#C9A84C]/40 text-[#C9A84C] text-[10px] font-bold shadow-md">
                {displayTag}
              </span>
            )}
            <img
              src={imageUrl}
              alt={altText || displayTitle}
              referrerPolicy="no-referrer"
              draggable={false}
              className={`${sizeClasses} h-auto object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)] pointer-events-none`}
            />
            {price && (
              <div className="mt-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-[#C9A84C]/50 text-[#C9A84C] font-bold text-xs shadow-lg">
                {price}
              </div>
            )}
            {/* Subtle corner handles showing interaction area on touch */}
            <div className="absolute inset-0 rounded-2xl border border-white/20 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 5. Bottom Instructions & HUD Overlay */}
      <footer className="relative z-40 px-4 pb-8 pt-3 pointer-events-auto flex flex-col items-center text-center">
        {/* Floating Gesture Hint Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-[#C9A84C]/40 text-white/90 text-[11px] font-medium shadow-lg mb-3">
          <Move className="w-3.5 h-3.5 text-[#C9A84C]" />
          <span>
            {isRTL
              ? 'اسحب للتحريك • قرصة بالإصبعين للتكبير والتصغير والتدوير'
              : 'Glissez pour déplacer • Pincez pour zoomer & pivoter'}
          </span>
        </div>

        {/* Quick Action Bottom Bar */}
        <div className="w-full max-w-sm flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetTransform}
            className="flex-1 py-2.5 px-3 rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white text-xs font-semibold active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#C9A84C]" />
            <span>{isRTL ? 'إعادة ضبط' : 'Réinitialiser'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTransform((prev) => ({
                ...prev,
                scale: Math.min(3.5, prev.scale + 0.25),
              }));
            }}
            className="py-2.5 px-4 rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white text-xs font-semibold active:scale-95 transition-all flex items-center gap-1.5"
            title={isRTL ? 'تكبير' : 'Agrandir'}
          >
            <ZoomIn className="w-3.5 h-3.5 text-[#C9A84C]" />
            <span>+</span>
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#7B1F2A] to-[#9B2D3A] border border-[#C9A84C]/40 text-white text-xs font-bold active:scale-95 shadow-md transition-all"
          >
            {isRTL ? 'تم' : 'Terminer'}
          </button>
        </div>
      </footer>
    </div>
  );
}
