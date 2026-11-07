// Native selectors retain their popup; plain navigation keys preview immediately.
(() => {
  let hoveredPicker = null;
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch') hoveredPicker = event.target.closest?.('select[data-preview-picker]') || null;
  });
  document.addEventListener('pointerout', event => {
    if (event.target === hoveredPicker && !hoveredPicker.contains(event.relatedTarget)) hoveredPicker = null;
  });
  window.addEventListener('blur', () => { hoveredPicker = null; });
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key === 'Escape') hoveredPicker = null;
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const editing = event.target.closest?.('input, textarea, select:not([data-preview-picker]), [role="textbox"], .prototype-control, .note-pin') || event.target.isContentEditable;
    const modal = document.querySelector('dialog[open]');
    const hoverNavigation = ['ArrowDown', 'ArrowUp'].includes(event.key) && !editing &&
      hoveredPicker?.checkVisibility() && !hoveredPicker.disabled && (!modal || modal.contains(hoveredPicker));
    const picker = hoverNavigation ? hoveredPicker : event.target;
    if (!(picker instanceof HTMLSelectElement) || !picker.matches('[data-preview-picker]') ||
        picker.disabled) return;
    const options = [...picker.options].filter(option => !option.disabled && !option.parentElement.disabled && !option.hidden);
    if (!options.length) return;
    event.preventDefault();
    picker.focus({preventScroll: true});
    const current = options.findIndex(option => option.selected);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 :
      Math.max(0, Math.min(options.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)));
    if (picker.value === options[index].value) return;
    picker.value = options[index].value;
    picker.dispatchEvent(new Event('input', {bubbles: true}));
    picker.dispatchEvent(new Event('change', {bubbles: true}));
  });
})();
