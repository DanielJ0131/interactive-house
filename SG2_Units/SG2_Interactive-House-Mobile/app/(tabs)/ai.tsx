import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList } from "react-native";

/**
 * Message type definition
 * Represents a single chat message in the conversation.
 */
type Message = {
  id: string;              // Unique identifier for each message
  text: string;            // Message content
  sender: "user" | "ai";   // Indicates whether message is from user or AI
};

/**
 * AiScreen Component
 *
 * AI chat interface connected to backend proxy.
 * - Sends user messages to backend endpoint
 * - Backend communicates with Gemini API
 * - Displays AI responses in chat format
 */
export default function AiScreen() {

  // Stores the full chat conversation
  const [messages, setMessages] = useState<Message[]>([]);

  // Stores the current user input
  const [input, setInput] = useState("");

  // Controls loading state while waiting for AI response
  const [loading, setLoading] = useState(false);

  /**
   * handleSend()
   * Triggered when user presses the "Send" button.
   * - Adds user message to chat
   * - Calls backend API
   * - Displays AI response
   */
  const handleSend = async () => {

    // Prevent sending empty messages
    if (!input.trim()) return;

    // Create user message object
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
    };

    // Add user message to chat list
    setMessages((prev) => [...prev, userMessage]);

    // Clear input field
    setInput("");

    // Show loading indicator
    setLoading(true);

    try {
      // Send request to backend proxy (Gemini API handled server-side)
      const response = await fetch(
        "http://192.168.0.40:3000/api/ai-chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: userMessage.text }),
        }
      );

      // Parse backend response
      const data = await response.json();

      // Create AI message from backend reply
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text:
          data?.reply ||
          data?.error ||
          "No response from AI.",
        sender: "ai",
      };

      // Add AI response to chat
      setMessages((prev) => [...prev, aiMessage]);

    } catch (error) {

      // If backend is unreachable or network fails
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text:
            "Could not reach AI backend. Make sure the server is running and on the same Wi-Fi.",
          sender: "ai",
        },
      ]);

    } finally {
      // Hide loading indicator
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-100">

      {/* Chat Message List */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View
            className={`p-3 my-1 rounded-xl max-w-[80%] ${
              item.sender === "user"
                ? "self-end bg-blue-500"      // User messages aligned right
                : "self-start bg-gray-300"    // AI messages aligned left
            }`}
          >
            <Text className="text-black">{item.text}</Text>
          </View>
        )}
      />

      {/* Loading Indicator */}
      {loading && (
        <Text className="text-center text-gray-500 italic mb-2">
          AI is typing...
        </Text>
      )}

      {/* Input Section */}
      <View className="flex-row p-3 bg-white border-t border-gray-300">
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask something..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
        />

        <TouchableOpacity
          onPress={handleSend}
          className="ml-2 bg-blue-500 px-4 justify-center rounded-lg"
        >
          <Text className="text-white font-bold">Send</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}
