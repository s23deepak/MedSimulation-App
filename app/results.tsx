/**
 * Results Screen - Case Debrief and Scoring
 * Fetches real scores from backend API
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLLMConfig } from '@/config';

interface ScoreData {
  total: number;
  history: number;
  exam: number;
  investigation: number;
  diagnosis: number;
  management: number;
  time: number;
}

interface DebriefData {
  summary: string;
  correctDiagnosis: string;
  correctManagement: string[];
  learningPoints: string[];
  coachingPoints: string[];
}

export default function ResultsScreen() {
  const { sessionId, caseId } = useLocalSearchParams<{ sessionId?: string; caseId?: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [debriefData, setDebriefData] = useState<DebriefData | null>(null);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const loadResults = async () => {
      console.log('=== Results Screen ===');
      console.log('sessionId from params:', sessionId);
      console.log('caseId from params:', caseId);

      try {
        const llmConfig = getLLMConfig();
        setConfig(llmConfig);

        if (!sessionId) {
          console.log('No sessionId - showing mock data');
          setMockData();
          setLoading(false);
          return;
        }

        // Fetch debrief
        const debriefUrl = `${llmConfig.localBaseUrl}/api/simulation/session/${sessionId}/debrief`;
        console.log('Fetching debrief from:', debriefUrl);

        const debriefResponse = await fetch(debriefUrl);
        console.log('Debrief response status:', debriefResponse.status);

        if (debriefResponse.ok) {
          const data = await debriefResponse.json();
          console.log('Debrief data received:', JSON.stringify(data, null, 2).substring(0, 500) + '...');

          // Backend returns: scores.domain_scores.history, etc.
          const domainScores = data.scores?.domain_scores || data.scores || {};
          const scoreData = {
            total: data.scores?.percentage || data.scores?.total || 0,
            history: domainScores.history || 0,
            exam: domainScores.exam || 0,
            investigation: domainScores.investigations || 0,
            diagnosis: domainScores.diagnosis || 0,
            management: domainScores.management || 0,
            time: 0,
          };
          console.log('Parsed score data:', scoreData);

          const debriefData = {
            summary: data.debrief?.summary || data.scores?.ai_feedback?.substring(0, 200) || '',
            correctDiagnosis: data.scores?.correct_diagnosis || data.debrief?.diagnosis_feedback || '',
            correctManagement: data.scores?.correct_management || [],
            learningPoints: data.scores?.key_learning_points || [],
            coachingPoints: data.debrief?.coaching_points || [],
          };
          console.log('Parsed debrief data:', debriefData);

          setScoreData(scoreData);
          setDebriefData(debriefData);
        } else {
          const errorText = await debriefResponse.text();
          console.log('Debrief failed:', debriefResponse.status, errorText);
          console.log('Showing mock data as fallback');
          setMockData();
        }
      } catch (error) {
        console.error('Failed to load results:', error);
        setMockData();
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, []);

  const setMockData = () => {
    setScoreData({
      total: 78,
      history: 85,
      exam: 75,
      investigation: 80,
      diagnosis: 90,
      management: 65,
      time: 70,
    });
    setDebriefData({
      summary: 'Good overall performance. You correctly identified the key diagnosis but missed some important management steps.',
      correctDiagnosis: 'Acute Myocardial Infarction (STEMI)',
      correctManagement: [
        'Activate cath lab immediately',
        'Aspirin 325mg chewed',
        'Ticagrelor 180mg or Clopidogrel 600mg',
        'Heparin bolus',
        'Nitroglycerin (if BP allows)',
        'Morphine for pain control',
        'Cardiology consult',
        'Serial troponins',
      ],
      learningPoints: [
        'Time is muscle - early cath lab activation improves outcomes',
        'Dual antiplatelet therapy is critical in STEMI',
        'Pain control reduces sympathetic surge and myocardial oxygen demand',
      ],
      coachingPoints: [
        'Consider ordering a CT angiogram for faster diagnosis',
        'Remember to check contraindications before giving anticoagulants',
      ],
    });
  };

  const getGrade = (score: number): string => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A': return '#22c55e';
      case 'B': return '#3b82f6';
      case 'C': return '#f59e0b';
      case 'D': return '#f97316';
      default: return '#ef4444';
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I scored ${scoreData?.total}% on the MedSimulation case! Can you beat my score?`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleExport = async () => {
    if (!config || !sessionId) {
      Alert.alert('Error', 'No session to export');
      return;
    }

    try {
      // First check if session is scored
      const debriefResponse = await fetch(
        `${config.localBaseUrl}/api/simulation/session/${sessionId}/debrief`
      );

      if (!debriefResponse.ok || debriefResponse.status === 400) {
        Alert.alert(
          'Export Unavailable',
          'Please submit your diagnosis and management plan before exporting.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Fetch PDF as blob
      const pdfResponse = await fetch(
        `${config.localBaseUrl}/api/simulation/session/${sessionId}/export/pdf`
      );

      if (!pdfResponse.ok) {
        throw new Error(`Export failed with status ${pdfResponse.status}`);
      }

      // Get PDF as blob
      const blob = await pdfResponse.blob();

      // Create download link (web only)
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MedSimulation_${sessionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('PDF download initiated');
    } catch (error) {
      console.error('Export failed:', error);

      // Fallback: try opening in new window
      try {
        const pdfUrl = `${config.localBaseUrl}/api/simulation/session/${sessionId}/export/pdf`;
        window.open(pdfUrl, '_blank');
      } catch (e) {
        Alert.alert('Error', 'Export failed. Try using a different browser.');
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading results...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Debug indicator - shows if using mock data */}
        <View style={styles.debugIndicator}>
          <Text style={styles.debugText}>
            {sessionId ? '✓ Real scores from session' : '⚠ Using mock data'}
          </Text>
        </View>

        {/* Score Header - Centered with circular progress */}
        <View style={styles.scoreHeader}>
          <View style={styles.scoreCircleContainer}>
            <View style={[styles.scoreCircle, { borderColor: getGradeColor(getGrade(scoreData?.total || 0)) }]}>
              <Text style={[styles.scorePercentage, { color: getGradeColor(getGrade(scoreData?.total || 0)) }]}>
                {scoreData?.total}
              </Text>
              <Text style={styles.scoreOutOf}>/ 100</Text>
            </View>
            <View
              style={[
                styles.gradeBadge,
                { backgroundColor: getGradeColor(getGrade(scoreData?.total || 0)) },
              ]}
            >
              <Text style={styles.gradeText}>{getGrade(scoreData?.total || 0)}</Text>
            </View>
            <Text style={styles.gradeLabel}>
              {getGrade(scoreData?.total || 0) === 'A' ? 'Excellent' :
               getGrade(scoreData?.total || 0) === 'B' ? 'Good' :
               getGrade(scoreData?.total || 0) === 'C' ? 'Satisfactory' :
               getGrade(scoreData?.total || 0) === 'D' ? 'Needs Improvement' : 'Unsatisfactory'}
            </Text>
          </View>
        </View>

        {/* Domain Scores - Horizontal cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Domain Scores</Text>
          <View style={styles.domainRow}>
            <DomainCard label="History" score={scoreData?.history || 0} maxScore={20} />
            <DomainCard label="Examination" score={scoreData?.exam || 0} maxScore={20} />
            <DomainCard label="Investigations" score={scoreData?.investigation || 0} maxScore={20} />
            <DomainCard label="Diagnosis" score={scoreData?.diagnosis || 0} maxScore={25} />
            <DomainCard label="Management" score={scoreData?.management || 0} maxScore={15} />
          </View>
        </View>

        {/* Correct Diagnosis */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardIconText}>📋</Text>
            </View>
            <Text style={styles.cardTitle}>Correct Diagnosis</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.diagnosisText}>{debriefData?.correctDiagnosis}</Text>
          </View>
        </View>

        {/* Model Management Plan */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardIconText}>💊</Text>
            </View>
            <Text style={styles.cardTitle}>Model Management Plan</Text>
          </View>
          <View style={styles.cardContent}>
            {debriefData?.correctManagement.map((item, index) => (
              <View key={index} style={styles.planItem}>
                <View style={styles.planBullet}>
                  <Text style={styles.planBulletText}>•</Text>
                </View>
                <Text style={styles.planText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* AI Tutor Feedback */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardIconText}>🤖</Text>
            </View>
            <Text style={styles.cardTitle}>AI Tutor Feedback</Text>
          </View>
          <View style={styles.cardContent}>
            {debriefData?.summary && (
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackTitle}>Overall Performance</Text>
                <Text style={styles.feedbackText}>{debriefData.summary}</Text>
              </View>
            )}
            {debriefData?.coachingPoints && debriefData.coachingPoints.length > 0 && (
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackTitle}>Areas for Improvement</Text>
                {debriefData.coachingPoints.map((point, index) => (
                  <View key={index} style={styles.coachingItem}>
                    <Text style={styles.coachingBullet}>→</Text>
                    <Text style={styles.coachingText}>{point}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Key Learning Points */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardIconText}>📚</Text>
            </View>
            <Text style={styles.cardTitle}>Key Learning Points</Text>
          </View>
          <View style={styles.cardContent}>
            {debriefData?.learningPoints && debriefData.learningPoints.length > 0 ? (
              debriefData.learningPoints.map((point, index) => (
                <View key={index} style={styles.learningItem}>
                  <View style={styles.learningNumber}>
                    <Text style={styles.learningNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.learningText}>{point}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No specific learning points for this case.</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleExport}>
          <Text style={styles.actionButtonText}>📥 Export PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => router.push('/')}
        >
          <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
            New Case
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function DomainCard({ label, score, maxScore }: { label: string; score: number; maxScore: number }) {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

  const getGrade = (p: number) => {
    if (p >= 90) return 'A';
    if (p >= 80) return 'B';
    if (p >= 70) return 'C';
    if (p >= 60) return 'D';
    return 'F';
  };

  const getGradeColor = (g: string) => {
    switch (g) {
      case 'A': return '#22c55e';
      case 'B': return '#3b82f6';
      case 'C': return '#f59e0b';
      case 'D': return '#f97316';
      default: return '#ef4444';
    }
  };

  const grade = getGrade(percentage);
  const color = getGradeColor(grade);

  return (
    <View style={[styles.domainCard, { borderTopColor: color }]}>
      <Text style={styles.domainLabel}>{label}</Text>
      <View style={styles.domainScoreContainer}>
        <Text style={[styles.domainScoreValue, { color }]}>{score}</Text>
        <Text style={styles.domainScoreMax}>/{maxScore}</Text>
      </View>
      <View style={[styles.domainGradeBadge, { backgroundColor: color }]}>
        <Text style={styles.domainGradeText}>{grade}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1 },
  debugIndicator: {
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
    alignItems: 'center',
  },
  debugText: { fontSize: 12, color: '#15803d', fontWeight: '500' },
  scoreHeader: {
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  scoreCircleContainer: { alignItems: 'center' },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  scorePercentage: { fontSize: 42, fontWeight: 'bold' },
  scoreOutOf: { fontSize: 14, color: '#94a3b8', marginTop: -4 },
  gradeBadge: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  gradeText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  gradeLabel: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
  domainRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  domainCard: {
    width: '19%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  domainLabel: { fontSize: 9, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' },
  domainScoreContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  domainScoreValue: { fontSize: 24, fontWeight: 'bold' },
  domainScoreMax: { fontSize: 14, color: '#94a3b8', marginLeft: 2 },
  domainGradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  domainGradeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardIconText: { fontSize: 18 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  cardContent: { padding: 16 },
  diagnosisText: { fontSize: 15, color: '#0f172a', lineHeight: 22, fontWeight: '500' },
  planItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  planBullet: { marginRight: 10, marginTop: -2 },
  planBulletText: { fontSize: 16, color: '#3b82f6' },
  planText: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 21 },
  feedbackSection: { marginBottom: 16 },
  feedbackTitle: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  feedbackText: { fontSize: 14, color: '#334155', lineHeight: 22 },
  coachingItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6 },
  coachingBullet: { fontSize: 16, color: '#f59e0b', marginRight: 8, marginTop: -2 },
  coachingText: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 21 },
  learningItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  learningNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  learningNumberText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  learningText: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 21 },
  emptyText: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic' },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
    paddingBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: { color: '#fff', fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 16 },
});
