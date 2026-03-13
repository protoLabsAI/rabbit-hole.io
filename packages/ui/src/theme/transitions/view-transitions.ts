/**
 * Theme Transition Utilities
 *
 * Implements View Transitions API for smooth theme switching
 * with polygon diagonal wipe animation.
 */

type AnimationVariant = "polygon" | "circle" | "circle-blur" | "none";

interface TransitionOptions {
  variant?: AnimationVariant;
  duration?: number;
}

/**
 * Check if View Transitions API is supported
 */
function isViewTransitionsSupported(): boolean {
  return (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- View Transitions API not in standard types
    typeof (document as any).startViewTransition === "function"
  );
}

/**
 * Start a theme transition with animation
 */
export async function startThemeTransition(
  updateFn: () => void,
  options: TransitionOptions = {}
): Promise<void> {
  const { duration = 500 } = options;

  // Fallback for unsupported browsers
  if (!isViewTransitionsSupported()) {
    updateFn();
    return;
  }

  // Get the document with View Transitions API
  const doc = document as Document & {
    startViewTransition: (callback: () => void) => {
      ready: Promise<void>;
      finished: Promise<void>;
      updateCallbackDone: Promise<void>;
    };
  };

  // Inject animation styles if not already present
  if (!document.getElementById("theme-transition-styles")) {
    const style = document.createElement("style");
    style.id = "theme-transition-styles";
    style.textContent = `
      /* Polygon diagonal wipe animation */
      ::view-transition-old(root),
      ::view-transition-new(root) {
        animation-duration: ${duration}ms;
      }

      ::view-transition-old(root) {
        animation-name: theme-fade-out-polygon;
      }

      ::view-transition-new(root) {
        animation-name: theme-fade-in-polygon;
      }

      @keyframes theme-fade-out-polygon {
        0% {
          clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
        }
        100% {
          clip-path: polygon(100% 0, 100% 0, 100% 100%, 100% 100%);
        }
      }

      @keyframes theme-fade-in-polygon {
        0% {
          clip-path: polygon(0 0, 0 0, 0 100%, 0 100%);
        }
        100% {
          clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
        }
      }

      /* Circle expansion animation */
      @keyframes theme-fade-out-circle {
        0% {
          clip-path: circle(100% at 50% 50%);
        }
        100% {
          clip-path: circle(0% at 50% 50%);
        }
      }

      @keyframes theme-fade-in-circle {
        0% {
          clip-path: circle(0% at 50% 50%);
        }
        100% {
          clip-path: circle(100% at 50% 50%);
        }
      }

      /* Circle with blur */
      @keyframes theme-fade-out-circle-blur {
        0% {
          clip-path: circle(100% at 50% 50%);
          filter: blur(0px);
        }
        100% {
          clip-path: circle(0% at 50% 50%);
          filter: blur(10px);
        }
      }

      @keyframes theme-fade-in-circle-blur {
        0% {
          clip-path: circle(0% at 50% 50%);
          filter: blur(10px);
        }
        100% {
          clip-path: circle(100% at 50% 50%);
          filter: blur(0px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Start the transition
  const transition = doc.startViewTransition(() => {
    updateFn();
  });

  // Wait for transition to complete
  await transition.finished.catch(() => {
    // Transition was skipped or interrupted, that's fine
  });
}

/**
 * React hook for theme transitions
 */
export function useThemeTransition(options: TransitionOptions = {}) {
  const startTransition = async (updateFn: () => void) => {
    await startThemeTransition(updateFn, options);
  };

  return {
    startTransition,
    isSupported: isViewTransitionsSupported(),
  };
}
