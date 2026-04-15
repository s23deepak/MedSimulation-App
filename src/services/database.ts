/**
 * WatermelonDB Database Setup
 * Offline-first storage for cases, sessions, and user data
 */

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Case as CaseModel } from '../store/models/Case';
import { Session as SessionModel } from '../store/models/Session';
import { UserProfile as UserProfileModel } from '../store/models/UserProfile';

const adapter = new SQLiteAdapter({
  schema: {
    version: 1,
    tables: [
      {
        name: 'cases',
        columns: [
          { name: 'case_id', type: 'string', isIndexed: true },
          { name: 'title', type: 'string' },
          { name: 'specialty', type: 'string', isIndexed: true },
          { name: 'difficulty', type: 'string' },
          { name: 'presentation', type: 'string' },
          { name: 'patient_image_url', type: 'string', isOptional: true },
          { name: 'imaging_studies', type: 'string' }, // JSON string
          { name: 'physical_exam', type: 'string' }, // JSON string
          { name: 'investigations', type: 'string' }, // JSON string
          { name: 'correct_diagnosis', type: 'string' },
          { name: 'correct_management', type: 'string' }, // JSON array
          { name: 'learning_points', type: 'string' }, // JSON array
          { name: 'source', type: 'string', isOptional: true },
          { name: 'source_ref', type: 'string', isOptional: true },
          { name: 'created_at', type: 'number' },
          { name: 'updated_at', type: 'number' },
        ],
      },
      {
        name: 'sessions',
        columns: [
          { name: 'session_id', type: 'string', isIndexed: true },
          { name: 'case_id', type: 'string', isIndexed: true },
          { name: 'case_title', type: 'string' },
          { name: 'resident_name', type: 'string' },
          { name: 'status', type: 'string', isIndexed: true },
          { name: 'started_at', type: 'number' },
          { name: 'completed_at', type: 'number', isOptional: true },
          { name: 'elapsed_seconds', type: 'number' },
          { name: 'history', type: 'string' }, // JSON string
          { name: 'exams_performed', type: 'string' }, // JSON array
          { name: 'investigations_ordered', type: 'string' }, // JSON array
          { name: 'imaging_viewed', type: 'string' }, // JSON array
          { name: 'submitted_diagnosis', type: 'string', isOptional: true },
          { name: 'submitted_management', type: 'string', isOptional: true },
          { name: 'score', type: 'string', isOptional: true }, // JSON object
          { name: 'debrief', type: 'string', isOptional: true }, // JSON object
        ],
      },
      {
        name: 'user_profiles',
        columns: [
          { name: 'name', type: 'string' },
          { name: 'email', type: 'string', isOptional: true },
          { name: 'total_sessions', type: 'number' },
          { name: 'average_score', type: 'number' },
          { name: 'created_at', type: 'number' },
        ],
      },
    ],
  },
});

export const database = new Database({
  adapter,
  modelClasses: [CaseModel, SessionModel, UserProfileModel],
});

export default database;
