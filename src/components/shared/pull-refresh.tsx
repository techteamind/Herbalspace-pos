import { Icon } from "./icon";

interface Props {
  distance: number;
  refreshing: boolean;
  threshold?: number;
}

export function PullRefreshIndicator({ distance, refreshing, threshold = 80 }: Props): JSX.Element | null {
  if (distance <= 0 && !refreshing) return null;
  const progress = Math.min(distance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div className="flex justify-center overflow-hidden transition-[height] duration-150"
      style={{ height: refreshing ? 48 : distance }}>
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-lowest shadow-elevation-2 mt-1"
        style={{ opacity: Math.min(progress * 1.5, 1), transform: `scale(${0.5 + progress * 0.5})` }}>
        {refreshing ? (
          <Icon name="progress_activity" className="text-primary text-[22px] animate-spin" />
        ) : (
          <Icon name="arrow_downward" className="text-primary text-[22px] transition-transform"
            style={{ transform: `rotate(${rotation}deg)` }} />
        )}
      </div>
    </div>
  );
}
