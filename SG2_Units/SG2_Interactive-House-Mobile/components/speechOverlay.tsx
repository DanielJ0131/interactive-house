import React, { useState } from "react";
import { View, Text, Pressable, Alert, PermissionsAndroid, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { hubController } from '../utils/hubController';
import { useRouter } from "expo-router";
import { useAppTheme } from '../utils/AppThemeContext';
import {getMusicController} from '../utils/musicController';

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
    const music = getMusicController();
    const words = lower.split(" ");
    //test
    console.log("hub:", hub);
    // ---------------
    // Hub Commands
    // ---------------

// FAN ON
   if (lower.includes("fan on")) {
    hub.toggleDevice?.("fan_INA");
  }

// FAN OFF
   if (lower.includes("fan off")) {
    hub.toggleDevice?.("fan_INA");
  }

// REVERSE FAN
    if (lower.includes("reverse fan") || lower.includes("fan reverse")) {
     hub.toggleDirection?.("fan_INA");
    }
     
    if (lower.includes("Buzzer") || lower.includes("buzzer")) {
     hub.toggleDevice?.("buzzer" as any);
     }

    // if (lower.includes("Buzzer") || lower.includes("buzzer")) {
    //  hub.toggleDevice?.("buzzer" as any);
    
    // if (lower.includes("relay on") || lower.includes("relay off"))
    //   hub.toggleDevice?.("relay")

    if (lower.includes("Orange") || lower.includes("orange")) {
     hub.toggleDevice?.("orange_light" as any);
    }

 if (lower.includes("White") || lower.includes("white")) {
    hub.toggleDevice?.("white_light" as any);
     }

    if (lower.includes("door")) {
     hub.toggleDevice?.("door" as any);
      }

    if (lower.includes("window")) {
      hub.toggleDevice?.("window" as any);
     }  
    // ---------------
    // Music Commands
    // ---------------
  
    if (music) {
  const words = lower.replace(/[^\w\s]/g, "").split(" ");

  if (words.includes("play") && words.includes("music")) {
    music.play?.();
  }

  if (words.includes("stop") && words.includes("music")) {
    music.stop?.();
  }

  if (words.includes("play") && !words.includes("music")) {
    music.playSongByName?.(lower);
  }

  if (words.includes("piano")) {
    music.setInstrument?.("electric piano");
  }

  if (words.includes("square")) {
    music.setInstrument?.("square");
  }

  if (words.includes("saw")) {
    music.setInstrument?.("sawtooth");
  }

  if (words.includes("fast")) {
    music.setSpeed?.(1.5);
  }

  if (words.includes("slow")) {
    music.setSpeed?.(0.5);
  }

  if (words.includes("normal")) {
    music.setSpeed?.(1);
  }
}
     


    // ---------------
    // Navigation Commands
    // ---------------
    if (words.includes("ai")) {router.push("/(tabs)/ai");}
    if (words.includes("music")) {router.push("/(tabs)/music");}
    if (words.includes("hub") || words.includes("home")) {router.push("/(tabs)/hub");}
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