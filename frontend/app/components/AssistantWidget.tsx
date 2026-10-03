"use client";

import { FormEvent, useState } from "react";
import { apiFetch } from "../../lib/api";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm Jarvis, I am here to assist with navigation and any other assistance you may need.",
    },
  ]);

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage || sending) {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmedMessage,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setMessage("");
    setError("");
    setSending(true);

    try {
      const response = await apiFetch("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({
          message: trimmedMessage,
          history: updatedMessages.slice(-10),
        }),
      });

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content:
            response.response ||
            "I wasn't able to generate a response.",
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to contact the Med-Intel Assistant."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[calc(100vw-3rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <p className="font-semibold text-white">
                Med-Intel Assistant
              </p>
              <p className="text-xs text-slate-500">
                Operations support
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded-lg px-2 py-1 text-slate-500 transition hover:bg-slate-800 hover:text-white"
            >
              ×
            </button>
          </div>

          <div className="max-h-96 min-h-64 space-y-4 overflow-y-auto p-4">
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`flex ${
                  item.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    item.role === "user"
                      ? "bg-blue-600 text-white"
                      : "border border-slate-800 bg-slate-950 text-slate-300"
                  }`}
                >
                  <p className="mb-1 text-[11px] font-medium opacity-60">
                    {item.role === "user"
                      ? "You"
                      : "Med-Intel Assistant"}
                  </p>

                  <p className="whitespace-pre-wrap">
                    {item.content}
                  </p>
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-500">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="border-t border-red-900 bg-red-950/30 px-4 py-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <form
            onSubmit={sendMessage}
            className="border-t border-slate-800 p-3"
          >
            <div className="flex gap-2">
              <input
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                placeholder="Ask about Med-Intel..."
                disabled={sending}
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>

          <div className="border-t border-slate-800 px-4 py-2">
            <p className="text-[10px] leading-4 text-slate-600">
              Operational support only. No medical diagnosis or
              treatment advice.
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={
          open ? "Close Med-Intel Assistant" : "Open Med-Intel Assistant"
        }
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl transition hover:bg-slate-800"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
          AI
        </span>

        <span className="hidden sm:inline">
          Med-Intel Assistant
        </span>
      </button>
    </>
  );
}