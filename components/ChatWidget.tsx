"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useDraggable } from "@/hooks/useDraggable";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const BOT_NAME = "Sadi's AI Assistant";
const AVATAR_SRC = "/avatar.png";

// Keep these in sync with sm:w-[360px] and sm:h-[520px] in the window's className.
const WINDOW_WIDTH = 360;
const WINDOW_HEIGHT = 520;
const LAUNCHER_SIZE = 56;

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatWindow = useDraggable({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    initialRight: 16,
    initialBottom: 88,
  });

  const launcher = useDraggable({
    width: LAUNCHER_SIZE,
    height: LAUNCHER_SIZE,
    initialRight: 16,
    initialBottom: 16,
  });

  // Scroll to the latest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
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
      {isOpen && (
        <div
          className="fixed inset-3 z-50 flex flex-col overflow-hidden rounded-2xl border border-line bg-base shadow-2xl shadow-black/40 sm:bottom-(--b) sm:left-auto sm:right-(--r) sm:top-auto sm:h-[min(520px,calc(100dvh_-_2rem))] sm:w-[360px]"
          style={
            {
              "--r": chatWindow.right,
              "--b": chatWindow.bottom,
            } as CSSProperties
          }
        >
          {/* Header (drag handle on larger screens) */}
          <div
            {...chatWindow.dragHandlers}
            className="flex touch-none select-none items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:cursor-grab sm:active:cursor-grabbing"
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
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
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

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-line bg-surface p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message..."
              aria-label="Message"
              className="flex-1 rounded-full border border-line bg-base px-4 py-2 text-[16px] text-ink outline-none placeholder:text-muted focus:border-accent sm:text-sm"
            />
            <button
              type="button"
              aria-label="Send message"
              onClick={handleSend}
              disabled={isLoading}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-[var(--color-base)] transition hover:opacity-90 disabled:opacity-50"
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
      )}

      {/* Launcher button: avatar photo with a small chat badge (also draggable) */}
      {!isOpen && (
        <button
          type="button"
          aria-label="Open chat"
          {...launcher.dragHandlers}
          onClick={() => {
            if (!launcher.wasDragged()) setIsOpen(true);
          }}
          style={{
            right: launcher.right,
            bottom: launcher.bottom,
            width: LAUNCHER_SIZE,
            height: LAUNCHER_SIZE,
          }}
          className="fixed z-50 cursor-grab touch-none select-none rounded-full shadow-lg shadow-accent/40 transition-transform hover:scale-105 active:cursor-grabbing"
        >
          <Image
            src={AVATAR_SRC}
            alt=""
            width={LAUNCHER_SIZE}
            height={LAUNCHER_SIZE}
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
      )}
    </>
  );
}