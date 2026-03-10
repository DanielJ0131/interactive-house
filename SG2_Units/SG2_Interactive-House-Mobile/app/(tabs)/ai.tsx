import React, { useRef, useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Keyboard, ActivityIndicator, Platform } from "react-native";
import { getGeminiModel } from "../../utils/firebaseConfig";

type Message = { id: string; text: string; sender: "user" | "ai" };

export default function AiScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const chatSessionRef = useRef<ReturnType<ReturnType<typeof getGeminiModel>["startChat"]> | null>(null);

  const getChatSession = () => {
    if (chatSessionRef.current) {
      return chatSessionRef.current;
    }

    chatSessionRef.current = getGeminiModel().startChat({
      history: [],
    });

    return chatSessionRef.current;
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: Date.now().toString(), text: trimmed, sender: "user" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const result = await getChatSession().sendMessage(trimmed);
      const aiText = result.response.text();

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: aiText || "I'm not sure how to help with that.",
        sender: "ai"
      }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        id: "error",
        text: "I lost my connection to the house. Please try again.",
        sender: "ai"
      }]);
    } finally {
      setLoading(false);
      listRef.current?.scrollToEnd({ animated: true });
    }
  };

  return (
    <View className="flex-1 bg-[#020617] p-4">
      {/* ... UI remains largely the same ... */}
      <FlatList
        ref={listRef}
        data={messages}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View className={`my-2 p-3 rounded-2xl ${item.sender === 'user' ? 'bg-sky-600 self-end' : 'bg-slate-800 self-start'}`}>
            <Text className="text-white text-[15px]">{item.text}</Text>
          </View>
        )}
        keyExtractor={item => item.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />
      
      {loading && (
        <View className="flex-row items-center mb-4 ml-2">
          <ActivityIndicator size="small" color="#0ea5e9" />
          <Text className="text-slate-500 italic ml-2">House is thinking...</Text>
        </View>
      )}

      <View className="flex-row items-center border-t border-slate-900 pt-4 bg-[#020617]">
        <TextInput
          className="flex-1 bg-slate-900 text-white p-4 rounded-2xl border border-slate-800"
          value={input}
          onChangeText={setInput}
          placeholder="Command your home..."
          placeholderTextColor="#64748b"
          editable={!loading}
        />
        <TouchableOpacity 
          onPress={handleSend} 
          disabled={loading || !input.trim()}
          className={`ml-3 p-4 rounded-2xl ${loading || !input.trim() ? 'bg-slate-800' : 'bg-sky-500'}`}
        >
          <Text className="text-white font-bold">Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}