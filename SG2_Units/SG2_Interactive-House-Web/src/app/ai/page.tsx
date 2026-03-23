"use client";

import { useState } from "react";
import { PageShell } from "@/components/pageShell";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { model } from "@/utils/firebaseConfig";

type ChatMessage = {
  id: string;
  role: "user" | "ai";
  text: string;
};

export default function AIPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: userMessage,
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setMessage("");
    setLoading(true);

    try {
      const result = await model.generateContent(userMessage);
      const text = result.response.text();

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: "Failed to get AI response.",
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="AI" subtitle="AI Control">
      <div className="flex flex-col gap-4">

        <div className="h-[400px] overflow-y-auto rounded-xl bg-black/20 p-4">
          {messages.length === 0 ? (
            <p>Start the conversation...</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-3 max-w-[80%] rounded-lg p-3 ${
                  msg.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : "mr-auto bg-white/10"
                }`}
              >
                {msg.role === "user" ? (
                  <p>{msg.text}</p>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                )}
              </div>
            ))
          )}

          {loading && <p>Thinking...</p>}
        </div>

        <div className="flex gap-2">
          <textarea
            className="flex-1 rounded-lg p-2 text-black"
            value={message}
            placeholder="Type message..."
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <button
            onClick={handleSend}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </PageShell>
  );
}