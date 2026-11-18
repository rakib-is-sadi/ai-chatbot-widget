"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type PageContext = {
  url: string;
  title: string;
  text: string;
};

const BOT_NAME = "Sadi's AI Assistant";
const AVATAR_SRC = "/avatar.png";
const MESSAGE_SOURCE = "sadi-assistant";
const DRAG_THRESHOLD = 4;

// Sends a message to the loader script (widget.js) on the host website.
function postToParent(message: Record<string, unknown>) {
  window.parent.postMessage({ source: MESSAGE_SOURCE, ...message }, "*");
}

// Asks the loader script for the visible text of the host page.
function requestPageContext(): Promise<PageContext | null> {
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);

    function cleanup() {
      window.clearTimeout(timeoutId);
      window.removeEventListener("message", handleMessage);
    }

    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (
        event.source !== window.parent ||
        !data ||
        data.source !== MESSAGE_SOURCE ||
        data.type !== "context" ||
        data.requestId !== requestId
      ) {
        return;
      }
      cleanup();
      resolve(data.context ?? null);
    }

    const timeoutId = window.setTimeout(() => {
      cleanup();
      resolve(null);
    }, 1000);

    window.addEventListener("message", handleMessage);
    postToParent({ type: "get-context", requestId });
  });
}

// Dragging is done by the loader script, which moves the iframe itself.
// We only report how far the pointer moved on the screen.
function useParentDrag() {
  const start = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  function onPointerDown(e: ReactPointerEvent<HTMLElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.screenX, y: e.screenY };
    moved.current = false;
    postToParent({ type: "drag-start" });
  }

  function onPointerMove(e: ReactPointerEvent<HTMLElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

    const dx = e.screenX - start.current.x;
    const dy = e.screenY - start.current.y;

    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) moved.current = true;
    if (!moved.current) return;

    postToParent({ type: "drag-move", dx, dy });
  }

  return {
    dragHandlers: { onPointerDown, onPointerMove },
    wasDragged: () => moved.current,
  };
}

export default function EmbedWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const drag = useParentDrag();

  // Tell the loader script whether to show the small launcher or the full window.
  useEffect(() => {
    postToParent({ type: "layout", open: isOpen });
  }, [isOpen]);

  // Scroll the message list to the latest message.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages, isOpen, isLoading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const pageContext = await requestPageContext();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, pageContext }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Request failed.");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* The iframe must be see-through so the host page shows around the widget. */}
      <style>{"html, body { background: transparent !important; }"}</style>

      {isOpen ? (
        <div className="fixed inset-0 flex flex-col overflow-hidden rounded-2xl border border-line bg-base">
          {/* Header (drag handle) */}
          <div
            {...drag.dragHandlers}
            className="flex cursor-grab touch-none select-none items-center gap-3 border-b border-line bg-surface px-4 py-3 active:cursor-grabbing"
          >
            <Image
              src={AVATAR_SRC}
              alt={BOT_NAME}
              width={40}
              height={40}
              draggable={false}
              className="h-10 w-10 rounded-full bg-surface object-cover ring-2 ring-accent"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">{BOT_NAME}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Online
              </p>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1.5 text-muted transition hover:bg-white/10 hover:text-ink"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`w-fit max-w-[80%] whitespace-pre-wrap px-4 py-2 text-sm ${
                  message.role === "user"
                    ? "ml-auto rounded-2xl rounded-br-sm bg-accent text-[var(--color-base)]"
                    : "rounded-2xl rounded-bl-sm border border-line bg-surface text-ink"
                }`}
              >
                {message.content}
              </div>
            ))}

            {isLoading && (
              <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:300ms]" />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-line bg-surface p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message..."
              aria-label="Message"
              className="min-w-0 flex-1 rounded-full border border-line bg-base px-4 py-2 text-[16px] text-ink outline-none placeholder:text-muted focus:border-accent"
            />
            <button
              type="button"
              aria-label="Send message"
              onClick={handleSend}
              disabled={isLoading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-[var(--color-base)] transition hover:opacity-90 disabled:opacity-50"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 flex items-end justify-end p-1">
          <button
            type="button"
            aria-label="Open chat"
            {...drag.dragHandlers}
            onClick={() => {
              if (!drag.wasDragged()) setIsOpen(true);
            }}
            className="relative h-14 w-14 cursor-grab touch-none select-none rounded-full active:cursor-grabbing"
          >
            <Image
              src={AVATAR_SRC}
              alt=""
              width={56}
              height={56}
              draggable={false}
              className="h-full w-full rounded-full bg-surface object-cover ring-2 ring-accent"
            />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-base bg-accent text-[var(--color-base)]">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </span>
          </button>
        </div>
      )}
    </>
  );
}