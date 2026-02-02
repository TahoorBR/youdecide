import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Sparkles, Coffee, Zap, RefreshCw, Plus, X, ArrowRight, 
  AlertCircle, Utensils, BookOpen, Briefcase, Film, Dumbbell, 
  ShoppingBag, MapPin, Clock, Heart, ChevronRight, Mic, MicOff
} from 'lucide-react';
import { ENERGY_LEVELS, MOOD_OPTIONS } from './decisionEngine';
import { makeAIDecision, autoInitialize, isGeminiInitialized, hasEnvApiKey } from './geminiService';
import { useSpeechToText, isSpeechSupported } from './useSpeechToText';

// Decision templates for quick start
const TEMPLATES = [
  {
    id: 'food',
    icon: Utensils,
    label: 'What to eat',
    options: ['Pizza', 'Sushi', 'Burger', 'Salad', 'Pasta'],
    placeholder: 'Add more food options...',
  },
  {
    id: 'activity',
    icon: Film,
    label: 'What to do',
    options: ['Watch a movie', 'Read a book', 'Go for a walk', 'Play games'],
    placeholder: 'Add more activities...',
  },
  {
    id: 'work',
    icon: Briefcase,
    label: 'Work tasks',
    options: ['Emails', 'Project work', 'Meetings', 'Learning'],
    placeholder: 'Add your tasks...',
  },
  {
    id: 'exercise',
    icon: Dumbbell,
    label: 'Workout',
    options: ['Running', 'Gym', 'Yoga', 'Swimming', 'Rest day'],
    placeholder: 'Add workout options...',
  },
  {
    id: 'shopping',
    icon: ShoppingBag,
    label: 'What to buy',
    options: [],
    placeholder: 'Add items to choose from...',
  },
  {
    id: 'custom',
    icon: Sparkles,
    label: 'Custom',
    options: [],
    placeholder: 'Add your options...',
  },
];

// Subtle background gradient
function BackgroundGradient() {
  return (
    <div className="fixed inset-0 pointer-events-none">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
    </div>
  );
}

// Template card component
function TemplateCard({ template, isSelected, onClick }) {
  const Icon = template.icon;
  
  return (
    <motion.button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 min-w-[100px] ${
        isSelected
          ? 'bg-white/10 border-violet-500/50 text-white'
          : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.04] hover:border-white/10 hover:text-zinc-300'
      }`}
      whileTap={{ scale: 0.98 }}
    >
      <Icon size={22} className={isSelected ? 'text-violet-400' : ''} />
      <span className="text-xs font-medium">{template.label}</span>
    </motion.button>
  );
}

// Energy/Mood selector - grid layout with visible scroll
function StateSelector({ options, value, onChange, label }) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</label>
      <div className="flex flex-wrap gap-2 sm:grid sm:grid-cols-3 md:grid-cols-5">
        {options.map((option) => (
          <motion.button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              value === option.value
                ? 'bg-white/10 text-white border border-white/10'
                : 'bg-white/[0.02] text-zinc-500 border border-transparent hover:bg-white/[0.04] hover:text-zinc-300'
            }`}
            whileTap={{ scale: 0.97 }}
          >
            {option.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// Option chip - cleaner design
function OptionChip({ option, onRemove, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15, delay: index * 0.03 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-zinc-300 text-sm"
    >
      <span>{option}</span>
      <button
        onClick={() => onRemove(option)}
        className="p-0.5 rounded hover:bg-white/10 transition-colors text-zinc-500 hover:text-zinc-300"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}

// Main decision form with templates
function DecisionForm({ onDecide, isLoading, onVoiceError }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [optionsList, setOptionsList] = useState([]);
  const [constraints, setConstraints] = useState('');
  const [energy, setEnergy] = useState('neutral');
  const [mood, setMood] = useState('neutral');
  const [currentOption, setCurrentOption] = useState('');

  // Voice input handler
  const handleVoiceResult = useCallback((transcript) => {
    // Parse comma-separated or "and" separated options
    const options = transcript
      .split(/,|and|or/i)
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);
    
    if (options.length > 0) {
      setOptionsList(prev => {
        const newOptions = options.filter(opt => !prev.includes(opt));
        return [...prev, ...newOptions];
      });
    }
  }, []);

  const { isListening, isSupported: voiceSupported, toggleListening } = useSpeechToText(
    handleVoiceResult,
    onVoiceError
  );

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setOptionsList(template.options);
  };

  const addOption = useCallback(() => {
    if (currentOption.trim() && !optionsList.includes(currentOption.trim())) {
      setOptionsList([...optionsList, currentOption.trim()]);
      setCurrentOption('');
    }
  }, [currentOption, optionsList]);

  const removeOption = useCallback((optionToRemove) => {
    setOptionsList(optionsList.filter(o => o !== optionToRemove));
  }, [optionsList]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOption();
    }
  };

  const handleSubmit = () => {
    if (optionsList.length === 0) return;
    onDecide(optionsList.join(', '), constraints, energy, mood);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl mx-auto space-y-6"
    >
      {/* Template selector */}
      {!selectedTemplate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <p className="text-center text-zinc-500 text-sm">Choose a category or start from scratch</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {TEMPLATES.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={false}
                onClick={() => handleTemplateSelect(template)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Main form */}
      {selectedTemplate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 sm:p-6 space-y-5"
        >
          {/* Header with back button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedTemplate(null);
                setOptionsList([]);
              }}
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
            >
              <ArrowRight size={14} className="rotate-180" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2 text-zinc-400">
              {(() => {
                const Icon = selectedTemplate.icon;
                return <Icon size={16} />;
              })()}
              <span className="text-sm font-medium">{selectedTemplate.label}</span>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Your options
            </label>
            
            <AnimatePresence>
              {optionsList.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-2"
                >
                  {optionsList.map((option, index) => (
                    <OptionChip 
                      key={option} 
                      option={option} 
                      onRemove={removeOption}
                      index={index}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2 w-full">
              <input
                type="text"
                value={currentOption}
                onChange={(e) => setCurrentOption(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? "Listening..." : selectedTemplate.placeholder}
                className={`flex-1 min-w-0 bg-white/[0.03] border rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/10 focus:bg-white/[0.05] transition-all text-sm ${
                  isListening ? 'border-violet-500/50 bg-violet-500/5' : 'border-white/5'
                }`}
              />
              {/* Voice input button */}
              {voiceSupported && (
                <motion.button
                  onClick={toggleListening}
                  className={`flex-shrink-0 px-4 py-3 rounded-xl transition-all ${
                    isListening 
                      ? 'bg-violet-500/20 border border-violet-500/30 text-violet-400' 
                      : 'bg-white/5 border border-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                  whileTap={{ scale: 0.95 }}
                  animate={isListening ? { scale: [1, 1.05, 1] } : {}}
                  transition={isListening ? { repeat: Infinity, duration: 1 } : {}}
                  title={isListening ? "Stop listening" : "Add options by voice"}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </motion.button>
              )}
              <motion.button
                onClick={addOption}
                disabled={!currentOption.trim()}
                className="flex-shrink-0 px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                whileTap={{ scale: 0.95 }}
              >
                <Plus size={18} />
              </motion.button>
            </div>
            
            {/* Voice hint */}
            {voiceSupported && (
              <p className="text-xs text-zinc-600">
                💡 Tip: Say multiple options like "pizza, sushi, and burger"
              </p>
            )}
          </div>

          {/* Constraints */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              Constraints
              <span className="text-zinc-600 normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="e.g., quick, healthy, budget-friendly..."
              className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/10 focus:bg-white/[0.05] transition-all text-sm"
            />
          </div>

          {/* Energy level */}
          <StateSelector
            options={ENERGY_LEVELS}
            value={energy}
            onChange={setEnergy}
            label="Energy"
          />

          {/* Mood */}
          <StateSelector
            options={MOOD_OPTIONS}
            value={mood}
            onChange={setMood}
            label="Mood"
          />

          {/* Submit button */}
          <motion.button
            onClick={handleSubmit}
            disabled={optionsList.length === 0 || isLoading}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl text-white font-medium shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw size={18} />
                </motion.div>
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <Brain size={18} />
                <span>Decide for me</span>
              </>
            )}
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}

// Decision result display - cleaner
function DecisionResult({ result, onReset }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="glass-strong rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Success indicator */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="flex justify-center"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center">
            <Sparkles size={28} className="text-violet-400" />
          </div>
        </motion.div>

        {/* Decision */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="text-zinc-500 text-sm mb-2">You should go with</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white">
            {result.decision}
          </h2>
        </motion.div>

        {/* Confidence */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-3"
        >
          <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${result.confidence}%` }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
            />
          </div>
          <span className="text-xs text-zinc-500">{result.confidence}% confident</span>
        </motion.div>

        {/* Reasoning */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/[0.02] rounded-xl p-4 border border-white/5"
        >
          <p className="text-zinc-400 text-sm leading-relaxed">{result.reasoning}</p>
        </motion.div>

        {/* Action button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          onClick={onReset}
          className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-zinc-300 font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          whileTap={{ scale: 0.98 }}
        >
          <RefreshCw size={16} />
          Make another decision
        </motion.button>

        {/* Support CTA - prominent after value delivery */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-amber-500/5 rounded-xl p-4 border border-amber-500/10"
        >
          <p className="text-zinc-400 text-sm text-center mb-3">
            Did this help? Support keeps the project alive ✨
          </p>
          <motion.a
            href="https://buymeacoffee.com/arcsirius"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl text-amber-300 font-medium hover:from-amber-500/30 hover:to-orange-500/30 transition-all flex items-center justify-center gap-2"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <Coffee size={18} />
            <span>Buy me a coffee</span>
            <Heart size={14} className="text-amber-400/60" />
          </motion.a>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Main App component
export default function App() {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Auto-initialize Gemini on mount
  useEffect(() => {
    const initialized = autoInitialize();
    setIsInitialized(initialized);
    
    if (!initialized && !hasEnvApiKey()) {
      setError('Please add VITE_GEMINI_API_KEY to your .env.local file');
    }
  }, []);

  const handleDecide = useCallback(async (options, constraints, energy, mood) => {
    if (!isGeminiInitialized()) {
      setError('AI not initialized. Please check your API key.');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const decision = await makeAIDecision(options, constraints, energy, mood);
      setResult(decision);
    } catch (err) {
      console.error('Decision error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen relative">
      <BackgroundGradient />

      <div className="relative z-10 container mx-auto px-4 py-8 sm:py-16 md:py-20 min-h-screen flex flex-col">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <motion.div
            className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 rounded-2xl mb-4 sm:mb-6"
            animate={{ rotate: [0, 3, -3, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Brain size={28} className="text-violet-400 sm:hidden" />
            <Brain size={32} className="text-violet-400 hidden sm:block" />
          </motion.div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-3">
            Stop Thinking.{' '}
            <span className="gradient-text">Start Doing.</span>
          </h1>
          
          <p className="text-zinc-500 text-sm sm:text-base max-w-md mx-auto">
            Overthinking? Brain tired? Press decide. Decision fatigue ends here.
          </p>
        </motion.header>

        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-xl mx-auto mb-6"
            >
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <AlertCircle size={18} className="flex-shrink-0" />
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto p-1 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {result ? (
              <DecisionResult
                key="result"
                result={result}
                onReset={handleReset}
              />
            ) : (
              <DecisionForm
                key="form"
                onDecide={handleDecide}
                isLoading={isLoading}
                onVoiceError={(msg) => setError(msg)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12 sm:mt-16 space-y-2"
        >
          <p className="text-zinc-500 text-sm">
            Made with <Heart size={12} className="inline text-rose-400/60 mx-0.5" /> by{' '}
            <a
              href="https://buymeacoffee.com/arcsirius"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-violet-400 transition-colors font-medium"
            >
              arcsirius
            </a>
          </p>
          <a
            href="https://buymeacoffee.com/arcsirius"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-amber-400 text-xs transition-colors group"
          >
            <Coffee size={12} className="group-hover:text-amber-400" />
            <span>Support this project</span>
          </a>
        </motion.footer>
      </div>
    </div>
  );
}
