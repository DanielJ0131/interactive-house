import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { updateDoc } from "firebase/firestore";
import { getGeminiModel, db } from "../../utils/firebaseConfig";
import { getArduinoDevicesDocRef } from "../../utils/firestorePaths";

type Message = { id: string; text: string; sender: "user" | "ai" };

type DeviceKey =
  | "white_light"
  | "orange_light"
  | "fan_INA"
  | "door"
  | "window"
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
  orange_light: ["on", "off"],
  fan_INA: ["on", "off"],
  buzzer: ["on", "off"],
  door: ["open", "closed"],
  window: ["open", "closed"],
};

function isValidCommand(data: unknown): data is AICommand {
  if (!data || typeof data !== "object") return false;

  const candidate = data as Record<string, unknown>;

  if (candidate.type === "chat") {
    return typeof candidate.reply === "string";
  }

  if (candidate.type === "device_control") {
    if (
      typeof candidate.reply !== "string" ||
      typeof candidate.device !== "string" ||
      typeof candidate.state !== "string"
    ) {
      return false;
    }

    if (!(candidate.device in DEVICE_RULES)) {
      return false;
    }

    return DEVICE_RULES[candidate.device as DeviceKey].includes(
      candidate.state as DeviceState
    );
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

async function executeDeviceCommand(device: DeviceKey, state: DeviceState) {
  const allowedStates = DEVICE_RULES[device];

  if (!allowedStates.includes(state)) {
    throw new Error(`Invalid state "${state}" for device "${device}".`);
  }

  const docRef = getArduinoDevicesDocRef(db);

  await updateDoc(docRef, {
    [`${device}.state`]: state,
  });
}

export default function AiScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const chatSessionRef = useRef<
    ReturnType<ReturnType<typeof getGeminiModel>["startChat"]> | null
  >(null);

  const getChatSession = () => {
    if (chatSessionRef.current) return chatSessionRef.current;

    chatSessionRef.current = getGeminiModel().startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text: `
You are the control interpreter for a smart house mobile app.

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
- orange_light: on, off
- fan_INA: on, off
- buzzer: on, off
- door: open, closed
- window: open, closed

Examples:
{"type":"device_control","device":"door","state":"open","reply":"Opening the door."}
{"type":"device_control","device":"window","state":"closed","reply":"Closing the window."}
{"type":"device_control","device":"fan_INA","state":"on","reply":"Turning on the fan."}
{"type":"device_control","device":"white_light","state":"off","reply":"Turning off the white light."}
{"type":"chat","reply":"I can help control the door, window, lights, fan, and buzzer."}
              `.trim(),
            },
          ],
        },
        {
          role: "model",
          parts: [
            {
              text: `{"type":"chat","reply":"Understood. I will return JSON commands for this smart house app."}`,
            },
          ],
        },
      ],
    });

    return chatSessionRef.current;
  };

  const addAiMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-ai`,
        text,
        sender: "ai",
      },
    ]);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: trimmed,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const result = await getChatSession().sendMessage(trimmed);
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
      console.error("AI Control Error:", error);
      addAiMessage("I couldn't complete that action. Please try again.");
    } finally {
      setLoading(false);
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  return (
    <View className="flex-1 bg-[#020617] p-4">
      <FlatList
        ref={listRef}
        data={messages}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 12 }}
        renderItem={({ item }) => (
          <View
            className={`my-2 max-w-[85%] rounded-2xl p-3 ${
              item.sender === "user"
                ? "self-end bg-sky-600"
                : "self-start bg-slate-800"
            }`}
          >
            {item.sender === "user" ? (
              <Text className="text-white text-[15px]">{item.text}</Text>
            ) : (
              <Markdown
                style={{
                  body: { color: "white", fontSize: 15 },
                  paragraph: { color: "white", marginTop: 0, marginBottom: 8 },
                  strong: { color: "white", fontWeight: "700" },
                  em: { color: "white", fontStyle: "italic" },
                  heading1: {
                    color: "white",
                    fontSize: 24,
                    fontWeight: "700",
                    marginBottom: 8,
                  },
                  heading2: {
                    color: "white",
                    fontSize: 20,
                    fontWeight: "700",
                    marginBottom: 6,
                  },
                  bullet_list: { color: "white" },
                  ordered_list: { color: "white" },
                  list_item: { color: "white" },
                  code_inline: {
                    backgroundColor: "#0f172a",
                    color: "#7dd3fc",
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                    borderRadius: 6,
                  },
                  code_block: {
                    backgroundColor: "#0f172a",
                    color: "#7dd3fc",
                    padding: 10,
                    borderRadius: 10,
                  },
                  fence: {
                    backgroundColor: "#0f172a",
                    color: "#7dd3fc",
                    padding: 10,
                    borderRadius: 10,
                  },
                  link: { color: "#38bdf8" },
                  blockquote: {
                    borderLeftWidth: 4,
                    borderLeftColor: "#38bdf8",
                    paddingLeft: 10,
                    color: "#cbd5e1",
                  },
                }}
              >
                {item.text}
              </Markdown>
            )}
          </View>
        )}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
      />

      {loading && (
        <View className="mb-4 ml-2 flex-row items-center">
          <ActivityIndicator size="small" color="#0ea5e9" />
          <Text className="ml-2 italic text-slate-500">
            House is thinking...
          </Text>
        </View>
      )}

      <View className="flex-row items-center border-t border-slate-900 bg-[#020617] pt-4">
        <TextInput
          className="flex-1 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-white"
          value={input}
          onChangeText={setInput}
          placeholder="Command your home..."
          placeholderTextColor="#64748b"
          editable={!loading}
          multiline
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={loading || !input.trim()}
          className={`ml-3 rounded-2xl p-4 ${
            loading || !input.trim() ? "bg-slate-800" : "bg-sky-500"
          }`}
        >
          <Text className="font-bold text-white">Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}