"use client";

import { useState } from "react";
import { PageShell } from "@/components/pageShell";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { doc, updateDoc } from "firebase/firestore";
import { db, model } from "@/utils/firebaseConfig";

type ChatMessage = {
  id: string;
  role: "user" | "ai";
  text: string;
};

type DeviceKey =
  | "white_light"
  | "door"
  | "window"
  | "fan_INA"
  | "fan_INB"
  | "bazaar";

type DeviceState = "on" | "off" | "open" | "closed";

type AICommand =
  | {
      type: "device_control";
      device: DeviceKey;
      state: DeviceState;
      reply: string;
    }
  | {
      type: "chat";
      reply: string;
    };

const DEVICE_RULES: Record<DeviceKey, DeviceState[]> = {
  white_light: ["on", "off"],
  door: ["open", "closed"],
  window: ["open", "closed"],
  fan_INA: ["on", "off"],
  fan_INB: ["on", "off"],
  bazaar: ["on", "off"],
};

function isValidCommand(data: unknown): data is AICommand {
  if (!data || typeof data !== "object") return false;

  const c = data as Record<string, unknown>;

  if (c.type === "chat") {
    return typeof c.reply === "string";
  }

  if (c.type === "device_control") {
    if (
      typeof c.reply !== "string" ||
      typeof c.device !== "string" ||
      typeof c.state !== "string"
    ) {
      return false;
    }

    if (!(c.device in DEVICE_RULES)) {
      return false;
    }

    const device = c.device as DeviceKey;
    const state = c.state as DeviceState;

    return DEVICE_RULES[device].includes(state);
  }

  return false;
}

function extractJson(text: string): AICommand | null {
  try {
    const parsed = JSON.parse(text);
    return isValidCommand(parsed) ? parsed : null;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      const parsed = JSON.parse(match[0]);
      return isValidCommand(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

async function executeDeviceCommand(
  device: DeviceKey,
  state: DeviceState
): Promise<void> {
  const allowedStates = DEVICE_RULES[device];

  if (!allowedStates.includes(state)) {
    throw new Error(`Invalid state "${state}" for device "${device}".`);
  }

  const deviceRef = doc(db, "devices", "arduino");

  await updateDoc(deviceRef, {
    [`${device}.state`]: state,
  });
}

export default function AIPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const addAiMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-ai`,
        role: "ai",
        text,
      },
    ]);
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);

    try {
      const prompt = `
You are the control interpreter for a smart house web app.

You do not directly control devices yourself.
Your job is to convert the user's request into a valid JSON command that the app will execute.

Rules:
- Always respond with JSON only.
- Never say you do not have access.
- Never explain limitations.
- Never use markdown code fences.
- If the user wants to control a device, return:
  {"type":"device_control","device":"<device>","state":"<state>","reply":"<short confirmation>"}
- If the user is not asking for device control, return:
  {"type":"chat","reply":"<normal short response>"}

Supported devices and states:
- white_light: on, off
- door: open, closed
- window: open, closed
- fan_INA: on, off
- fan_INB: on, off
- bazaar: on, off

Examples:
{"type":"device_control","device":"door","state":"open","reply":"Opening the door."}
{"type":"device_control","device":"window","state":"closed","reply":"Closing the window."}
{"type":"device_control","device":"fan_INA","state":"on","reply":"Turning on fan INA."}
{"type":"device_control","device":"fan_INB","state":"off","reply":"Turning off fan INB."}
{"type":"device_control","device":"white_light","state":"off","reply":"Turning off the white light."}
{"type":"device_control","device":"bazaar","state":"on","reply":"Turning on the buzzer."}
{"type":"chat","reply":"I can help control the door, window, white light, fan INA, fan INB, and buzzer."}

User request:
${trimmed}
      `.trim();

      const result = await model.generateContent(prompt);
      const rawText = result.response.text().trim();

      if (
        rawText.toLowerCase().includes("don't have access") ||
        rawText.toLowerCase().includes("do not have access") ||
        rawText.toLowerCase().includes("can't control") ||
        rawText.toLowerCase().includes("cannot control") ||
        rawText.toLowerCase().includes("no direct access")
      ) {
        addAiMessage(
          "I understood the request, but the command format was invalid. Please try again."
        );
        return;
      }

      const command = extractJson(rawText);

      if (!command) {
        addAiMessage(
          "I understood your message, but I could not format a valid command."
        );
        return;
      }

      if (command.type === "chat") {
        addAiMessage(command.reply);
        return;
      }

      await executeDeviceCommand(command.device, command.state);
      addAiMessage(command.reply);
    } catch (error) {
      console.error("Web AI Control Error:", error);
      addAiMessage("I couldn't complete that action. Please try again.");
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
                    : "mr-auto bg-white/10 text-white"
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
            disabled={loading}
          />

          <button
            onClick={handleSend}
            disabled={loading || !message.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </PageShell>
  );
}