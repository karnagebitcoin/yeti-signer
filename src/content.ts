// Prevent multiple injections
if ((window as any).__KEYS_BAND_CONTENT_LOADED__) {
  // Already loaded, skip
} else {
  (window as any).__KEYS_BAND_CONTENT_LOADED__ = true;

  // Inline browser API getter to avoid imports
  function getBrowser(): typeof chrome | null {
    // @ts-ignore
    if (typeof browser !== "undefined") {
      // @ts-ignore
      return browser;
      // @ts-ignore
    } else if (typeof chrome !== "undefined") {
      // @ts-ignore
      return chrome;
    }
    return null;
  }

  const web = getBrowser()!;

  if (window.nostr === undefined) {
    const script = document.createElement("script");
    script.setAttribute("async", "false");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", web.runtime.getURL("assets/nostr-provider.js"));

    const injectionRoot = document.head || document.documentElement;
    if (injectionRoot) {
      injectionRoot.appendChild(script);
    } else {
      window.addEventListener(
        "DOMContentLoaded",
        () => {
          (document.head || document.documentElement)?.appendChild(script);
        },
        { once: true }
      );
    }
  }

  const allowedTypes = new Set([
    "getPublicKey",
    "getRelays",
    "signEvent",
    "nip04.encrypt",
    "nip04.decrypt",
    "replaceURL",
  ]);

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.ext !== "keys.band") {
      return;
    }
    if (event.data.response !== undefined && event.data.response !== null) {
      return;
    }

    if (event.data.prompt === true) {
      return;
    }

    if (typeof event.data.type !== "string" || !allowedTypes.has(event.data.type)) {
      return;
    }

    const rawId = event.data.id;
    if (typeof rawId !== "string" && typeof rawId !== "number") {
      return;
    }

    const data = {
      id: String(rawId),
      ext: "keys.band",
      type: event.data.type,
      params: event.data.params,
      url: event.origin,
    };

    web.runtime.sendMessage(data, (response: unknown) => {
      // Check for runtime errors
      if (web.runtime.lastError) {
        console.error('[Content] Runtime error:', web.runtime.lastError);
        return;
      }

      if (response && typeof response === 'object' && 'response' in response && (response as Record<string, unknown>).response !== undefined && (response as Record<string, unknown>).response !== null) {
        try {
          const targetOrigin = event.origin === "null" ? "*" : event.origin;
          window.postMessage(response, targetOrigin);
        } catch (error) {
          console.error('[Content] Error posting message back to page:', error);
        }
      }
    });
  });
}
