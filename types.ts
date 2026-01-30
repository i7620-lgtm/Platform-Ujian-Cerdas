
export type QuestionType = 'MULTIPLE_CHOICE' | 'COMPLEX_MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MATCHING' | 'ESSAY' | 'FILL_IN_THE_BLANK' | 'INFO';

export interface Question {
  id: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  correctAnswer?: string; 
  imageUrl?: string; 
  optionImages?: (string | null)[];
  
  matchingPairs?: {
    left: string;
    right: string; 
  }[];

  trueFalseRows?: {
    text: string;
    answer: boolean; 
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
  showResultToStudent: boolean;
  showCorrectAnswer: boolean;
  enablePublicStream: boolean;
  trackLocation: boolean;
  subject: string;
  classLevel: string;
  targetClasses?: string[]; 
  examType: string;
  description: string;
}

export interface Exam {
  code: string;
  authorId?: string; 
  authorSchool?: string; 
  questions: Question[];
  config: ExamConfig;
  isSynced?: boolean; 
  createdAt?: string; 
  status?: 'DRAFT' | 'PUBLISHED'; 
}

export interface Student {
  fullName: string;
  class: string;
  absentNumber: string; 
  studentId: string; 
}

export type ResultStatus = 'in_progress' | 'completed' | 'force_closed' | 'pending_grading';

export interface Result {
    student: Student;
    examCode: string;
    answers: Record<string, string>;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    completionTime?: number; 
    activityLog?: string[];
    status?: ResultStatus;
    isSynced?: boolean; 
    timestamp?: number;
    location?: string; 
}

export type AccountType = 'super_admin' | 'admin' | 'guru';

export interface TeacherProfile {
    id: string; 
    fullName: string;
    accountType: AccountType;
    school: string;
    avatarUrl?: string;
}
