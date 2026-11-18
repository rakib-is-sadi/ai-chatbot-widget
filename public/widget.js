(function () {
  "use strict";

  if (window.__sadiAssistantLoaded) return;
  window.__sadiAssistantLoaded = true;

  var script =
    document.currentScript ||
    document.querySelector('script[src*="/widget.js"]');
  if (!script || !script.src) return;

  var origin = new URL(script.src, window.location.href).origin;

  var SOURCE = "sadi-assistant";
  var EDGE = 12; // distance from the screen edge, in px
  var LAUNCHER_SIZE = 64; // iframe size while closed (56px button + room for the badge)
  var WINDOW_WIDTH = 360;
  var WINDOW_HEIGHT = 520;
  var MOBILE_MAX_WIDTH = 640;
  var MAX_TEXT_LENGTH = 8000;

  var state = { open: false, right: EDGE, bottom: EDGE };
  var dragStart = { right: EDGE, bottom: EDGE };

  var frame = document.createElement("iframe");
  frame.src = origin + "/embed";
  frame.title = "Sadi's AI Assistant";
  frame.style.cssText =
    "position:fixed;border:0;background:transparent;z-index:2147483647;";

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }

  function applyLayout() {
    var style = frame.style;

    // Small screens: the open chat fills the screen and cannot be moved.
    if (state.open && window.innerWidth < MOBILE_MAX_WIDTH) {
      style.right = EDGE + "px";
      style.bottom = EDGE + "px";
      style.width = "calc(100vw - " + EDGE * 2 + "px)";
      style.height = "calc(100vh - " + EDGE * 2 + "px)";
      style.height = "calc(100dvh - " + EDGE * 2 + "px)";
      return;
    }

    var width = state.open ? WINDOW_WIDTH : LAUNCHER_SIZE;
    var height = state.open
      ? Math.min(WINDOW_HEIGHT, window.innerHeight - EDGE * 2)
      : LAUNCHER_SIZE;

    state.right = clamp(state.right, 0, window.innerWidth - width);
    state.bottom = clamp(state.bottom, 0, window.innerHeight - height);

    style.width = width + "px";
    style.height = height + "px";
    style.right = state.right + "px";
    style.bottom = state.bottom + "px";
  }

  // Reads the visible text of the page the visitor is currently on.
  function getPageContext() {
    var text = "";
    try {
      text = (document.body.innerText || "").replace(/\n{3,}/g, "\n\n").trim();
    } catch (error) {
      text = "";
    }
    return {
      url: window.location.origin + window.location.pathname,
      title: document.title,
      text: text.slice(0, MAX_TEXT_LENGTH),
    };
  }

  window.addEventListener("message", function (event) {
    // Only listen to our own iframe.
    if (event.source !== frame.contentWindow || event.origin !== origin) return;

    var data = event.data;
    if (!data || data.source !== SOURCE) return;

    if (data.type === "layout") {
      state.open = Boolean(data.open);
      applyLayout();
    } else if (data.type === "drag-start") {
      dragStart = { right: state.right, bottom: state.bottom };
    } else if (data.type === "drag-move") {
      var dx = Number(data.dx);
      var dy = Number(data.dy);
      if (!isFinite(dx) || !isFinite(dy)) return;
      state.right = dragStart.right - dx;
      state.bottom = dragStart.bottom - dy;
      applyLayout();
    } else if (data.type === "get-context") {
      frame.contentWindow.postMessage(
        {
          source: SOURCE,
          type: "context",
          requestId: data.requestId,
          context: getPageContext(),
        },
        origin
      );
    }
  });

  window.addEventListener("resize", applyLayout);

  function mount() {
    document.body.appendChild(frame);
    applyLayout();
  }

  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount);
  }
})();