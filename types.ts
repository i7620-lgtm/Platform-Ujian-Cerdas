
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
}

export interface Exam {
  code: string;
  authorId?: string; // New: Track teacher/author
  questions: Question[];
  config: ExamConfig;
  isSynced?: boolean; 
  createdAt?: string; // Changed to string for readable Date & Time
}

export interface Student {
  fullName: string;
  class: string;
  studentId: string;
}

export type ResultStatus = 'completed' | 'force_submitted' | 'pending_grading';

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
}
