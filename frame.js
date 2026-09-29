// Frame designs are registered by ordinary scripts; no build step is needed.
(() => {
  const designs = new Map();

  function register(design) {
    if (!design || !/^[a-z0-9-]+$/.test(design.id || "") ||
        !design.name || !Number.isInteger(design.width) || !Number.isInteger(design.height) ||
        design.width < 1 || design.height < 1 || typeof design.paint !== "function") {
      throw new Error("Frame.register expects an id, name, positive integer size, and paint function");
    }
    if (designs.has(design.id)) throw new Error(`Duplicate Frame design: ${design.id}`);
    designs.set(design.id, design);
  }

  window.Frame = {register, designs};
})();
