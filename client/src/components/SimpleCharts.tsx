import React from 'react';
import { TopScore, QuestionStats } from '../services/api';

interface SimpleChartsProps {
  topScores?: TopScore[];
  questionStats?: QuestionStats[];
}

const SimpleBar: React.FC<{ label: string; value: number; maxValue: number; color: string }> = ({
  label, value, maxValue, color
}) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300 truncate">{label}</span>
        <span className="text-white font-medium">{value}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  );
};

const DonutChart: React.FC<{ correct: number; incorrect: number }> = ({ correct, incorrect }) => {
  const total = correct + incorrect;
  const correctPercentage = total > 0 ? (correct / total) * 100 : 0;
  const incorrectPercentage = total > 0 ? (incorrect / total) * 100 : 0;

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
        <circle
          cx="18" cy="18" r="16"
          fill="transparent"
          stroke="#374151"
          strokeWidth="3"
        />
        <circle
          cx="18" cy="18" r="16"
          fill="transparent"
          stroke="#10b981"
          strokeWidth="3"
          strokeDasharray={`${correctPercentage} ${100 - correctPercentage}`}
          strokeDashoffset="0"
        />
        <circle
          cx="18" cy="18" r="16"
          fill="transparent"
          stroke="#ef4444"
          strokeWidth="3"
          strokeDasharray={`${incorrectPercentage} ${100 - incorrectPercentage}`}
          strokeDashoffset={`${-correctPercentage}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold text-white">{correctPercentage.toFixed(1)}%</div>
          <div className="text-xs text-gray-400">Acerto</div>
        </div>
      </div>
    </div>
  );
};

const SimpleCharts: React.FC<SimpleChartsProps> = ({ topScores = [], questionStats = [] }) => {
  const maxHoney = Math.max(...topScores.map(s => s.total_earned), 1);
  const maxAsked = Math.max(...questionStats.map(q => q.times_asked), 1);

  return (
    <div className="space-y-6">
      {/* Top Scores Chart */}
      {topScores.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-white mb-4">📊 Top Scores (Honey Ganho)</h3>
          <div className="space-y-2">
            {topScores.slice(0, 8).map((score, index) => (
              <SimpleBar
                key={`${score.name}-${score.session_date}`}
                label={`${index + 1}° ${score.name}`}
                value={score.total_earned}
                maxValue={maxHoney}
                color={
                  index === 0 ? '#ffd700' :
                  index === 1 ? '#c0c0c0' :
                  index === 2 ? '#cd7f32' :
                  '#60a5fa'
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Question Difficulty Chart */}
      {questionStats.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-white mb-4">❓ Perguntas Mais Difíceis</h3>
          <div className="space-y-2">
            {questionStats
              .filter(q => q.times_asked >= 3)
              .sort((a, b) => a.accuracy_rate - b.accuracy_rate)
              .slice(0, 8)
              .map((stat) => (
                <SimpleBar
                  key={stat.question_id}
                  label={`Nível ${stat.level}: ${stat.question_text.substring(0, 40)}...`}
                  value={stat.accuracy_rate}
                  maxValue={100}
                  color={
                    stat.accuracy_rate > 70 ? '#10b981' :
                    stat.accuracy_rate > 40 ? '#f59e0b' :
                    '#ef4444'
                  }
                />
              ))}
          </div>
        </div>
      )}

      {/* Most Asked Questions */}
      {questionStats.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-white mb-4">🔥 Perguntas Mais Feitas</h3>
          <div className="space-y-2">
            {questionStats
              .sort((a, b) => b.times_asked - a.times_asked)
              .slice(0, 8)
              .map((stat) => (
                <SimpleBar
                  key={stat.question_id}
                  label={`Nível ${stat.level}: ${stat.question_text.substring(0, 40)}...`}
                  value={stat.times_asked}
                  maxValue={maxAsked}
                  color="#8b5cf6"
                />
              ))}
          </div>
        </div>
      )}

      {/* Accuracy Overview */}
      {questionStats.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-white mb-4">🎯 Visão Geral de Acertos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <DonutChart
                correct={questionStats.reduce((sum, q) => sum + q.correct_count, 0)}
                incorrect={questionStats.reduce((sum, q) => sum + (q.times_asked - q.correct_count), 0)}
              />
              <div className="mt-2 text-sm text-gray-300">
                Taxa de Acerto Geral
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
                <span className="text-green-400">✅ Corretas:</span>
                <span className="font-bold text-white">
                  {questionStats.reduce((sum, q) => sum + q.correct_count, 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
                <span className="text-red-400">❌ Incorretas:</span>
                <span className="font-bold text-white">
                  {questionStats.reduce((sum, q) => sum + (q.times_asked - q.correct_count), 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
                <span className="text-blue-400">📝 Total:</span>
                <span className="font-bold text-white">
                  {questionStats.reduce((sum, q) => sum + q.times_asked, 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
                <span className="text-purple-400">❓ Perguntas Únicas:</span>
                <span className="font-bold text-white">{questionStats.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Level Distribution */}
      {questionStats.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-white mb-4">📊 Distribuição por Nível</h3>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
              const levelStats = questionStats.filter(q => q.level === level);
              const totalAsked = levelStats.reduce((sum, q) => sum + q.times_asked, 0);
              const avgAccuracy = levelStats.length > 0
                ? levelStats.reduce((sum, q) => sum + q.accuracy_rate, 0) / levelStats.length
                : 0;

              return (
                <div key={level} className="text-center p-2 bg-gray-700 rounded">
                  <div className="text-lg font-bold text-white">{level}</div>
                  <div className="text-xs text-gray-400">{totalAsked} vezes</div>
                  <div className={`text-xs font-medium ${
                    avgAccuracy > 70 ? 'text-green-400' :
                    avgAccuracy > 40 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {avgAccuracy.toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleCharts;