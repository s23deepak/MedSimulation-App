/**
 * Simulation Screen - Main Clinical Simulation Interface
 * Patient interaction, physical exam, investigations, imaging
 */

import React, { useState, useRef, useEffect } from 'react';
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
  Image,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLLMConfig } from '@/config';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Vitals {
  bp?: string;
  hr?: string;
  rr?: string;
  temp?: string;
  spo2?: string;
}

interface ImagingStudy {
  id: string;
  modality: string;
  description: string;
  image_url?: string;
  findings?: string;
}

export default function SimulationScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const chatScrollViewRef = useRef<ScrollView>(null);

  // State
  const [activeTab, setActiveTab] = useState<'chat' | 'exam' | 'imaging' | 'investigations'>('chat');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [examsPerformed, setExamsPerformed] = useState<{ system: string; findings: string }[]>([]);
  const [investigations, setInvestigations] = useState<{ name: string; result: string }[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [vitals, setVitals] = useState<Vitals>({});
  const [imagingStudies, setImagingStudies] = useState<ImagingStudy[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImagingStudy | null>(null);
  const [config, setConfig] = useState<any>(null);

  // Case data
  const [caseData, setCaseData] = useState({
    title: 'Loading...',
    specialty: '',
    difficulty: '',
    presentation: '',
  });

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const llmConfig = getLLMConfig();
        setConfig(llmConfig);

        // Start session
        const startResponse = await fetch(`${llmConfig.localBaseUrl}/api/simulation/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resident_name: 'Mobile User',
            case_id: (caseId || 'SIM-001').toUpperCase(),
          }),
        });

        if (startResponse.ok) {
          const session = await startResponse.json();
          setSessionId(session.session_id);
          setSessionData(session);
          setCaseData({
            title: session.case?.title || 'Clinical Case',
            specialty: session.case?.specialty || '',
            difficulty: session.case?.difficulty || '',
            presentation: session.case?.presentation || '',
          });
          setVitals(session.vitals || {});
          setImagingStudies(session.imaging_studies || []);

          // Add initial patient message
          setMessages([
            {
              id: 'initial',
              role: 'assistant',
              content: "Hello, doctor. I'm not feeling well. Please help me.",
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
      }
    };
    initSession();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        chatScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    if (!question.trim() || !config) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      const response = await fetch(`${config.localBaseUrl}/api/simulation/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId || 'mobile-session',
          question: question,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      const patientResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, patientResponse]);

      // Update vitals if returned
      if (data.vitals) {
        setVitals((prev) => ({ ...prev, ...data.vitals }));
      }
    } catch (error) {
      console.error('LLM error:', error);
      const patientResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble responding right now. Can you repeat that?",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, patientResponse]);
    } finally {
      setLoading(false);
    }
  };

  const handleExam = async (system: string) => {
    if (!config) return;
    const alreadyPerformed = examsPerformed.find((e) => e.system === system);
    if (alreadyPerformed) return;

    try {
      const response = await fetch(`${config.localBaseUrl}/api/simulation/exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId || 'mobile-session',
          system,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setExamsPerformed((prev) => [...prev, { system, findings: data.findings }]);
      }
    } catch (error) {
      console.error('Exam failed:', error);
    }
  };

  const handleInvestigation = async (name: string) => {
    if (!config || !name.trim()) return;

    try {
      const response = await fetch(`${config.localBaseUrl}/api/simulation/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId || 'mobile-session',
          investigation: name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setInvestigations((prev) => [...prev, { name, result: data.result }]);
      }
    } catch (error) {
      console.error('Investigation failed:', error);
    }
  };

  const handleViewImaging = async (study: ImagingStudy) => {
    if (!config) return;

    try {
      const response = await fetch(`${config.localBaseUrl}/api/simulation/imaging`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId || 'mobile-session',
          study_id: study.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedImage(data);
      }
    } catch (error) {
      console.error('Imaging failed:', error);
      setSelectedImage(study);
    }
  };

  const handleSubmit = async () => {
    if (!config || !sessionId) return;

    router.push(`/results?sessionId=${sessionId}&caseId=${caseId || 'SIM-001'}`);
  };

  const examSystems = [
    'General',
    'Vital Signs',
    'Cardiovascular',
    'Respiratory',
    'Abdomen',
    'Extremities',
    'Neurological',
    'Skin',
    'HEENT',
    'Psychiatric',
  ];

  const quickQuestions = [
    'Where does it hurt?',
    'When did it start?',
    'What makes it better?',
    'What makes it worse?',
    'Any medications?',
    'Any allergies?',
  ];

  const quickInvestigations = [
    'ECG',
    'Troponin',
    'CXR',
    'CBC',
    'BMP',
    'Lipase',
    'D-Dimer',
    'CT Chest',
  ];

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
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Case Presentation */}
        <View style={styles.presentationCard}>
          <Text style={styles.presentationLabel}>Initial Presentation</Text>
          <Text style={styles.presentationText}>{caseData.presentation}</Text>
        </View>

        {/* Vitals Grid */}
        {Object.keys(vitals).length > 0 && (
          <View style={styles.vitalsCard}>
            <Text style={styles.vitalsLabel}>Vital Signs</Text>
            <View style={styles.vitalsGrid}>
              {vitals.bp && (
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalName}>BP</Text>
                  <Text style={styles.vitalValue}>{vitals.bp}</Text>
                </View>
              )}
              {vitals.hr && (
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalName}>HR</Text>
                  <Text style={styles.vitalValue}>{vitals.hr}</Text>
                </View>
              )}
              {vitals.rr && (
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalName}>RR</Text>
                  <Text style={styles.vitalValue}>{vitals.rr}</Text>
                </View>
              )}
              {vitals.temp && (
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalName}>Temp</Text>
                  <Text style={styles.vitalValue}>{vitals.temp}</Text>
                </View>
              )}
              {vitals.spo2 && (
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalName}>SpO2</Text>
                  <Text style={styles.vitalValue}>{vitals.spo2}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['chat', 'exam', 'imaging', 'investigations'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'imaging' && imagingStudies.length > 0 && (
                  <Text style={styles.tabBadge}>{imagingStudies.length}</Text>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'chat' && (
          <>
            <View style={styles.chatContainer}>
              <ScrollView
                ref={chatScrollViewRef}
                style={styles.chatScroll}
                contentContainerStyle={styles.chatContent}
              >
                {messages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.patientBubble]}
                  >
                    {msg.role === 'assistant' && <Text style={messageStyles.fromLabel}>Patient</Text>}
                    <Text style={[msg.role === 'user' ? messageStyles.userText : messageStyles.patientText]}>
                      {msg.content}
                    </Text>
                  </View>
                ))}
                {loading && (
                  <View style={[styles.messageBubble, styles.patientBubble]}>
                    <ActivityIndicator size="small" color="#2563eb" />
                  </View>
                )}
              </ScrollView>

              {/* Quick Questions */}
              <ScrollView horizontal style={styles.quickQuestions} showsHorizontalScrollIndicator={false}>
                {quickQuestions.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.quickChip}
                    onPress={() => setQuestion(q)}
                  >
                    <Text style={styles.quickChipText}>{q}</Text>
                  </TouchableOpacity>
                ))}
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
                <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </View>
          </>
        )}

        {activeTab === 'exam' && (
          <View style={styles.examContainer}>
            <Text style={styles.examHelp}>Tap each system to perform examination:</Text>
            {examSystems.map((system) => {
              const performed = examsPerformed.find((e) => e.system === system);
              return (
                <View key={system}>
                  <TouchableOpacity
                    style={[styles.examButton, performed && styles.examButtonDone]}
                    onPress={() => handleExam(system)}
                  >
                    <Text style={[styles.examButtonText, performed && styles.examButtonTextDone]}>
                      {system}
                    </Text>
                  </TouchableOpacity>
                  {performed && (
                    <View style={styles.findingsCard}>
                      <Text style={styles.findingsLabel}>{system}</Text>
                      <Text style={styles.findingsText}>{performed.findings}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {activeTab === 'imaging' && (
          <View style={styles.imagingContainer}>
            <Text style={styles.examHelp}>Click a study to view the image:</Text>
            {imagingStudies.length === 0 ? (
              <Text style={styles.emptyText}>No imaging studies available for this case.</Text>
            ) : (
              imagingStudies.map((study) => (
                <TouchableOpacity
                  key={study.id}
                  style={styles.imagingCard}
                  onPress={() => handleViewImaging(study)}
                >
                  <View style={styles.imagingHeader}>
                    <View style={styles.modalityBadge}>
                      <Text style={styles.modalityText}>{study.modality}</Text>
                    </View>
                    <Text style={styles.imagingDescription}>{study.description}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'investigations' && (
          <View style={styles.invContainer}>
            <Text style={styles.invHelp}>Quick orders:</Text>
            <ScrollView horizontal style={styles.quickInvs} showsHorizontalScrollIndicator={false}>
              {quickInvestigations.map((inv, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.invChip}
                  onPress={() => handleInvestigation(inv)}
                >
                  <Text style={styles.invChipText}>{inv}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.invInputRow}>
              <TextInput
                style={styles.invInput}
                placeholder="Or type investigation name..."
                returnKeyType="go"
                onSubmitEditing={() => {
                  handleInvestigation(question);
                  setQuestion('');
                }}
                value={question}
                onChangeText={setQuestion}
              />
              <TouchableOpacity style={styles.invButton} onPress={() => handleInvestigation(question)}>
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
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit Assessment</Text>
        </TouchableOpacity>
      </View>

      {/* Imaging Modal */}
      <Modal
        visible={!!selectedImage}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedImage?.modality}</Text>
              <TouchableOpacity onPress={() => setSelectedImage(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedImage?.image_url ? (
                <Image
                  source={{ uri: selectedImage.image_url }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderText}>Image not available</Text>
                </View>
              )}
              {selectedImage?.findings && (
                <View style={styles.modalFindings}>
                  <Text style={styles.modalFindingsLabel}>Findings:</Text>
                  <Text style={styles.modalFindingsText}>{selectedImage.findings}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
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
  backButtonText: { fontSize: 24, color: '#2563eb' },
  headerCenter: { flex: 1 },
  caseTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  caseMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  timerBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerText: { fontSize: 14, fontWeight: '600', color: '#475569', fontVariant: ['tabular-nums'] },

  content: { flex: 1 },
  contentContainer: { paddingBottom: 80 },

  presentationCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presentationLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: 8 },
  presentationText: { fontSize: 14, color: '#0f172a', lineHeight: 20 },

  vitalsCard: {
    margin: 16,
    marginTop: 0,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  vitalsLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: 12 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  vitalItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  vitalName: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  vitalValue: { fontSize: 16, fontWeight: '600', color: '#0f172a' },

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#2563eb' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#64748b', flexDirection: 'row', alignItems: 'center', gap: 4 },
  tabTextActive: { color: '#2563eb', fontWeight: '600' },
  tabBadge: {
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },

  chatContainer: { flex: 1, height: 500 },
  chatScroll: { flex: 1 },
  chatContent: { padding: 16, minHeight: 300 },
  messageBubble: {
    maxWidth: '85%',
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
  quickQuestions: {
    maxHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quickChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  quickChipText: { fontSize: 13, color: '#475569' },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  sendButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  examContainer: { padding: 16 },
  examHelp: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  examButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  examButtonDone: { backgroundColor: '#f0fdf4', borderColor: '#22c55e' },
  examButtonText: { fontSize: 15, color: '#0f172a', fontWeight: '500' },
  examButtonTextDone: { color: '#15803d', fontWeight: '600' },
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
  findingsLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  findingsText: { fontSize: 14, color: '#0f172a', lineHeight: 20 },

  imagingContainer: { padding: 16 },
  imagingCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  imagingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalityBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modalityText: { fontSize: 11, fontWeight: '600', color: '#fff', textTransform: 'uppercase' },
  imagingDescription: { flex: 1, fontSize: 14, color: '#0f172a' },
  emptyText: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginTop: 40 },

  invContainer: { padding: 16 },
  invHelp: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  quickInvs: { maxHeight: 44, marginBottom: 12 },
  invChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  invChipText: { fontSize: 13, color: '#475569' },
  invInputRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
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
  invButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  invList: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  invListTitle: { fontSize: 11, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: 8 },
  invEmpty: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic' },
  invResult: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  invResultName: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  invResultValue: { fontSize: 14, color: '#64748b' },

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
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  modalClose: { fontSize: 24, color: '#64748b' },
  modalBody: { padding: 16 },
  modalImage: { width: '100%', height: 300, borderRadius: 8 },
  placeholderImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 16, color: '#94a3b8' },
  modalFindings: { marginTop: 16, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 },
  modalFindingsLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  modalFindingsText: { fontSize: 14, color: '#0f172a', lineHeight: 20 },
});

const messageStyles = StyleSheet.create({
  fromLabel: { fontSize: 10, color: '#64748b', marginBottom: 4, fontWeight: '600' },
  userText: { color: '#fff', fontSize: 15 },
  patientText: { color: '#0f172a', fontSize: 15 },
});
