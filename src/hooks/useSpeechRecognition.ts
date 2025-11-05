/**
 * useSpeechRecognition Hook - Voice input using Expo Speech Recognition
 * Simplified version for Expo (Expo doesn't have built-in speech recognition,
 * so this is a placeholder that can be extended with expo-speech-recognition or web APIs)
 */

import { useState, useCallback } from "react";
import * as Speech from "expo-speech";

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
  speak: (text: string) => Promise<void>;
  isSpeaking: boolean;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const startListening = useCallback(async () => {
    setIsListening(true);
    setError(null);

    // Note: Expo doesn't have built-in speech recognition
    // This would need to be implemented using:
    // 1. expo-speech-recognition (if available)
    // 2. A native module
    // 3. Web Speech API (web only)

    // For now, we'll show an error
    setError("Speech recognition not yet implemented. Please type your message.");
    setIsListening(false);
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  const speak = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);
      await Speech.speak(text, {
        language: "en-US",
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onError: () => {
          setError("Speech synthesis failed");
          setIsSpeaking(false);
        },
      });
    } catch (e: any) {
      setError(e?.message ?? "Speech synthesis failed");
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    speak,
    isSpeaking,
  };
}
