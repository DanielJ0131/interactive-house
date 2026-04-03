import React, { useState } from "react";
import { View, Text, Pressable, Alert, PermissionsAndroid, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { hubController } from '../utils/hubController';
import { useRouter } from "expo-router";
import { useAppTheme } from '../utils/AppThemeContext';

export default function SpeechOverlay() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const shouldShowTranscriptBubble = isListening || transcript.length > 0;

  let SpeechRecognition: any = null;

  try {
    SpeechRecognition = require("expo-speech-recognition");
  } catch (e) {
    SpeechRecognition = null;
  }

  const isNativeAvailable = !!SpeechRecognition?.ExpoSpeechRecognitionModule;

  if (isNativeAvailable) {
    SpeechRecognition.useSpeechRecognitionEvent("result", (event: any) => {
      const text = event.results?.[0]?.transcript ?? "";
      setTranscript(text);
      handleIntent(text);
    });

    SpeechRecognition.useSpeechRecognitionEvent("end", () => {
      setIsListening(false);
    });
  }

  const handleIntent = (text: string) => {
    const lower = text.toLowerCase();
    const hub = hubController();

    if  ( lower.includes ("fan On") || lower.includes("turn on fan"))
      hub.setSlider?.("fan", 100)

    if (lower.includes("fan Off") || lower.includes("turn off fan"))
      hub.setSlider?.("fan", 0)

    if (lower.includes("reverse fan") || lower.includes("fan reverse"))
      hub.toggleDirection?.("fan")

    if (lower.includes("buzzer on") || lower.includes(" turn on buzzer"))
      hub.buzzerPress?.("buzzer", true)

    if (lower.includes("buzzer off") || lower.includes("turn off buzzer"))
      hub.buzzerPress?.("buzzer", false)

    if (lower.includes("relay on") || lower.includes("relay off"))
      hub.toggleDevice?.("relay")

    if (lower.includes("yellow") || lower.includes(" yellow LED"))
      hub.toggleDevice?.("led_yellow")

    if (lower.includes("white") || lower.includes("LED white"))
      hub.toggleDevice?.("led_white")

    if (lower.includes ("door"))
      hub.toggleDevice?.("servo_door")

    if (lower.includes("window"))
      hub.toggleDevice?.("servo_window")
    
    if (lower.includes("ai")) router.push("/(tabs)/ai");
  };

  const requestMicPermission = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const startListening = async () => {
    if (!isNativeAvailable) {
      Alert.alert(
        "Unavailable",
        "Speech recognition requires a development build."
      );
      return;
    }

    const hasPermission = await requestMicPermission();
    if (!hasPermission) return;

    setTranscript("");
    setIsListening(true);

    await SpeechRecognition.ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: false,
    });
  };

  const stopListening = async () => {
    if (isNativeAvailable) {
      await SpeechRecognition.ExpoSpeechRecognitionModule.stop();
    }
    setIsListening(false);
  };

  return (
    <View
      style={{
        position: "absolute",
        top: 155,
        right: 20,
        flexDirection: "row-reverse",
        alignItems: "center",
        zIndex: 999,
      }}
    >
      <Pressable
        onPress={isListening ? stopListening : startListening}
        style={{ backgroundColor: isListening ? theme.colors.dangerSoft : theme.colors.accentSoft }}
        className="h-20 w-20 rounded-full items-center justify-center"
      >
        <MaterialCommunityIcons
          name={isListening ? "microphone-off" : "microphone"}
          size={36}
          color={isListening ? theme.colors.danger : theme.colors.accent}
        />
      </Pressable>

      {shouldShowTranscriptBubble && (
        <View style={{ backgroundColor: theme.colors.chipBackground, borderColor: theme.colors.border }} className="mr-2 border px-4 py-3 rounded-2xl max-w-[220px]">
          {transcript ? (
            <Text style={{ color: theme.colors.text }} className="text-sm">{transcript}</Text>
          ) : (
            <Text style={{ color: theme.colors.mutedText }} className="text-sm">Listening...</Text>
          )}
        </View>
      )}
    </View>
  );
}