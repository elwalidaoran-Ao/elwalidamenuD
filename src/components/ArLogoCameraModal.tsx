import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  RotateCcw,
  Camera,
  SwitchCamera,
  AlertCircle,
  Sparkles,
  Move,
  Maximize2,
  ZoomIn,
  Zap,
} from 'lucide-react';
import { Language } from '../types';
import { restaurantInfo } from '../data/menuData';

interface ArLogoCameraModalProps {
  isOpen: boolean;
  lang: Language;
  onClose: () => void;
  onToast?: (message: string) => void;
}

interface TransformState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export function ArLogoCameraModal({
  isOpen,
  lang,
  onClose,
  onToast,
}: ArLogoCameraModalProps) {
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

  // Logo transform state: position (dx, dy from center), scale, rotation
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

  const logoUrl =
    restaurantInfo.logoUrl ||
    'https://raw.githubusercontent.com/okba2272-ops/Products-P/main/logo.png';

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
        try {
          // 1. Try ideal facingMode first
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
              video: { facingMode: mode },
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

          // Check if torch/flashlight is supported
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            const capabilities = (videoTrack.getCapabilities?.() || {}) as {
              torch?: boolean;
            };
            setHasTorch(Boolean(capabilities.torch));
          }
        }
      } catch (err: unknown) {
        console.error('Camera access error:', err);
        const error = err as { name?: string; message?: string };
        let msg =
          isRTL
            ? 'تعذر الوصول إلى الكاميرا. يرجى منح الإذن في المتصفح.'
            : 'Impossible d’accéder à la caméra. Veuillez autoriser l’accès.';
        if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
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

  // Switch between Rear and Front camera
  const handleSwitchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Reset logo transform to center, normal size, 0 rotation
  const handleResetTransform = () => {
    setTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
    onToast?.(isRTL ? 'تمت إعادة ضبط موضع الشعار' : 'Position du logo réinitialisée');
  };

  // Close handler
  const handleClose = () => {
    stopCamera();
    onClose();
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
      if (isOpen && e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Math helper functions for multi-touch pinch & rotate
  const getDistance = (t1: { x: number; y: number }, t2: { x: number; y: number }) => {
    const dx = t1.x - t2.x;
    const dy = t1.y - t2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getAngle = (t1: { x: number; y: number }, t2: { x: number; y: number }) => {
    return (Math.atan2(t2.y - t1.y, t2.x - t1.x) * 180) / Math.PI;
  };

  // Touch Event Handlers on AR Logo container
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const touches = Array.from(e.touches).map((t: React.Touch) => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY,
    }));

    gestureRef.current.isDragging = true;
    gestureRef.current.startTouches = touches;
    gestureRef.current.startTransform = { ...transform };

    if (touches.length >= 2) {
      gestureRef.current.initialDistance = getDistance(touches[0], touches[1]);
      gestureRef.current.initialAngle = getAngle(touches[0], touches[1]);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!gestureRef.current.isDragging) return;
    e.stopPropagation();

    const touches = Array.from(e.touches).map((t: React.Touch) => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY,
    }));

    if (touches.length === 1 && gestureRef.current.startTouches.length >= 1) {
      // 1-Finger Drag
      const startT = gestureRef.current.startTouches[0];
      const deltaX = touches[0].x - startT.x;
      const deltaY = touches[0].y - startT.y;

      setTransform((prev) => ({
        ...prev,
        x: gestureRef.current.startTransform.x + deltaX,
        y: gestureRef.current.startTransform.y + deltaY,
      }));
    } else if (touches.length >= 2 && gestureRef.current.startTouches.length >= 2) {
      // 2-Finger Pinch to Zoom + Rotate + Drag center
      const currentDist = getDistance(touches[0], touches[1]);
      const currentAngle = getAngle(touches[0], touches[1]);

      const initialDist = gestureRef.current.initialDistance || 1;
      const scaleFactor = currentDist / initialDist;
      const newScale = Math.max(0.3, Math.min(4.0, gestureRef.current.startTransform.scale * scaleFactor));

      const angleDelta = currentAngle - gestureRef.current.initialAngle;
      const newRotation = gestureRef.current.startTransform.rotation + angleDelta;

      // Also compute center point translation
      const startCenter = {
        x: (gestureRef.current.startTouches[0].x + gestureRef.current.startTouches[1].x) / 2,
        y: (gestureRef.current.startTouches[0].y + gestureRef.current.startTouches[1].y) / 2,
      };
      const currentCenter = {
        x: (touches[0].x + touches[1].x) / 2,
        y: (touches[0].y + touches[1].y) / 2,
      };
      const deltaCenterX = currentCenter.x - startCenter.x;
      const deltaCenterY = currentCenter.y - startCenter.y;

      setTransform({
        x: gestureRef.current.startTransform.x + deltaCenterX,
        y: gestureRef.current.startTransform.y + deltaCenterY,
        scale: newScale,
        rotation: newRotation,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) {
      gestureRef.current.isDragging = false;
      gestureRef.current.startTouches = [];
    } else if (e.touches.length === 1) {
      // Transitioned from 2 fingers to 1 finger
      const t = e.touches[0];
      gestureRef.current.startTouches = [{ id: t.identifier, x: t.clientX, y: t.clientY }];
      gestureRef.current.startTransform = { ...transform };
    }
  };

  // Mouse fallback handlers for desktop preview
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    gestureRef.current.isDragging = true;
    gestureRef.current.lastMousePos = { x: e.clientX, y: e.clientY };
    gestureRef.current.startTransform = { ...transform };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gestureRef.current.isDragging) return;
    e.stopPropagation();
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

  return (
    <div
      className="fixed inset-0 z-500 bg-black flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-300"
      id="arLogoCameraViewer"
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
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#7B1F2A]/90 border border-[#C9A84C]/60 flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4 text-[#C9A84C]" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#C9A84C]">
              {isRTL ? 'واقع معزز • AR Logo' : 'AR Camera • Live View'}
            </div>
            <div className="text-xs font-bold text-white drop-shadow-sm">
              EL Walida Pastry & Coffee Shop
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            title={isRTL ? 'إعادة ضبط الموضع' : 'Centrer le logo'}
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

      {/* 4. Interactive AR Logo Overlay (Preserves PNG Transparency) */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center z-30 pointer-events-none overflow-hidden">
        <div
          id="arLogoInteractiveContainer"
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
          {/* Transparent Raw PNG Logo with subtle dynamic shadow */}
          <div className="relative group p-2">
            <img
              src={logoUrl}
              alt="EL Walida Pastry & Coffee Shop Official Logo"
              draggable={false}
              className="w-56 sm:w-64 max-w-[80vw] h-auto object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.55)] pointer-events-none"
            />
            {/* Subtle corner handles showing interaction area */}
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
            onClick={handleClose}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#7B1F2A] to-[#9B2D3A] border border-[#C9A84C]/40 text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <X className="w-3.5 h-3.5 text-[#C9A84C]" />
            <span>{isRTL ? 'الرجوع للقائمة' : 'Retour au Menu'}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
