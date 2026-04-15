/**
 * Results Screen - Case Debrief and Scoring
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResultsScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const router = useRouter();

  // Mock score data - will load from DB in real app
  const scoreData = {
    total: 78,
    history: 85,
    exam: 75,
    investigation: 80,
    diagnosis: 90,
    management: 65,
    time: 70,
  };

  const debriefData = {
    summary:
      'Good overall performance. You correctly identified the key diagnosis but missed some important management steps.',
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
      case 'A':
        return '#22c55e';
      case 'B':
        return '#3b82f6';
      case 'C':
        return '#f59e0b';
      case 'D':
        return '#f97316';
      default:
        return '#ef4444';
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I scored ${scoreData.total}% on the MedSimulation case! Can you beat my score?`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleExport = () => {
    // In real app, export PDF/JSON
    console.log('Export session');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Score Header */}
        <View style={styles.scoreHeader}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>{scoreData.total}</Text>
            <Text style={styles.scoreLabel}>out of 100</Text>
          </View>
          <View
            style={[
              styles.gradeBadge,
              { backgroundColor: getGradeColor(getGrade(scoreData.total)) },
            ]}
          >
            <Text style={styles.gradeText}>{getGrade(scoreData.total)}</Text>
          </View>
        </View>

        {/* Domain Scores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Domain Scores</Text>
          <View style={styles.domainGrid}>
            <DomainCard label="History" score={scoreData.history} />
            <DomainCard label="Exam" score={scoreData.exam} />
            <DomainCard label="Investigations" score={scoreData.investigation} />
            <DomainCard label="Diagnosis" score={scoreData.diagnosis} />
            <DomainCard label="Management" score={scoreData.management} />
            <DomainCard label="Time Efficiency" score={scoreData.time} />
          </View>
        </View>

        {/* Correct Diagnosis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Correct Diagnosis</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoValue}>{debriefData.correctDiagnosis}</Text>
          </View>
        </View>

        {/* Management Plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Model Management Plan</Text>
          <View style={styles.infoCard}>
            {debriefData.correctManagement.map((item, index) => (
              <View key={index} style={styles.managementItem}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.managementText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Learning Points */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Learning Points</Text>
          <View style={styles.infoCard}>
            {debriefData.learningPoints.map((point, index) => (
              <View key={index} style={styles.learningPoint}>
                <Text style={styles.lpBullet}>→</Text>
                <Text style={styles.lpText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Coaching Points */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coaching Points</Text>
          <View style={[styles.infoCard, styles.coachingCard]}>
            {debriefData.coachingPoints.map((point, index) => (
              <View key={index} style={styles.learningPoint}>
                <Text style={styles.lpBullet}>💡</Text>
                <Text style={styles.lpText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Summary</Text>
          <View style={styles.infoCard}>
            <Text style={styles.summaryText}>{debriefData.summary}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Text style={styles.actionButtonText}>Share Score</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleExport}>
          <Text style={styles.actionButtonText}>Export PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => router.push('/')}
        >
          <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
            Try Another Case
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function DomainCard({ label, score }: { label: string; score: number }) {
  return (
    <View style={styles.domainCard}>
      <Text style={styles.domainName}>{label}</Text>
      <Text style={styles.domainScore}>{score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scoreHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  gradeBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  gradeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  domainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  domainCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  domainName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  domainScore: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  managementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  checkmark: {
    color: '#22c55e',
    fontWeight: 'bold',
    marginRight: 8,
    fontSize: 16,
  },
  managementText: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
  },
  learningPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  lpBullet: {
    marginRight: 8,
    fontSize: 16,
  },
  lpText: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
  },
  coachingCard: {
    backgroundColor: '#fef9e7',
    borderColor: '#fcd34d',
  },
  summaryText: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 22,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  primaryButtonText: {
    color: '#fff',
  },
});
