import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { trapFocus, generateId, announceToScreenReader } from '../../utils/accessibility';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  children: React.ReactNode;
  className?: string;
}

const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  closeOnBackdrop = true,
  showCloseButton = true,
  children,
  className,
}) => {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useRef(generateId('modal-title'));
  const descriptionId = React.useRef(generateId('modal-description'));
  const hasInitiallyFocused = React.useRef(false);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    let removeFocusTrap: (() => void) | undefined;

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';

      // Anunciar abertura do modal para screen readers
      if (title) {
        announceToScreenReader(`Modal aberto: ${title}`, 'assertive');
      }

      // Configurar trap de foco quando o modal estiver montado
      setTimeout(() => {
        if (modalRef.current) {
          removeFocusTrap = trapFocus(modalRef.current);

          // Apenas focar inicialmente, não em re-renders subsequentes
          if (!hasInitiallyFocused.current) {
            hasInitiallyFocused.current = true;
            // Focar no primeiro input/textarea ao invés do botão de fechar
            const firstInput = modalRef.current.querySelector(
              'input, select, textarea'
            ) as HTMLElement;
            if (firstInput) {
              firstInput.focus();
            } else {
              // Fallback: focar no primeiro elemento focalizável que não seja o botão de fechar
              const focusableElements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
              );
              // Pular o primeiro elemento se for o botão de fechar
              const firstFocusable = focusableElements[1] || focusableElements[0];
              if (firstFocusable) {
                (firstFocusable as HTMLElement).focus();
              }
            }
          }
        }
      }, 100);
    } else {
      // Reset flag quando modal fechar
      hasInitiallyFocused.current = false;
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
      removeFocusTrap?.();
    };
  }, [isOpen, onClose, title]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId.current : undefined}
            aria-describedby={description ? descriptionId.current : undefined}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{
              duration: 0.2,
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            className={cn(
              'relative w-full glass-card p-6 m-4 max-h-[90vh] overflow-auto',
              modalSizes[size],
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between mb-4">
                <div>
                  {title && (
                    <h2 id={titleId.current} className="text-xl font-semibold text-white">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id={descriptionId.current} className="text-sm text-gray-300 mt-1">
                      {description}
                    </p>
                  )}
                </div>

                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                    aria-label="Fechar modal"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="text-white">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Componentes auxiliares para estrutura do Modal
export const ModalHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('flex flex-col space-y-1.5 pb-4 border-b border-white/10', className)} {...props}>
    {children}
  </div>
);

export const ModalBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('py-4', className)} {...props}>
    {children}
  </div>
);

export const ModalFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('flex items-center justify-end space-x-2 pt-4 border-t border-white/10', className)} {...props}>
    {children}
  </div>
);