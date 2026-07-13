import type { Directive, DirectiveBinding } from 'vue';

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
);

export const vReveal: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const variant = binding.value || 'up';
    el.classList.add('reveal');
    if (variant !== 'up') el.classList.add(`reveal--${variant}`);
    if (binding.modifiers?.delayed) el.classList.add('reveal--delayed');
    observer.observe(el);
  },
  unmounted(el: HTMLElement) {
    observer.unobserve(el);
  },
};
