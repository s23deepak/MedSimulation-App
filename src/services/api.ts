/**
 * API Service for Online Features
 * - PubMed import
 * - Wiley import
 * - Cloud sync (optional)
 *
 * Works offline for core simulation features
 */

import axios from 'axios';
import type { Case } from '../types';

const API_BASE_URL = process.env.API_BASE_URL || 'http://10.0.2.2:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface PubMedSearchResult {
  pmid: string;
  title: string;
  abstract?: string;
}

export interface WileySearchResult {
  doi: string;
  title: string;
  abstract?: string;
  url?: string;
}

/**
 * Import cases from PubMed
 */
export async function importFromPubMed(
  specialty: string,
  maxResults: number = 5
): Promise<PubMedSearchResult[]> {
  try {
    const response = await api.post('/api/cases/import/pubmed', {
      specialty,
      max_results: maxResults,
    });
    return response.data.cases || [];
  } catch (error) {
    console.error('PubMed import failed:', error);
    throw error;
  }
}

/**
 * Import cases from Wiley
 */
export async function importFromWiley(
  query: string,
  maxResults: number = 5
): Promise<WileySearchResult[]> {
  try {
    const response = await api.post('/api/cases/import/wiley', {
      query,
      max_results: maxResults,
    });
    return response.data.cases || [];
  } catch (error) {
    console.error('Wiley import failed:', error);
    throw error;
  }
}

/**
 * Generate a case from a topic
 */
export async function generateCase(
  topic: string,
  source: 'auto' | 'pubmed' | 'wiley' | 'endless_medical' = 'auto'
): Promise<Case | null> {
  try {
    const response = await api.post('/api/cases/generate', {
      topic,
      source,
    });
    return response.data;
  } catch (error) {
    console.error('Case generation failed:', error);
    return null;
  }
}

/**
 * Get recommended cases (adaptive learning)
 */
export async function getRecommendedCases(limit: number = 6): Promise<Case[]> {
  try {
    const response = await api.get('/api/cases/recommended', {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to get recommended cases:', error);
    return [];
  }
}

/**
 * Track engagement for adaptive learning
 */
export async function trackEngagement(
  armId: string,
  success: boolean
): Promise<void> {
  try {
    await api.post('/api/cases/track_engagement', {
      arm_id: armId,
      success,
    });
  } catch (error) {
    console.error('Failed to track engagement:', error);
  }
}

/**
 * Export session data
 */
export async function exportSession(
  sessionId: string,
  format: 'json' | 'pdf'
): Promise<Blob | null> {
  try {
    const response = await api.get(
      `/api/simulation/session/${sessionId}/export/${format}`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  } catch (error) {
    console.error('Export failed:', error);
    return null;
  }
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<{
  connected: boolean;
  mode: string;
}> {
  try {
    const response = await api.get('/api/health');
    return {
      connected: true,
      mode: response.data.inference_mode,
    };
  } catch (error) {
    return {
      connected: false,
      mode: 'offline',
    };
  }
}

/**
 * Search PubMed directly (for case browser)
 */
export async function searchPubMed(
  query: string,
  maxResults: number = 10
): Promise<PubMedSearchResult[]> {
  try {
    // Using public PubMed API (no auth required)
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
      query
    )}&retmax=${maxResults}&retmode=json`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const ids = searchData.esearchresult?.idlist || [];

    if (ids.length === 0) return [];

    // Fetch summaries
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(
      ','
    )}&retmode=json`;

    const summaryRes = await fetch(summaryUrl);
    const summaryData = await summaryRes.json();
    const result = summaryData.result || {};

    return ids
      .filter((id: string) => result[id])
      .map((id: string) => ({
        pmid: id,
        title: result[id].title || 'No title',
        abstract: result[id].abstractcontent?.[0]?.text || undefined,
      }));
  } catch (error) {
    console.error('PubMed search failed:', error);
    return [];
  }
}

export default {
  importFromPubMed,
  importFromWiley,
  generateCase,
  getRecommendedCases,
  trackEngagement,
  exportSession,
  checkHealth,
  searchPubMed,
};
