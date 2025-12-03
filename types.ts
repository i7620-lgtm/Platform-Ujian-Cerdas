
export type QuestionType = 'MULTIPLE_CHOICE' | 'COMPLEX_MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MATCHING' | 'ESSAY' | 'FILL_IN_THE_BLANK' | 'INFO';

export interface Question {
  id: string;
  // questionText generally stores the text. For PDF auto-crops, it might store the main image dataURL temporarily, but we are moving towards separating them.
  questionText: string;
  questionType: QuestionType;
  // options stores the text of the options (Used for MC, Complex MC, True/False)
  options?: string[];
  // correctAnswer stores the text value of the correct answer. 
  // For Complex MC: comma separated string "Option A,Option C"
  // For Matching: JSON string or unused (logic uses matchingPairs)
  correctAnswer?: string;
  // imageUrl stores a supplementary image for the question (manual upload)
  imageUrl?: string; 
  // optionImages stores supplementary images for options (parallel to options array)
  optionImages?: (string | null)[];
  
  // Specific for Matching type
  matchingPairs?: {
    left: string;
    right: string; // The correct pair
  }[];

  // Specific for True/False Matrix type
  trueFalseRows?: {
    text: string;
    answer: boolean; // true = Benar, false = Salah
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
  questions: Question[];
  config: ExamConfig;
}

export interface Student {
  fullName: string;
  class: string;
  studentId: string;
}

export interface Result {
    student: Student;
    examCode: string;
    answers: Record<string, string>;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    completionTime?: number; // in seconds
    activityLog?: string[];
    status?: 'completed' | 'force_submitted';
}
