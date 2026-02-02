import { useState, useCallback, useEffect, useRef } from 'react';

// Check if Web Speech API is available
export const isSpeechSupported = () => {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
};

// Custom hook for speech-to-text
export function useSpeechToText(onResult, onError) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      // Auto-stop after 10 seconds for better UX
      timeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 10000);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript && onResult) {
        onResult(transcript.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Handle specific errors
      if (event.error === 'not-allowed') {
        onError?.('Microphone access denied. Please allow microphone access and try again.');
      } else if (event.error === 'no-speech') {
        onError?.('No speech detected. Please try again.');
      } else if (event.error === 'network') {
        onError?.('Network error. Please check your connection.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onResult, onError]);

  // Start listening
  const startListening = useCallback(async () => {
    if (!recognitionRef.current || isListening) return;

    try {
      // Request microphone permission explicitly for mobile
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop the stream immediately - we just needed permission
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          onError?.('Microphone access denied. Please allow microphone access in your browser settings.');
          return;
        }
      }

      recognitionRef.current.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      // Handle the case where recognition is already started
      if (err.name === 'InvalidStateError') {
        recognitionRef.current.stop();
      } else {
        onError?.('Failed to start voice input. Please try again.');
      }
    }
  }, [isListening, onError]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening
  };
}
