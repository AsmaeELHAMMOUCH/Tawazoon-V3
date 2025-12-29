/**
 * Hook personnalisé pour debounce des valeurs
 * 
 * Retarde la mise à jour d'une valeur jusqu'à ce que l'utilisateur
 * arrête de la modifier pendant un certain délai.
 * 
 * Usage:
 * ```jsx
 * const [value, setValue] = useState('');
 * const debouncedValue = useDebouncedValue(value, 300);
 * 
 * // debouncedValue se met à jour 300ms après la dernière modification
 * useEffect(() => {
 *   // Faire des calculs lourds avec debouncedValue
 * }, [debouncedValue]);
 * ```
 */

import { useState, useEffect } from 'react';

export function useDebouncedValue(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Créer un timer qui met à jour la valeur après le délai
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Nettoyer le timer si la valeur change avant la fin du délai
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}


/**
 * Hook pour debounce d'une callback
 * 
 * Usage:
 * ```jsx
 * const handleSearch = useDebouncedCallback((searchTerm) => {
 *   // Appel API
 *   fetchResults(searchTerm);
 * }, 500);
 * 
 * <input onChange={(e) => handleSearch(e.target.value)} />
 * ```
 */

import { useCallback, useRef } from 'react';

export function useDebouncedCallback(callback, delay = 300) {
    const timeoutRef = useRef(null);

    const debouncedCallback = useCallback(
        (...args) => {
            // Annuler le timer précédent
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Créer un nouveau timer
            timeoutRef.current = setTimeout(() => {
                callback(...args);
            }, delay);
        },
        [callback, delay]
    );

    // Nettoyer le timer au démontage
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return debouncedCallback;
}


/**
 * Hook pour throttle (limite la fréquence d'exécution)
 * 
 * Différence avec debounce :
 * - Debounce : attend que l'utilisateur arrête
 * - Throttle : exécute au maximum une fois par intervalle
 * 
 * Usage:
 * ```jsx
 * const handleScroll = useThrottledCallback(() => {
 *   console.log('Scroll position:', window.scrollY);
 * }, 100);
 * 
 * window.addEventListener('scroll', handleScroll);
 * ```
 */

export function useThrottledCallback(callback, delay = 100) {
    const lastRun = useRef(Date.now());
    const timeoutRef = useRef(null);

    const throttledCallback = useCallback(
        (...args) => {
            const now = Date.now();
            const timeSinceLastRun = now - lastRun.current;

            if (timeSinceLastRun >= delay) {
                // Exécuter immédiatement
                callback(...args);
                lastRun.current = now;
            } else {
                // Planifier pour la fin de l'intervalle
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }

                timeoutRef.current = setTimeout(() => {
                    callback(...args);
                    lastRun.current = Date.now();
                }, delay - timeSinceLastRun);
            }
        },
        [callback, delay]
    );

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return throttledCallback;
}


/**
 * Hook pour gérer plusieurs valeurs debouncées
 * 
 * Usage:
 * ```jsx
 * const [volumes, setVolumes] = useState({
 *   colis: 0,
 *   courrier: 0,
 *   amana: 0
 * });
 * 
 * const debouncedVolumes = useDebouncedObject(volumes, 300);
 * ```
 */

export function useDebouncedObject(obj, delay = 300) {
    const [debouncedObj, setDebouncedObj] = useState(obj);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedObj(obj);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [obj, delay]);

    return debouncedObj;
}


/**
 * Hook pour afficher un indicateur de "typing..."
 * 
 * Usage:
 * ```jsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const isTyping = useIsTyping(searchTerm, 300);
 * 
 * return (
 *   <div>
 *     <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
 *     {isTyping && <span>Recherche en cours...</span>}
 *   </div>
 * );
 * ```
 */

export function useIsTyping(value, delay = 300) {
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        setIsTyping(true);

        const handler = setTimeout(() => {
            setIsTyping(false);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return isTyping;
}


// Export par défaut
export default useDebouncedValue;
