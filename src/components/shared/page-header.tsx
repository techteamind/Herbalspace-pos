import { Icon } from "./icon";

interface PageHeaderProps {
  title: string;
  leftIcon?: string;
  rightIcon?: string;
  rightBadge?: number;
  onLeft?: () => void;
  onRight?: () => void;
}

export function PageHeader({
  title, leftIcon = "menu", rightIcon, rightBadge, onLeft, onRight,
}: PageHeaderProps): JSX.Element {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80">
      <div className="flex items-center w-full px-container-padding h-14 gap-2">
        {onLeft ? (
          <button aria-label="left" onClick={onLeft}
            className="text-on-surface active:scale-90 transition-transform p-2 -ml-2 rounded-xl">
            <Icon name={leftIcon} />
          </button>
        ) : <span className="w-10" />}
        <h1 className="flex-1 font-h1 text-h1 text-on-surface truncate">{title}</h1>
        {(rightIcon || rightBadge != null) && (
          <button aria-label="right" onClick={onRight}
            className="relative text-on-surface-variant active:scale-90 transition-transform p-2 -mr-2 rounded-xl">
            {rightIcon ? <Icon name={rightIcon} /> : <span className="w-6" />}
            {rightBadge != null && rightBadge > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-error text-on-error text-[9px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                {rightBadge > 9 ? "9+" : rightBadge}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
