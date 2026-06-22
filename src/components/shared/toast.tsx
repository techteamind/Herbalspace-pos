import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./icon";

type ToastType = "success" | "error" | "info";
interface Toast { id: number; message: string; type: ToastType }

const Ctx = createContext<(message: string, type?: ToastType) => void>(() => {});
export const useToast = () => useContext(Ctx);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = ++nextId;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[80] flex flex-col items-center gap-2 pointer-events-none max-w-3xl w-full px-container-padding">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg pointer-events-auto w-full ${
                t.type === "success" ? "bg-primary-container text-on-primary-container" :
                t.type === "error" ? "bg-error-container text-on-error-container" :
                "bg-inverse-surface text-inverse-on-surface"
              }`}>
              <Icon name={t.type === "success" ? "check_circle" : t.type === "error" ? "error" : "info"} className="text-[20px] shrink-0" />
              <span className="font-body-md text-body-md font-semibold flex-1">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
