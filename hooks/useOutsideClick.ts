import { RefObject, useEffect } from 'react';

/**
 * useOutsideClick
 *
 * A custom hook that detects clicks outside a specified element and triggers a callback.
 *
 * @param ref - A React ref pointing to the target HTML element.
 * @param onOutsideClick - A callback function executed when a click outside the element is detected.
 * @param isActive - (Optional) A boolean to enable or disable the event listener. Defaults to `true`.
 *
 * Usage:
 *
 * const ref = useRef(null);
 * useOutsideClick(ref, () => {
 *   console.log('Clicked outside!');
 * });
 *
 * This will log "Clicked outside!" whenever a user clicks outside the referenced element.
 */

const useOutsideClick = (
  ref: RefObject<HTMLElement>,
  onOutsideClick: () => void,
  isActive: boolean = true,
): void => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutsideClick();
      }
    };

    if (isActive) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, onOutsideClick, isActive]);
};

export default useOutsideClick;
