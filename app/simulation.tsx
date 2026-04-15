/**
 * Simulation Screen - Main Clinical Simulation Interface
 * Patient interaction, physical exam, investigations
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function SimulationScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  // State
  const [activeTab, setActiveTab] = useState<'chat' | 'exam' | 'investigations' | 'results'>('chat');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [examsPerformed, setExamsPerformed] = useState<string[]>([]);
  const [investigations, setInvestigations] = useState<{ name: string; result: string }[]>([]);

  // Mock case data - will load from DB in real app
  const caseData = {
    title: 'Chest Pain in the ED',
    specialty: 'Emergency Medicine',
    difficulty: 'medium',
    presentation:
      'A 55-year-old male presents with crushing substernal chest pain radiating to the left arm. Pain started 2 hours ago while watching TV. Associated with shortness of breath and diaphoresis.',
  };

  const handleSendMessage = async () => {
    if (!question.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    // Simulate patient response - will use on-device LLM in real app
    setTimeout(() => {
      const patientResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getPatientResponse(question),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, patientResponse]);
      setLoading(false);
    }, 1000);
  };

  const getPatientResponse = (q: string): string => {
    // Mock responses - will use MLC Chat in real app
    const lowerQ = q.toLowerCase();
    if (lowerQ.includes('pain') || lowerQ.includes('hurt')) {
      return "Yes, it's a crushing pressure in my chest. It goes down my left arm. It's really bad, like an elephant sitting on me.";
    }
    if (lowerQ.includes('when') || lowerQ.includes('start')) {
      return 'It started about 2 hours ago. I was just watching TV when it came on suddenly.';
    }
    if (lowerQ.includes('medicine') || lowerQ.includes('drug') || lowerQ.includes('allerg')) {
      return "I take lisinopril for high blood pressure. No drug allergies that I know of.";
    }
    if (lowerQ.includes('smoke') || lowerQ.includes('alcohol')) {
      return "I smoke about a pack a day for 30 years. I drink maybe 2-3 beers on weekends.";
    }
    return "I'm not sure about that. Can you ask me something else?";
  };

  const handleExam = (system: string) => {
    if (examsPerformed.includes(system)) return;

    setExamsPerformed((prev) => [...prev, system]);
    // In real app, this would show findings after exam
  };

  const examSystems = [
    'General',
    'Vital Signs',
    'Cardiovascular',
    'Respiratory',
    'Abdomen',
    'Extremities',
    'Neurological',
  ];

  const examFindings: Record<string, string> = {
    'Vital Signs':
      'BP 165/95, HR 110, RR 22, Temp 37°C, SpO2 94% on room air',
    Cardiovascular:
      'Tachycardic, regular rhythm. S1, S2 normal. No murmurs. No JVD.',
    Respiratory:
      'Clear to auscultation bilaterally. No wheezes, rales, or rhonchi.',
    Abdomen: 'Soft, non-tender, non-distended. Bowel sounds present.',
    Extremities:
      'Warm and well-perfused. No edema. Pedal pulses 2+ bilaterally.',
    Neurological: 'Alert and oriented. No focal deficits.',
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.caseTitle}>{caseData.title}</Text>
          <Text style={styles.caseMeta}>
            {caseData.specialty} • {caseData.difficulty}
          </Text>
        </View>
      </View>

      {/* Presentation */}
      <View style={styles.presentationCard}>
        <Text style={styles.presentationLabel}>Initial Presentation</Text>
        <Text style={styles.presentationText}>{caseData.presentation}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['chat', 'exam', 'investigations'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'chat' && (
          <>
            <ScrollView
              ref={scrollViewRef}
              style={styles.chatContainer}
              contentContainerStyle={styles.chatContent}
            >
              {messages.length === 0 ? (
                <Text style={styles.chatPlaceholder}>
                  Ask the patient about their symptoms, history, or concerns.
                </Text>
              ) : (
                messages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageBubble,
                      msg.role === 'user' ? styles.userBubble : styles.patientBubble,
                    ]}
                  >
                    <Text
                      style={
                        msg.role === 'user'
                          ? styles.userMessageText
                          : styles.patientMessageText
                      }
                    >
                      {msg.content}
                    </Text>
                  </View>
                ))
              )}
              {loading && (
                <View style={[styles.messageBubble, styles.patientBubble]}>
                  <ActivityIndicator size="small" color="#2563eb" />
                </View>
              )}
            </ScrollView>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.inputContainer}
            >
              <TextInput
                style={styles.input}
                placeholder="Ask the patient..."
                value={question}
                onChangeText={setQuestion}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendMessage}
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </>
        )}

        {activeTab === 'exam' && (
          <ScrollView style={styles.examContainer}>
            <Text style={styles.examHelp}>
              Tap each system to perform examination:
            </Text>
            {examSystems.map((system) => {
              const isPerformed = examsPerformed.includes(system);
              return (
                <View key={system}>
                  <TouchableOpacity
                    style={[
                      styles.examButton,
                      isPerformed && styles.examButtonDone,
                    ]}
                    onPress={() => handleExam(system)}
                  >
                    <Text
                      style={[
                        styles.examButtonText,
                        isPerformed && styles.examButtonTextDone,
                      ]}
                    >
                      {system}
                    </Text>
                  </TouchableOpacity>
                  {isPerformed && examFindings[system] && (
                    <View style={styles.findingsCard}>
                      <Text style={styles.findingsLabel}>{system}</Text>
                      <Text style={styles.findingsText}>
                        {examFindings[system]}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        {activeTab === 'investigations' && (
          <View style={styles.invContainer}>
            <Text style={styles.invHelp}>
              Type an investigation to order (e.g., "ECG", "Troponin", "CXR")
            </Text>
            <View style={styles.invInputRow}>
              <TextInput
                style={styles.invInput}
                placeholder="Investigation name..."
                returnKeyType="go"
                onSubmitEditing={() => {
                  // Handle investigation order
                }}
              />
              <TouchableOpacity style={styles.invButton}>
                <Text style={styles.invButtonText}>Order</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.invList}>
              <Text style={styles.invListTitle}>Ordered Investigations</Text>
              {investigations.length === 0 ? (
                <Text style={styles.invEmpty}>No investigations ordered yet</Text>
              ) : (
                investigations.map((inv, i) => (
                  <View key={i} style={styles.invResult}>
                    <Text style={styles.invResultName}>{inv.name}</Text>
                    <Text style={styles.invResultValue}>{inv.result}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </View>

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => router.push(`/results?caseId=${caseId}`)}
        >
          <Text style={styles.submitButtonText}>Submit Assessment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 24,
    color: '#2563eb',
  },
  headerCenter: {
    flex: 1,
  },
  caseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  caseMeta: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  presentationCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presentationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  presentationText: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 22,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    minHeight: 300,
  },
  chatPlaceholder: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  patientBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  userMessageText: {
    color: '#fff',
    fontSize: 15,
  },
  patientMessageText: {
    color: '#0f172a',
    fontSize: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#2563eb',
    borderRadius: 24,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  examContainer: {
    padding: 16,
  },
  examHelp: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  examButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  examButtonDone: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
  },
  examButtonText: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  examButtonTextDone: {
    color: '#15803d',
    fontWeight: '600',
  },
  findingsCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#22c55e',
    borderLeftWidth: 4,
  },
  findingsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  findingsText: {
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
  },
  invContainer: {
    padding: 16,
  },
  invHelp: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  invInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  invInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 15,
  },
  invButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  invButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  invList: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  invListTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  invEmpty: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  invResult: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  invResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  invResultValue: {
    fontSize: 14,
    color: '#64748b',
  },
  submitContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
