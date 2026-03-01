import React, { useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PermissionsAndroid, Platform } from "react-native";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

//main screen for voice control, allowing users to start/stop listening and see live transcripts
export default function SpeechScreen(){
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

//listen for speech recognition results and errors
  useSpeechRecognitionEvent("result", (event) =>{
    const text = event.results?.[0]?.transcript ?? "";
    setTranscript(text);
    handleIntent(text);
  });
  useSpeechRecognitionEvent("error", (event) =>{
  console.log("Speech error event:", event);
  });

  //listen for when speech recognition ends (either by user or system)
  useSpeechRecognitionEvent("end", () =>{
    setIsListening(false);
  });

  //simple intent handler that checks for keywords
  const handleIntent = (text: string) =>{
    const lower = text.toLowerCase();

    if (lower.includes("hub") || lower.includes("hub")){
      router.push("/(tabs)/device_hub");
    }
    if (lower.includes("devices")){
      router.push("/(tabs)/home");
    }
    if (lower.includes("ai")){
      router.push("/(tabs)/ai");
    }
  };

//request microphone permission 
 const requestMicPermission = async () =>{
  if (Platform.OS === "android") {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "Microphone Permission",
        message: "This app needs access to your microphone for speech recognition.",
        buttonPositive: "Allow",
      }
    );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
};

//start listening 
const startListening = async () =>{
  const hasPermission = await requestMicPermission();

  if (!hasPermission){
    console.log("Microphone permission denied");
    return;
  }

  setTranscript("");
  setIsListening(true);

  try{
    await ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: false,
    });
  } catch (err) {
    console.log("Start error:", err);
    setIsListening(false);
  }
};

  const stopListening = async () =>{
    await ExpoSpeechRecognitionModule.stop();
    setIsListening(false);
  };

  return (
  <SafeAreaView
    edges={['top']}
    style={{ flex: 1, backgroundColor: '#020617' }}
  >
    <View className="flex-1 px-6 pt-6">

      {/* Header */}
      <View className="mb-8 mt-4">
        <Text className="text-white text-4xl font-extrabold tracking-tight">
          Voice Control
        </Text>
        <Text className="text-slate-500 text-lg font-medium">
          Navigate & control with speech
        </Text>
      </View>

      {/* Mic Card */}
      <View className="bg-slate-900/40 border border-slate-800/60 p-8 rounded-3xl items-center">

        <Pressable
          onPress={isListening ? stopListening : startListening}
          className={`h-28 w-28 rounded-full items-center justify-center ${
            isListening ? 'bg-red-500/20' : 'bg-sky-500/10'
          }`}
        >
          <MaterialCommunityIcons
            name={isListening ? 'microphone-off' : 'microphone'}
            size={48}
            color={isListening ? '#ef4444' : '#0ea5e9'}
          />
        </Pressable>

        <Text className="text-slate-400 mt-6 text-sm font-semibold uppercase tracking-widest">
          {isListening ? 'Listening...' : 'Tap to Speak'}
        </Text>
      </View>

      {/* Transcript Section */}
      <Text className="text-sky-500 text-xs font-black uppercase tracking-[2px] mb-4 ml-2">
        Live Transcript
      </Text>

      <View className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-3xl min-h-[100px]">
        {transcript ? (
          <Text className="text-white text-base font-medium">
            {transcript}
          </Text>
        ) : (
          <Text className="text-slate-500 text-sm">
            Your speech will appear here...
          </Text>
        )}
      </View>

    </View>
  </SafeAreaView>
);
}