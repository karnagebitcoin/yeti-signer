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
  document.head.appendChild(script);
}

window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data || event.data.ext !== "keys.band") {
    return;
  }
  if (event.data.response === undefined || event.data.response === null) {
    const data = event.data || {};
    data["url"] = event.origin;



    web.runtime.sendMessage({ ...data }, (response: unknown) => {


      // Check for runtime errors
      if (web.runtime.lastError) {
        console.error('[Content] Runtime error:', web.runtime.lastError);
        return;
      }

      if (response && typeof response === 'object' && 'response' in response && (response as Record<string, unknown>).response !== undefined && (response as Record<string, unknown>).response !== null) {

        try {
          window.postMessage(response, "*");
        } catch (error) {
          console.error('[Content] Error posting message back to page:', error);
        }
      }
    });
  }
});