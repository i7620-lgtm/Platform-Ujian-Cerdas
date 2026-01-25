
export type QuestionType = 'MULTIPLE_CHOICE' | 'COMPLEX_MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MATCHING' | 'ESSAY' | 'FILL_IN_THE_BLANK' | 'INFO';

export interface Question {
  id: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  correctAnswer?: string; // This will be removed in PublicQuestion for students
  imageUrl?: string; 
  optionImages?: (string | null)[];
  
  matchingPairs?: {
    left: string;
    right: string; // This will be removed in PublicQuestion for students
  }[];

  trueFalseRows?: {
    text: string;
    answer: boolean; // This will be removed in PublicQuestion for students
  }[];
}

export interface ExamConfig {
  timeLimit: number; // in minutes
  date: string;
  startTime: string; // HH:mm
  allowRetakes: boolean;
  detectBehavior: boolean;
  autoSubmitInactive: boolean;
  autoSaveInterval: number; // in seconds
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  continueWithPermission: boolean;
  // New Configurations
  showResultToStudent: boolean;
  showCorrectAnswer: boolean;
  enablePublicStream: boolean;
  trackLocation: boolean;
  // Metadata
  subject: string;
  classLevel: string;
  examType: string;
  description: string;
}

export interface Exam {
  code: string;
  authorId?: string; // Track teacher/author
  authorSchool?: string; // New: Track school context
  questions: Question[];
  config: ExamConfig;
  isSynced?: boolean; 
  createdAt?: string; // Changed to string for readable Date & Time
  status?: 'DRAFT' | 'PUBLISHED'; // New: Support Drafts
}

export interface Student {
  fullName: string;
  class: string;
  absentNumber: string; // New: Nomor Absen/Urut
  studentId: string; // Now Composite: Name-Class-AbsentNumber
}

// Added 'in_progress' explicitly to support live monitoring
export type ResultStatus = 'in_progress' | 'completed' | 'force_submitted' | 'pending_grading';

export interface Result {
    student: Student;
    examCode: string;
    answers: Record<string, string>;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    completionTime?: number; // in seconds
    activityLog?: string[];
    status?: ResultStatus;
    isSynced?: boolean; 
    timestamp?: number;
    location?: string; // GPS Coordinates
}

// --- NEW TYPES FOR USER MANAGEMENT ---
export type AccountType = 'super_admin' | 'admin' | 'normal';

export interface TeacherProfile {
    id: string; // username
    fullName: string;
    accountType: AccountType;
    school: string;
    avatarUrl?: string;
}
