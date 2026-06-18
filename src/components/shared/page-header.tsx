import { Icon } from "./icon";

interface PageHeaderProps {
  title: string;
  leftIcon?: string;
  rightIcon?: string;
  onLeft?: () => void;
  onRight?: () => void;
}

export function PageHeader({
  title, leftIcon = "menu", rightIcon, onLeft, onRight,
}: PageHeaderProps): JSX.Element {
  return (
    <header className="bg-surface sticky top-0 z-40">
      <div className="flex justify-between items-center w-full px-container-padding h-20 py-4">
        <button aria-label="left" onClick={onLeft}
          className="text-primary hover:bg-surface-container-low active:opacity-80 transition-opacity p-2 -ml-2 rounded-full">
          <Icon name={leftIcon} />
        </button>
        <div className="flex-1 flex justify-center items-center">
          <h1 className="font-h1 text-h1 text-primary truncate">{title}</h1>
        </div>
        <button aria-label="right" onClick={onRight}
          className="text-primary hover:bg-surface-container-low active:opacity-80 transition-opacity p-2 -mr-2 rounded-full">
          {rightIcon ? <Icon name={rightIcon} /> : <span className="w-6" />}
        </button>
      </div>
    </header>
  );
}
