
export type QuestionType = 'MULTIPLE_CHOICE' | 'COMPLEX_MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MATCHING' | 'ESSAY' | 'FILL_IN_THE_BLANK' | 'INFO';

export interface QuizConfig {
  count: number;
  type: string;
  subject: string;
  difficulty: string;
  blueprint: string;
  includeImages: boolean;
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie';
  title?: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
  }[];
}

export interface Question {
  id: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  correctAnswer?: string; 
  imageUrl?: string; 
  audioUrl?: string; // URL Audio
  optionImages?: (string | null)[];
  chartData?: ChartData; // NEW: Data untuk diagram (batang, garis, lingkaran)
  
  // Metadata Baru
  category?: string; // e.g., "Teks Prosedur", "Aljabar"
  level?: string;    // e.g., "1", "HOTS", "LOTS"
  scoreWeight?: number; // Bobot Nilai (Default: 1)
  kisiKisi?: string; // NEW: Kisi-kisi materi per soal

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
  examMode: 'PR' | 'UJIAN'; // NEW: Mode PR atau Ujian
  startDate?: string; // NEW: Tanggal mulai (hanya untuk Ujian)
  endDate?: string; // NEW: Tanggal selesai (untuk PR dan Ujian)
  useBankSoal?: boolean; // NEW: Gunakan sistem bank soal
  bankSoalCount?: number; // NEW: Jumlah soal yang ditampilkan dari bank
  bankSoalProportions?: {
    mudah: number; // Persentase soal mudah
    sedang: number; // Persentase soal sedang
    sulit: number; // Persentase soal sulit
  };
  timeLimit: number; // in minutes
  date: string; // (Deprecated, use startDate/endDate)
  startTime: string; // HH:mm (Deprecated, use startDate/endDate)
  endTime?: string; // HH:mm (NEW: End time for the exam)
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
  disableRealtime: boolean; // NEW: Untuk mode skala besar >200 siswa
  trackLocation: boolean;
  isFinished?: boolean; // NEW: Untuk menghentikan ujian secara paksa
  subject: string;
  classLevel: string;
  targetClasses?: string[]; 
  examType: string;
  description: string;
  manualParticipantCount?: number; // Added for manual override in archives
  collaborators?: Collaborator[]; // Moved here for JSONB persistence
  kkm?: number; // Nilai KKM (Kriteria Ketuntasan Minimal)
}

export interface Exam {
  code: string;
  authorId?: string; 
  authorName?: string; // Added to store creator's real name
  authorSchool?: string; 
  questions: Question[];
  config: ExamConfig;
  isSynced?: boolean; 
  createdAt?: string; 
  status?: 'DRAFT' | 'PUBLISHED'; 
}

export interface Collaborator {
    token: string;
    label: string; // e.g. "Pak Budi"
    role: 'editor' | 'viewer';
    createdAt: number;
}

export interface Student {
  fullName: string;
  class: string;
  absentNumber: string; 
  studentId: string; 
  schoolName?: string;
  resultId?: number; // Added to track DB Primary Key
}

export type ResultStatus = 'in_progress' | 'completed' | 'force_closed' | 'pending_grading';

export interface Result {
    id?: number; // Primary Key from DB
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
    location?: { lat: number; lng: number } | string;
}

export type AccountType = 'super_admin' | 'admin_sekolah' | 'guru' | 'collaborator';

export interface TeacherProfile {
    id: string; 
    fullName: string;
    accountType: AccountType;
    school: string;
    regency?: string; // Added for Kabupaten/Kota
    avatarUrl?: string;
    email?: string; // Added for user management display
}

export interface UserProfile extends TeacherProfile {
    email: string;
    createdAt?: string;
}

export interface ExamSummary {
    id: string;
    school_name: string;
    exam_subject: string;
    exam_code: string;
    exam_type?: string; // Added for Analisis Daerah
    exam_date: string;
    total_participants: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    passing_rate: number;
    question_stats: Record<string, unknown>[]; // JSONB Statistical Snapshot
    region?: string;
}
