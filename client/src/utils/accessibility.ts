// Utilitários para acessibilidade

// Gerar IDs únicos para associar labels com inputs
export const generateId = (prefix: string = 'component'): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

// Anunciar mudanças para screen readers
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove o elemento após um tempo para não poluir o DOM
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Verificar se o usuário prefere animações reduzidas
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Focar no primeiro elemento focalizável dentro de um container
export const focusFirstFocusableElement = (container: HTMLElement): boolean => {
  const focusableElements = container.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0] as HTMLElement;
  if (firstElement) {
    firstElement.focus();
    return true;
  }
  return false;
};

// Capturar foco dentro de um container (útil para modais)
export const trapFocus = (container: HTMLElement): (() => void) => {
  const focusableElements = container.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleTabKeyPress = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  container.addEventListener('keydown', handleTabKeyPress);

  // Função para remover o listener
  return () => {
    container.removeEventListener('keydown', handleTabKeyPress);
  };
};