import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { updateDoc } from "firebase/firestore";
import { getGeminiModel, db } from "../../utils/firebaseConfig";
import { getArduinoDevicesDocRef } from "../../utils/firestorePaths";
import { useGuest } from "../../utils/GuestContext";
import { useAppTheme } from "../../utils/AppThemeContext";

type Message = { id: string; text: string; sender: "user" | "ai" };

type DeviceKey =
  | "white_light"
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
  const { theme } = useAppTheme();
  const { isGuest } = useGuest();
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

  if (isGuest) {
    return (
      <View style={{ backgroundColor: theme.colors.background }} className="flex-1 px-6 py-8 items-center justify-center">
        <MaterialCommunityIcons name="robot-confused" size={48} color={theme.colors.mutedText} />
        <Text style={{ color: theme.colors.text }} className="mt-4 text-center">Guest mode cannot control devices. Sign in to use AI controls.</Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: theme.colors.background }} className="flex-1 p-4">
      <FlatList
        ref={listRef}
        data={messages}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 12 }}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor:
                item.sender === 'user' ? theme.colors.accent : theme.colors.surface,
            }}
            className={`my-2 max-w-[85%] rounded-2xl p-3 ${
              item.sender === "user" ? "self-end" : "self-start"
            }`}
          >
            {item.sender === "user" ? (
              <Text style={{ color: theme.colors.accentText }} className="text-[15px]">{item.text}</Text>
            ) : (
              <Markdown
                style={{
                  body: { color: theme.colors.text, fontSize: 15 },
                  paragraph: { color: theme.colors.text, marginTop: 0, marginBottom: 8 },
                  strong: { color: theme.colors.text, fontWeight: "700" },
                  em: { color: theme.colors.text, fontStyle: "italic" },
                  heading1: {
                    color: theme.colors.text,
                    fontSize: 24,
                    fontWeight: "700",
                    marginBottom: 8,
                  },
                  heading2: {
                    color: theme.colors.text,
                    fontSize: 20,
                    fontWeight: "700",
                    marginBottom: 6,
                  },
                  bullet_list: { color: theme.colors.text },
                  ordered_list: { color: theme.colors.text },
                  list_item: { color: theme.colors.text },
                  code_inline: {
                    backgroundColor: theme.colors.backgroundAlt,
                    color: theme.colors.accentText,
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                    borderRadius: 6,
                  },
                  code_block: {
                    backgroundColor: theme.colors.backgroundAlt,
                    color: theme.colors.accentText,
                    padding: 10,
                    borderRadius: 10,
                  },
                  fence: {
                    backgroundColor: theme.colors.backgroundAlt,
                    color: theme.colors.accentText,
                    padding: 10,
                    borderRadius: 10,
                  },
                  link: { color: theme.colors.accent },
                  blockquote: {
                    borderLeftWidth: 4,
                    borderLeftColor: theme.colors.accent,
                    paddingLeft: 10,
                    color: theme.colors.mutedText,
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
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={{ color: theme.colors.mutedText }} className="ml-2 italic">
            House is thinking...
          </Text>
        </View>
      )}

      <View style={{ borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }} className="flex-row items-center border-t pt-4">
        <TextInput
          style={{
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }}
          className="flex-1 rounded-2xl border p-4"
          value={input}
          onChangeText={setInput}
          placeholder="Command your home..."
          placeholderTextColor={theme.colors.subtleText}
          editable={!loading}
          multiline
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={loading || !input.trim()}
          style={{ backgroundColor: loading || !input.trim() ? theme.colors.surfaceStrong : theme.colors.accent }}
          className="ml-3 rounded-2xl p-4"
        >
          <Text style={{ color: theme.colors.accentText }} className="font-bold">Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}