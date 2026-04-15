// Core types for MedSimulation App

export interface Case {
  id: string;
  case_id: string;
  title: string;
  specialty: string;
  difficulty: 'easy' | 'medium' | 'hard';
  presentation: string;
  patient_image_url?: string;
  imaging_studies: ImagingStudy[];
  physical_exam: Record<string, string>;
  investigations: Record<string, string>;
  correct_diagnosis: string;
  correct_management: string[];
  learning_points: string[];
  source?: string;
  source_ref?: string;
  created_at: string;
  updated_at: string;
}

export interface ImagingStudy {
  study_id: string;
  modality: string;
  description: string;
  image_url?: string;
  findings: string;
}

export interface SimulationSession {
  id: string;
  session_id: string;
  case_id: string;
  case_title: string;
  resident_name: string;
  status: 'active' | 'submitted' | 'scored';
  started_at: string;
  completed_at?: string;
  elapsed_seconds: number;
  history: ChatMessage[];
  exams_performed: string[];
  investigations_ordered: InvestigationResult[];
  imaging_viewed: string[];
  submitted_diagnosis?: string;
  submitted_management?: string[];
  score?: SessionScore;
  debrief?: SessionDebrief;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  audio_url?: string;
}

export interface InvestigationResult {
  investigation: string;
  result: string;
  timestamp: string;
}

export interface SessionScore {
  total: number;
  history_score: number;
  exam_score: number;
  investigation_score: number;
  diagnosis_score: number;
  management_score: number;
  time_score: number;
}

export interface SessionDebrief {
  summary: string;
  ai_narrative: string;
  coaching_points: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  total_sessions: number;
  average_score: number;
  created_at: string;
}

export interface DownloadedModel {
  id: string;
  model_id: string;
  name: string;
  size_mb: number;
  downloaded_at: string;
  status: 'downloading' | 'ready' | 'error';
  progress: number;
}
