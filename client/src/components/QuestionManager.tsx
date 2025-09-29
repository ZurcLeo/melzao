import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Modal, ModalBody } from './ui/Modal';
import { toast } from 'react-toastify';

interface Question {
  id: number;
  question_id: string;
  category: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  level: number;
  honey_value: number;
  explanation?: string;
  usage_count: number;
  created_at: string;
  createdBy?: {
    name: string;
    email: string;
  };
}

interface QuestionManagerProps {
  authToken: string;
}

const QuestionManager: React.FC<QuestionManagerProps> = ({ authToken }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    category: '',
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    level: 1,
    honeyValue: 10,
    explanation: ''
  });

  const API_BASE = process.env.REACT_APP_SERVER_URL || 'https://melzao-backend.onrender.com';

  const makeRequest = async (url: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro na requisição' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro de conexão');
    }
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await makeRequest('/api/questions/my?limit=200');
      setQuestions(data.questions || []);
    } catch (error) {
      toast.error(`Erro ao carregar questões: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      category: '',
      questionText: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      level: 1,
      honeyValue: 10,
      explanation: ''
    });
    setEditingQuestion(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (question: Question) => {
    setFormData({
      category: question.category,
      questionText: question.question_text,
      options: question.options,
      correctAnswer: question.correct_answer, // Já deve ser A, B, C ou D
      level: question.level,
      honeyValue: question.honey_value,
      explanation: question.explanation || ''
    });
    setEditingQuestion(question);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const questionData = {
        category: formData.category,
        questionText: formData.questionText,
        options: formData.options,
        correctAnswer: formData.correctAnswer,
        level: formData.level,
        honeyValue: formData.honeyValue,
        explanation: formData.explanation
      };

      if (editingQuestion) {
        await makeRequest(`/api/questions/${editingQuestion.id}`, {
          method: 'PUT',
          body: JSON.stringify(questionData)
        });
        toast.success('Questão atualizada com sucesso!');
      } else {
        await makeRequest('/api/questions', {
          method: 'POST',
          body: JSON.stringify(questionData)
        });
        toast.success('Questão criada com sucesso!');
      }

      setShowCreateModal(false);
      resetForm();
      loadQuestions();
    } catch (error) {
      toast.error(`Erro ao salvar questão: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteQuestion = async (questionId: number) => {
    if (!window.confirm('Tem certeza que deseja excluir esta questão?')) {
      return;
    }

    try {
      setLoading(true);
      await makeRequest(`/api/questions/${questionId}`, { method: 'DELETE' });
      toast.success('Questão excluída com sucesso!');
      loadQuestions();
    } catch (error) {
      toast.error(`Erro ao excluir questão: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         question.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === '' || question.level.toString() === filterLevel;
    const matchesCategory = filterCategory === '' || question.category === filterCategory;

    return matchesSearch && matchesLevel && matchesCategory;
  });

  const categories = Array.from(new Set(questions.map(q => q.category))).filter(Boolean);

  useEffect(() => {
    loadQuestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">📝 Gerenciar Questões</h2>
          <p className="text-gray-300">Crie e edite questões personalizadas para seus jogos</p>
        </div>
        <Button onClick={openCreateModal} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Questão
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar questões..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os níveis</option>
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={i + 1}>Nível {i + 1}</option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as categorias</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-gray-300">Carregando questões...</p>
            </CardContent>
          </Card>
        ) : filteredQuestions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-300 text-lg">
                {questions.length === 0 ? 'Nenhuma questão criada ainda.' : 'Nenhuma questão encontrada com os filtros aplicados.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredQuestions.map((question) => (
            <Card key={question.id}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-semibold">
                        Nível {question.level}
                      </span>
                      <span className="bg-purple-600 text-white px-2 py-1 rounded text-sm">
                        {question.category}
                      </span>
                      <span className="bg-yellow-600 text-white px-2 py-1 rounded text-sm">
                        {question.honey_value} 🍯
                      </span>
                      <span className={`px-2 py-1 rounded text-sm ${
                        question.question_id.startsWith('default_')
                          ? 'bg-green-600 text-white'
                          : 'bg-orange-600 text-white'
                      }`}>
                        {question.question_id.startsWith('default_') ? '🔒 Padrão' : '✏️ Personalizada'}
                      </span>
                      <span className="text-gray-400 text-sm">
                        Usado {question.usage_count}x
                      </span>
                      {question.createdBy && (
                        <span className="bg-gray-600 text-white px-2 py-1 rounded text-sm">
                          👤 {question.createdBy.name}
                        </span>
                      )}
                    </div>

                    <h3 className="text-white font-semibold mb-2">{question.question_text}</h3>

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {question.options.map((option, index) => {
                        const optionLetter = String.fromCharCode(65 + index);
                        const isCorrect = optionLetter === question.correct_answer;
                        return (
                          <div
                            key={index}
                            className={`p-2 rounded text-sm ${
                              isCorrect
                                ? 'bg-green-700 text-white'
                                : 'bg-gray-700 text-gray-300'
                            }`}
                          >
                            {optionLetter}) {option}
                          </div>
                        );
                      })}
                    </div>

                    {question.explanation && (
                      <p className="text-gray-400 text-sm italic">
                        Explicação: {question.explanation}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => openEditModal(question)}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-2"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => deleteQuestion(question.id)}
                      className="bg-red-600 hover:bg-red-700 px-3 py-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <ModalBody>
          <h3 className="text-xl font-bold text-white mb-4">
            {editingQuestion ? 'Editar Questão' : 'Nova Questão'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Categoria
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ex: Geografia, História..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Nível (1-10)
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>Nível {i + 1}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Pergunta
              </label>
              <textarea
                value={formData.questionText}
                onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                placeholder="Digite a pergunta..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Opções de Resposta
              </label>
              <div className="grid grid-cols-2 gap-2">
                {formData.options.map((option, index) => (
                  <input
                    key={index}
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...formData.options];
                      newOptions[index] = e.target.value;
                      setFormData({ ...formData, options: newOptions });
                    }}
                    placeholder={`Opção ${String.fromCharCode(65 + index)}`}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Resposta Correta
                </label>
                <select
                  value={formData.correctAnswer}
                  onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione...</option>
                  {formData.options.map((option, index) => (
                    option && (
                      <option key={index} value={String.fromCharCode(65 + index)}>
                        {String.fromCharCode(65 + index)} - {option}
                      </option>
                    )
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Valor em Honey
                </label>
                <input
                  type="number"
                  value={formData.honeyValue}
                  onChange={(e) => setFormData({ ...formData, honeyValue: parseInt(e.target.value) })}
                  min="1"
                  max="50000"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Explicação (opcional)
              </label>
              <textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                placeholder="Explicação da resposta..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 flex-1"
              >
                {loading ? 'Salvando...' : editingQuestion ? 'Atualizar' : 'Criar'}
              </Button>
              <Button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="bg-gray-600 hover:bg-gray-700 px-6"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </ModalBody>
      </Modal>
    </div>
  );
};

export default QuestionManager;