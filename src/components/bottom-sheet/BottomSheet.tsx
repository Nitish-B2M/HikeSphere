import { motion, useDragControls, type PanInfo } from 'framer-motion';
import { type ReactNode, useEffect, useState } from 'react';
import { useUIStore, type SheetSnap } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  children: ReactNode;
  header?: ReactNode;
  className?: string;
}

const SNAP_HEIGHTS: Record<SheetSnap, number> = {
  collapsed: 80,
  half: 0.45,
  full: 0.9,
};

function heightFor(snap: SheetSnap, vh: number): number {
  const v = SNAP_HEIGHTS[snap];
  return v < 1 ? Math.round(v * vh) : v;
}

export function BottomSheet({ children, header, className }: BottomSheetProps) {
  const { sheetSnap, setSheetSnap } = useUIStore();
  const [vh, setVh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 800));
  const dragControls = useDragControls();

  useEffect(() => {
    const handler = () => setVh(window.innerHeight);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const height = heightFor(sheetSnap, vh);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const velocity = info.velocity.y;
    const offset = info.offset.y;
    // Determine intent: large upward = expand; large downward = collapse.
    let next: SheetSnap = sheetSnap;
    if (offset < -60 || velocity < -400) {
      next = sheetSnap === 'collapsed' ? 'half' : 'full';
    } else if (offset > 60 || velocity > 400) {
      next = sheetSnap === 'full' ? 'half' : 'collapsed';
    }
    setSheetSnap(next);
  }

  return (
    <motion.div
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.05}
      onDragEnd={handleDragEnd}
      animate={{ height }}
      transition={{ type: 'spring', damping: 30, stiffness: 280 }}
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 bg-white rounded-t-2xl shadow-2xl flex flex-col pb-safe',
        className
      )}
      style={{ touchAction: 'none' }}
    >
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="pt-2 pb-1 flex flex-col items-center cursor-grab active:cursor-grabbing select-none"
      >
        <div className="h-1.5 w-12 rounded-full bg-gray-300" />
      </div>
      {header && <div className="px-4">{header}</div>}
      <div
        className="flex-1 overflow-auto scrollbar-thin px-4 pb-4"
        style={{ touchAction: 'auto' }}
      >
        {children}
      </div>
    </motion.div>
  );
}
