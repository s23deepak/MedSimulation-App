/**
 * Home Screen - Dashboard
 * Shows recommended cases, search, and case generation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLLMConfig } from '@/config';

interface Case {
  id: string;
  case_id: string;
  title: string;
  specialty: string;
  difficulty: 'easy' | 'medium' | 'hard';
  source?: string;
}

type SearchSource = 'auto' | 'pubmed' | 'wiley' | 'endless_medical';

export default function HomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState<SearchSource>('auto');
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [newCaseAdded, setNewCaseAdded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'offline'>('checking');

  // Load recommended cases and check connection on mount
  useEffect(() => {
    checkConnection();
    loadCases();
  }, []);

  const checkConnection = async () => {
    try {
      const config = getLLMConfig();
      const response = await fetch(`${config.localBaseUrl}/api/health`);
      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('offline');
      }
    } catch {
      setConnectionStatus('offline');
    }
  };

  const loadCases = async () => {
    setLoading(true);
    try {
      const config = getLLMConfig();
      const response = await fetch(`${config.localBaseUrl}/api/cases/recommended?limit=10`);
      console.log('Load cases response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded cases:', data.length, 'cases');
        // Map backend difficulty (beginner/intermediate/advanced) to app format (easy/medium/hard)
        const mappedCases = data.map((c: any) => ({
          id: c.case_id || c.id,
          case_id: c.case_id,
          title: c.title,
          specialty: c.specialty,
          difficulty: mapDifficulty(c.difficulty),
          source: c._source || c.source,
        }));
        console.log('Mapped cases:', mappedCases.map(c => `${c.case_id} (${c.difficulty})`));
        setCases(mappedCases);
      } else {
        console.warn('API returned non-OK status, using mock data');
        // Fallback to mock data
        setCases(getMockCases());
      }
    } catch (error) {
      console.error('Failed to load cases:', error);
      setCases(getMockCases());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const mapDifficulty = (difficulty: string): 'easy' | 'medium' | 'hard' => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'easy';
      case 'intermediate': return 'medium';
      case 'advanced': return 'hard';
      default: return 'medium';
    }
  };

  const getMockCases = (): Case[] => [
    { id: '1', case_id: 'SIM-001', title: 'Chest Pain in the ED', specialty: 'Emergency Medicine', difficulty: 'medium' },
    { id: '2', case_id: 'SIM-002', title: 'Shortness of Breath', specialty: 'Internal Medicine', difficulty: 'easy' },
    { id: '3', case_id: 'SIM-003', title: 'Altered Mental Status', specialty: 'Emergency Medicine', difficulty: 'hard' },
    { id: '4', case_id: 'SIM-004', title: 'Abdominal Pain', specialty: 'General Surgery', difficulty: 'medium' },
    { id: '5', case_id: 'SIM-005', title: 'Pediatric Fever', specialty: 'Pediatrics', difficulty: 'easy' },
    { id: '6', case_id: 'SIM-006', title: 'Neurological Deficit', specialty: 'Neurology', difficulty: 'hard' },
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const config = getLLMConfig();
      console.log('Generating case for:', searchQuery, 'source:', searchSource);
      const response = await fetch(`${config.localBaseUrl}/api/cases/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: searchQuery,
          source: searchSource,
        }),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const result = await response.json();

        // Fetch the full case data directly by ID
        const config = getLLMConfig();
        const caseResponse = await fetch(`${config.localBaseUrl}/api/cases/${result.case_id}`);

        if (caseResponse.ok) {
          const fullCase = await caseResponse.json();

          // Map to our format and add to top of list
          const mappedCase = {
            id: fullCase.case_id,
            case_id: fullCase.case_id,
            title: fullCase.title,
            specialty: fullCase.specialty,
            difficulty: mapDifficulty(fullCase.difficulty),
            source: fullCase.source || 'ai_generated',
          };

          // Update state - this WILL trigger re-render
          setCases((prevCases: Case[]) => {
            const filtered = prevCases.filter(c => c.case_id !== result.case_id);
            return [mappedCase, ...filtered];
          });

          // Set visual indicator that new case was added
          setNewCaseAdded(result.case_id);

          // Clear the "new" indicator after 3 seconds
          setTimeout(() => setNewCaseAdded(null), 3000);
        }

        // Auto-open the simulation after case generation
        router.push(`/simulation?caseId=${result.case_id}`);
      } else {
        const error = await response.text();
        console.error('Generation failed:', error);
        Alert.alert('Error', `Failed to generate case: ${error}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate case. Please try again.');
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleCasePress = (caseId: string) => {
    router.push(`/simulation?caseId=${caseId.toUpperCase()}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#22c55e';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#64748b';
    }
  };

  const renderCase = ({ item }: { item: Case }) => {
    const isNew = newCaseAdded === item.case_id;
    return (
      <TouchableOpacity
        style={[styles.caseCard, isNew && styles.newCaseCard]}
        onPress={() => handleCasePress(item.case_id)}
        activeOpacity={0.7}
      >
        <View style={styles.caseHeader}>
          <Text style={styles.caseTitle}>{item.title}</Text>
          <View style={styles.badgeRow}>
            {isNew && <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>}
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
              <Text style={styles.difficultyText}>{item.difficulty}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.caseSpecialty}>{item.specialty}</Text>
        {item.source && <Text style={styles.caseSource}>Source: {item.source}</Text>}
      </TouchableOpacity>
    );
  };

  const renderLoading = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading cases...</Text>
      </View>
    </SafeAreaView>
  );

  if (loading && cases.length === 0) return renderLoading();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>MedSimulation</Text>
            <Text style={styles.subtitle}>Clinical Simulation Lab</Text>
          </View>
          <View style={[styles.connectionStatus, connectionStatus === 'connected' ? styles.connected : styles.offline]}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {connectionStatus === 'checking' ? 'Checking...' : connectionStatus === 'connected' ? 'AI Ready' : 'Offline Mode'}
            </Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <Text style={styles.searchLabel}>Generate a Custom Case</Text>
          <Text style={styles.searchHelp}>Search a topic to instantly generate a clinical case</Text>

          <View style={styles.searchForm}>
            <TextInput
              style={styles.searchInput}
              placeholder="What would you like to practice diagnosing?"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />

            <View style={styles.sourceRow}>
              <Text style={styles.sourceLabel}>Source:</Text>
              <TouchableOpacity
                style={[styles.sourceChip, searchSource === 'auto' && styles.sourceChipActive]}
                onPress={() => setSearchSource('auto')}
              >
                <Text style={[styles.sourceText, searchSource === 'auto' && styles.sourceTextActive]}>Auto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sourceChip, searchSource === 'pubmed' && styles.sourceChipActive]}
                onPress={() => setSearchSource('pubmed')}
              >
                <Text style={[styles.sourceText, searchSource === 'pubmed' && styles.sourceTextActive]}>PubMed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sourceChip, searchSource === 'endless_medical' && styles.sourceChipActive]}
                onPress={() => setSearchSource('endless_medical')}
              >
                <Text style={[styles.sourceText, searchSource === 'endless_medical' && styles.sourceTextActive]}>Endless</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.searchButton, searching && styles.searchButtonDisabled]}
              onPress={handleSearch}
              disabled={searching}
            >
              {searching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.searchButtonText}>Generate Case</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Recommended Cases */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended Cases</Text>
          <FlatList
            data={cases}
            renderItem={renderCase}
            keyExtractor={(item) => item.id}
            key={`cases-${cases.length}-${cases[0]?.case_id || 'empty'}`}
            scrollEnabled={false}
            extraData={{ length: cases.length, firstId: cases[0]?.case_id }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={loadCases} />
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { flex: 1 },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2563eb' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  connected: { backgroundColor: '#dcfce7' },
  offline: { backgroundColor: '#fef3c7' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'currentColor' },
  connectedDot: { backgroundColor: '#22c55e' },
  offlineDot: { backgroundColor: '#f59e0b' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#64748b' },

  searchSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 1,
  },
  searchLabel: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  searchHelp: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  searchForm: { gap: 12 },
  searchInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 16,
  },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sourceLabel: { fontSize: 13, color: '#64748b' },
  sourceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sourceChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  sourceText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  sourceTextActive: { color: '#fff', fontWeight: '600' },
  searchButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  searchButtonDisabled: { opacity: 0.7 },
  searchButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12 },

  caseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  newCaseCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  caseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  newBadge: { backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  newBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  caseTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#0f172a', marginRight: 8 },
  difficultyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  difficultyText: { color: '#fff', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  caseSpecialty: { fontSize: 13, color: '#64748b' },
  caseSource: { fontSize: 11, color: '#94a3b8', marginTop: 4 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 16 },
});
