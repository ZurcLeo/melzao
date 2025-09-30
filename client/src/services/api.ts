const API_BASE_URL = process.env.REACT_APP_SERVER_URL || 'https://melzao-backend.onrender.com';

export interface GameSession {
  id: number;
  session_id: string;
  started_at: string;
  ended_at?: string;
  status: 'active' | 'finished';
  total_participants: number;
}

export interface Participant {
  id: number;
  participant_id: string;
  session_id: string;
  name: string;
  joined_at: string;
  final_status?: 'winner' | 'eliminated' | 'quit';
  final_level: number;
  total_earned: number;
}

export interface Answer {
  id: number;
  participant_id: string;
  question_id: string;
  question_text: string;
  level: number;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  honey_earned: number;
  answered_at: string;
}

export interface GameStats {
  totalSessions: number;
  totalParticipants: number;
  totalAnswers: number;
  correctAnswers: number;
  accuracyRate: string;
  totalWinners: number;
  averageHoneyEarned: number;
}

export interface TopScore {
  name: string;
  total_earned: number;
  final_level: number;
  final_status: string;
  session_date: string;
}

export interface SessionReport {
  session: GameSession;
  participants: Array<Participant & { answers: Answer[] }>;
}

export interface QuestionStats {
  question_id: string;
  question_text: string;
  level: number;
  times_asked: number;
  correct_count: number;
  accuracy_rate: number;
}

class ApiService {
  private onTokenExpired?: () => void;

  setTokenExpiredCallback(callback: () => void) {
    this.onTokenExpired = callback;
  }

  private async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle token expiration
        if (errorData.code === 'TOKEN_EXPIRED' || errorData.code === 'INVALID_TOKEN') {
          console.warn('🔐 Token expirado ou inválido, limpando sessão');
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          if (this.onTokenExpired) {
            this.onTokenExpired();
          }
        }

        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      throw error;
    }
  }

  async getGameStats(): Promise<GameStats> {
    return this.fetchApi<GameStats>('/api/stats');
  }

  async getTopScores(): Promise<TopScore[]> {
    return this.fetchApi<TopScore[]>('/api/leaderboard');
  }

  async getGameSessions(limit = 50): Promise<GameSession[]> {
    return this.fetchApi<GameSession[]>(`/api/sessions?limit=${limit}`);
  }

  async getSessionReport(sessionId: string): Promise<SessionReport> {
    return this.fetchApi<SessionReport>(`/api/sessions/${sessionId}`);
  }

  async getQuestionStats(): Promise<QuestionStats[]> {
    return this.fetchApi<QuestionStats[]>('/api/questions/stats');
  }

  async getServerHealth(): Promise<{ status: string; timestamp: string; service: string }> {
    return this.fetchApi('/health');
  }
}

export const apiService = new ApiService();