// import React, { useState } from "react";
// //import { SafeAreaView } from 'react-native-safe-area-context';
// import { View, Pressable, Alert } from "react-native";
// import { useRouter } from "expo-router";
// import { MaterialCommunityIcons } from "@expo/vector-icons";
// import { PermissionsAndroid, Platform } from "react-native";


// //main screen for voice control, allowing users to start/stop listening and see live transcripts
// export default function SpeechOverlay(){
//   const router = useRouter();
//   const [isListening, setIsListening] = useState(false);
//   const [transcript, setTranscript] = useState("");

//   let SpeechRecognition: any = null;
//   try {
//     SpeechRecognition = require("expo-speech-recognition");
//   } catch (e) {
//     SpeechRecognition = null;
//   }

//   const isNativeAvailable = !!SpeechRecognition?.ExpoSpeechRecognitionModule;

// //listen for speech recognition results and errors
//   // Fixed: We call the hook only if the module was successfully required
//   if (isNativeAvailable) {
//     // eslint-disable-next-line react-hooks/rules-of-hooks
//     SpeechRecognition.useSpeechRecognitionEvent("result", (event: any) =>{
//       // Guard to ensure we only process if the native module is present
//       if (!isNativeAvailable) return;
//       const text = event.results?.[0]?.transcript ?? "";
//       setTranscript(text);
//       handleIntent(text);
//     });

//     SpeechRecognition.useSpeechRecognitionEvent("error", (event: any) =>{
//       // Guard for errors
//       if (!isNativeAvailable) return;
//       console.log("Speech error event:", event);
//     });

//     //listen for when speech recognition ends (either by user or system)
//     SpeechRecognition.useSpeechRecognitionEvent("end", () =>{
//       setIsListening(false);
//     });
//   }

//   //simple intent handler that checks for keywords
//   const handleIntent = (text: string) =>{
//     const lower = text.toLowerCase();

//     if (lower.includes("hub")){
//       router.push("/(tabs)/device_hub");
//   }
//     if (lower.includes("devices")){
//       router.push("/(tabs)/home");
//     }
//     if (lower.includes("ai")){
//       router.push("/(tabs)/ai");
//     }
//   };

// //request microphone permission 
//  const requestMicPermission = async () =>{
//   if (Platform.OS === "android") {
//     const granted = await PermissionsAndroid.request(
//       PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       {
//         title: "Microphone Permission",
//         message: "This app needs access to your microphone for speech recognition.",
//         buttonPositive: "Allow",
//       }
//     );
//   return granted === PermissionsAndroid.RESULTS.GRANTED;
//   }
//   return true;
// };

// //start listening 
// const startListening = async () =>{
//   /**
//    * SAFETY GUARD: If running in Expo Go, show an alert instead of calling
//    * the missing native method.
//    */
//   if (!isNativeAvailable) {
//     Alert.alert(
//       "Feature Unavailable",
//       "Native speech recognition is not available in Expo Go. Please use a Development Build to test this feature."
//     );
//     return;
//   }

//   const hasPermission = await requestMicPermission();

//   if (!hasPermission){
//     console.log("Microphone permission denied");
//     return;
//   }

//   setTranscript("");
//   setIsListening(true);

//   try{
//     await SpeechRecognition.ExpoSpeechRecognitionModule.start({
//       lang: "en-US",
//       interimResults: true,
//       continuous: false,
//     });
//   } catch (err) {
//     console.log("Start error:", err);
//     setIsListening(false);
//   }
// };

//   const stopListening = async () =>{
//     // Only call stop if the native module is actually loaded
//     if (isNativeAvailable) {
//       await SpeechRecognition.ExpoSpeechRecognitionModule.stop();
//     }
//     setIsListening(false);
//   };

//   return (
//   <View
//     style={{
//       position: "absolute",
//       top: 80,
//       left: 16,
//       flexDirection: "row",
//       alignItems: "flex-start",
//       zIndex: 999,
//     }}
//   >

//     {/* Mic Bubble */}
//     <Pressable
//       onPress={isListening ? stopListening : startListening}
//       className={`h-14 w-14 rounded-full items-center justify-center ${
//         isListening ? "bg-red-500/20" : "bg-sky-500/10"
//       }`}
//     >
//       <MaterialCommunityIcons
//         name={isListening ? "microphone-off" : "microphone"}
//         size={28}
//         color={isListening ? "#ef4444" : "#0ea5e9"}
//       />
//     </Pressable>

//     {/* Transcript Panel */}
//     {(isListening || transcript) && (
//       <View className="ml-3 bg-slate-900/90 border border-slate-800 px-4 py-3 rounded-2xl max-w-[220px]">

//         {transcript ? (
//           <Text className="text-white text-sm font-medium">
//             {transcript}
//           </Text>
//         ) : (
//           <Text className="text-slate-400 text-sm">
//             Listening...
//           </Text>
//         )}

//       </View>
//     )}
//   </View>
// );
  // return (
//   <SafeAreaView
//     edges={['top']}
//     style={{ flex: 1, backgroundColor: '#020617' }}
//   >
//     <View className="flex-1 px-6 pt-6">

//       {/* Header */}
//       <View className="mb-8 mt-4">
//         <Text className="text-white text-4xl font-extrabold tracking-tight">
//           Voice Control
//         </Text>
//         <Text className="text-slate-500 text-lg font-medium">
//         </Text>
//       </View>

//       {/* Mic Card */}
//       <View className="bg-slate-900/40 border border-slate-800/60 p-8 rounded-3xl items-center">

//         <Pressable
//           onPress={isListening ? stopListening : startListening}
//           className={`h-28 w-28 rounded-full items-center justify-center ${
//             isListening ? 'bg-red-500/20' : 'bg-sky-500/10'
//           }`}
//         >
//           <MaterialCommunityIcons
//             name={isListening ? 'microphone-off' : 'microphone'}
//             size={48}
//             color={isListening ? '#ef4444' : '#0ea5e9'}
//           />
//         </Pressable>

//         <Text className="text-slate-400 mt-6 text-sm font-semibold uppercase tracking-widest">
//           {isListening ? 'Listening...' : 'Tap to Speak'}
//         </Text>
//       </View>

//       {/* Transcript Section */}
//       <Text className="text-sky-500 text-xs font-black uppercase tracking-[2px] mb-4 ml-2 mt-8">
//         Live Transcript
//       </Text>

//       <View className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-3xl min-h-[100px]">
//         {transcript ? (
//           <Text className="text-white text-base font-medium">
//             {transcript}
//           </Text>
//         ) : (
//           <Text className="text-slate-500 text-sm">
//             Your speech will appear here...
//           </Text>
//         )}
//       </View>

//     </View>
//   </SafeAreaView>
// );
 