// Native selectors retain their popup; plain navigation keys preview immediately.
(() => {
  document.addEventListener('keydown', event => {
    const picker = event.target;
    if (!(picker instanceof HTMLSelectElement) || !picker.matches('[data-preview-picker]') ||
        picker.disabled || event.defaultPrevented || event.isComposing ||
        event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const options = [...picker.options].filter(option => !option.disabled && !option.parentElement.disabled && !option.hidden);
    if (!options.length) return;
    event.preventDefault();
    const current = options.findIndex(option => option.selected);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 :
      Math.max(0, Math.min(options.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)));
    if (picker.value === options[index].value) return;
    picker.value = options[index].value;
    picker.dispatchEvent(new Event('input', {bubbles: true}));
    picker.dispatchEvent(new Event('change', {bubbles: true}));
  });
})();
