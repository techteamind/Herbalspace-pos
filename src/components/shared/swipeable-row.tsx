import type { ReactNode } from "react";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Icon } from "./icon";
import { haptic } from "@/lib/haptic";

interface Props {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function SwipeableRow({ children, onEdit, onDelete }: Props): JSX.Element {
  const x = useMotionValue(0);
  const editOpacity = useTransform(x, [-60, -30], [1, 0]);
  const deleteOpacity = useTransform(x, [30, 60], [0, 1]);

  function handleDragEnd(_: unknown, info: PanInfo): void {
    const offset = info.offset.x;
    if (offset < -80 && onEdit) {
      haptic();
      onEdit();
    } else if (offset > 80 && onDelete) {
      haptic();
      onDelete();
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Left action (swipe right = delete) */}
      {onDelete && (
        <motion.div className="absolute inset-y-0 left-0 w-20 flex items-center justify-center bg-error rounded-l-xl"
          style={{ opacity: deleteOpacity }}>
          <Icon name="delete" className="text-on-error" />
        </motion.div>
      )}
      {/* Right action (swipe left = edit) */}
      {onEdit && (
        <motion.div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-primary rounded-r-xl"
          style={{ opacity: editOpacity }}>
          <Icon name="edit" className="text-on-primary" />
        </motion.div>
      )}
      <motion.div
        drag="x"
        dragConstraints={{ left: onEdit ? -100 : 0, right: onDelete ? 100 : 0 }}
        dragElastic={0.1}
        dragSnapToOrigin
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10 touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
