// Frame designs are registered by ordinary scripts; no build step is needed.
(() => {
  const designs = new Map();
  const sources = new Map();
  let pendingRefresh = null;

  function register(design) {
    if (!design || !/^[a-z0-9-]+$/.test(design.id || "") ||
        !design.name || !Number.isInteger(design.width) || !Number.isInteger(design.height) ||
        design.width < 1 || design.height < 1 || typeof design.paint !== "function") {
      throw new Error("Frame.register expects an id, name, positive integer size, and paint function");
    }
    const source = document.currentScript?.src;
    if (pendingRefresh && design.id === pendingRefresh.id && source === pendingRefresh.url) {
      pendingRefresh.design = design;
      return;
    }
    if (designs.has(design.id)) throw new Error(`Duplicate Frame design: ${design.id}`);
    designs.set(design.id, design);
    if (source) sources.set(design.id, source);
  }

  async function refresh(id) {
    if (pendingRefresh) throw new Error('A design refresh is already running');
    const source = sources.get(id);
    if (!source) throw new Error('This design has no reloadable script');
    const url = new URL(source);
    url.searchParams.set('frame-refresh', Date.now());
    const pending = {id, url: url.href, design: null};
    pendingRefresh = pending;
    const script = document.createElement('script');
    script.src = url.href;
    let scriptError;
    const onError = event => { if (event.filename === url.href) scriptError = event.error || new Error(event.message); };
    window.addEventListener('error', onError);
    try {
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = () => reject(new Error('Could not load the updated design script'));
        document.head.append(script);
      });
      if (scriptError) throw scriptError;
      if (!pending.design) throw new Error('The updated script did not register this design');
      designs.set(id, pending.design);
    } finally {
      script.remove();
      window.removeEventListener('error', onError);
      pendingRefresh = null;
    }
  }

  window.Frame = {register, designs, refresh};
})();
