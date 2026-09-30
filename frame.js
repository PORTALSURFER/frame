// Frame designs are registered by ordinary scripts; no build step is needed.
(() => {
  const designs = new Map();
  const errors = [];

  function reject(design, message) {
    const id = typeof design?.id === "string" ? design.id : null;
    errors.push({id, message: id ? `${id}: ${message}` : message});
    window.dispatchEvent(new Event("frame:designs-changed"));
    return false;
  }

  function register(design) {
    if (!design || !/^[a-z0-9-]+$/.test(design.id || "") ||
        typeof design.name !== "string" || !design.name.trim() || !Number.isInteger(design.width) || !Number.isInteger(design.height) ||
        design.width < 1 || design.height < 1 || typeof design.paint !== "function") {
      return reject(design, "Frame.register expects an id, name, positive integer size, and paint function");
    }
    if (designs.has(design.id)) return reject(design, "Duplicate design id; the original design was kept");
    designs.set(design.id, design);
    window.dispatchEvent(new Event("frame:designs-changed"));
    return true;
  }

  window.Frame = {register, designs, errors};
})();
