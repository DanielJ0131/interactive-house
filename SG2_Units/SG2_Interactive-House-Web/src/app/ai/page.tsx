"use client";

import { useState } from "react";
import { PageShell } from "@/components/pageShell";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { doc, updateDoc } from "firebase/firestore";
import { db, model } from "@/utils/firebaseConfig";
import Link from "next/link";
import { CaretLeft, PaperPlaneRight } from "@phosphor-icons/react";

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
  | "buzzer";

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
  buzzer: ["on", "off"],
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
- buzzer: on, off

Examples:
{"type":"device_control","device":"door","state":"open","reply":"Opening the door."}
{"type":"device_control","device":"window","state":"closed","reply":"Closing the window."}
{"type":"device_control","device":"fan_INA","state":"on","reply":"Turning on fan INA."}
{"type":"device_control","device":"fan_INB","state":"off","reply":"Turning off fan INB."}
{"type":"device_control","device":"white_light","state":"off","reply":"Turning off the white light."}
{"type":"device_control","device":"buzaar","state":"on","reply":"Turning on the buzzer."}
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
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">

        {/* BACK TO HUB BUTTON - Matches Hub Styling */}
        <Link
          href="/hub"
          className="group self-start flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-white/80 font-bold text-sm hover:bg-white/10 transition-all shadow-xl"
        >
          <CaretLeft size={18} weight="bold" className="group-hover:-translate-x-1 transition-transform" />
          BACK TO HUB
        </Link>

        {/* CHAT WINDOW - Glassmorphism Style */}
        <div className="h-[500px] overflow-y-auto rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md p-6 shadow-2xl flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-white/20 uppercase tracking-[0.2em] font-black text-xs text-center">
              Awaiting instructions for home control...
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-lg ${msg.role === "user"
                    ? "ml-auto bg-[#0EA5E9] text-black font-bold" // Active color matching Hub buttons
                    : "mr-auto bg-white/10 text-white border border-white/10 backdrop-blur-sm"
                  }`}
              >
                {msg.role === "user" ? (
                  <p>{msg.text}</p>
                ) : (
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center gap-2 text-[#0EA5E9] text-[10px] font-black uppercase tracking-widest animate-pulse ml-2">
              <div className="w-1.5 h-1.5 bg-[#0EA5E9] rounded-full" />
              AI is Thinking...
            </div>
          )}
        </div>

        {/* INPUT AREA - Rounded Bar Style */}
        <div className="flex gap-3 bg-white/10 p-2 rounded-[2.5rem] border border-white/20 backdrop-blur-md shadow-2xl items-center">
          <textarea
            className="flex-1 bg-transparent px-6 py-2 text-white placeholder:text-white/30 outline-none font-medium resize-none max-h-32"
            rows={1}
            value={message}
            placeholder="Type your command (e.g., 'Turn on the fan')..."
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
            className="h-12 w-12 flex items-center justify-center rounded-full bg-[#0EA5E9] text-black hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shadow-lg shadow-[#0EA5E9]/30"
          >
            <PaperPlaneRight size={22} weight="fill" />
          </button>
        </div>
      </div>
    </PageShell>
  );
}