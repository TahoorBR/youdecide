// Decision Engine - Rule-based logic for making recommendations
// This provides fast, intelligent decisions based on user inputs

const DECISION_WEIGHTS = {
  energy: {
    exhausted: { complexity: -2, effort: -2, social: -1 },
    tired: { complexity: -1, effort: -1, social: 0 },
    neutral: { complexity: 0, effort: 0, social: 0 },
    good: { complexity: 1, effort: 1, social: 1 },
    energized: { complexity: 2, effort: 2, social: 2 },
  },
  mood: {
    stressed: { risk: -2, novelty: -1, relaxation: 2 },
    anxious: { risk: -2, novelty: -1, comfort: 2 },
    neutral: { risk: 0, novelty: 0, comfort: 0 },
    happy: { risk: 1, novelty: 1, adventure: 1 },
    excited: { risk: 2, novelty: 2, adventure: 2 },
  },
  timeOfDay: {
    morning: { productivity: 2, creativity: 1 },
    afternoon: { productivity: 1, social: 1 },
    evening: { relaxation: 2, social: 1 },
    night: { relaxation: 2, creativity: 1, productivity: -1 },
  },
};

const REASONING_TEMPLATES = {
  energy_low: [
    "Your energy is low right now, so we're picking something that won't drain you further.",
    "Since you're running on fumes, let's go easy on you.",
    "Low battery mode detected – choosing the path of least resistance.",
  ],
  energy_high: [
    "You've got the energy – let's make the most of it!",
    "High energy detected – perfect time for this choice.",
    "You're charged up, so we're matching that vibe.",
  ],
  mood_stressed: [
    "Stress levels are up, so we're prioritizing your peace of mind.",
    "When stressed, simpler is better. Here's your answer.",
    "Less mental load, more relief – that's what you need right now.",
  ],
  mood_happy: [
    "Good mood = good time to try something you've been putting off.",
    "Riding that positive wave with this choice.",
    "Happy vibes make this decision a no-brainer.",
  ],
  quick_decision: [
    "Sometimes the first instinct is the right one. Trust it.",
    "Analysis paralysis is real – here's your escape route.",
    "Decision made. Relief incoming.",
  ],
  balanced: [
    "After weighing everything, this stands out as your best bet.",
    "All factors considered, this is the move.",
    "The math is done. Here's your winner.",
  ],
};

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function scoreOption(option, constraints, energy, mood, timeOfDay) {
  let score = 50; // Base score
  const optionLower = option.toLowerCase();
  const constraintsLower = constraints.toLowerCase();

  // Apply energy weights
  const energyWeight = DECISION_WEIGHTS.energy[energy] || DECISION_WEIGHTS.energy.neutral;
  
  // Check for keywords that interact with energy
  if (optionLower.includes('easy') || optionLower.includes('simple') || optionLower.includes('rest')) {
    score += energyWeight.effort < 0 ? 15 : -5;
  }
  if (optionLower.includes('hard') || optionLower.includes('complex') || optionLower.includes('intense')) {
    score += energyWeight.effort > 0 ? 15 : -10;
  }

  // Apply mood weights
  const moodWeight = DECISION_WEIGHTS.mood[mood] || DECISION_WEIGHTS.mood.neutral;
  
  if (optionLower.includes('relax') || optionLower.includes('calm') || optionLower.includes('chill')) {
    score += moodWeight.relaxation ? moodWeight.relaxation * 5 : 0;
  }
  if (optionLower.includes('adventure') || optionLower.includes('new') || optionLower.includes('try')) {
    score += moodWeight.novelty ? moodWeight.novelty * 5 : 0;
  }

  // Check constraints
  const constraintsList = constraintsLower.split(/[,;]/).map(c => c.trim()).filter(Boolean);
  
  for (const constraint of constraintsList) {
    // Negative constraints (things to avoid)
    if (constraint.startsWith('no ') || constraint.startsWith('not ') || constraint.startsWith('avoid ')) {
      const avoidTerm = constraint.replace(/^(no |not |avoid )/, '');
      if (optionLower.includes(avoidTerm)) {
        score -= 30; // Heavy penalty for violating constraints
      }
    }
    // Positive constraints (requirements)
    else if (constraint.startsWith('must ') || constraint.startsWith('need ')) {
      const requireTerm = constraint.replace(/^(must |need )/, '');
      if (optionLower.includes(requireTerm)) {
        score += 20;
      } else {
        score -= 15;
      }
    }
    // Preference keywords
    else {
      if (optionLower.includes(constraint)) {
        score += 10;
      }
    }
  }

  // Add some controlled randomness for variety (±5 points)
  score += Math.random() * 10 - 5;

  // Time of day considerations
  const timeWeight = DECISION_WEIGHTS.timeOfDay[timeOfDay] || {};
  if (optionLower.includes('work') || optionLower.includes('study') || optionLower.includes('productive')) {
    score += (timeWeight.productivity || 0) * 5;
  }
  if (optionLower.includes('social') || optionLower.includes('friends') || optionLower.includes('people')) {
    score += (timeWeight.social || 0) * 5;
  }

  return Math.max(0, Math.min(100, score));
}

function generateReasoning(winningOption, energy, mood, allScores) {
  const reasons = [];

  // Energy-based reasoning
  if (energy === 'exhausted' || energy === 'tired') {
    reasons.push(getRandomItem(REASONING_TEMPLATES.energy_low));
  } else if (energy === 'good' || energy === 'energized') {
    reasons.push(getRandomItem(REASONING_TEMPLATES.energy_high));
  }

  // Mood-based reasoning
  if (mood === 'stressed' || mood === 'anxious') {
    reasons.push(getRandomItem(REASONING_TEMPLATES.mood_stressed));
  } else if (mood === 'happy' || mood === 'excited') {
    reasons.push(getRandomItem(REASONING_TEMPLATES.mood_happy));
  }

  // If we don't have enough specific reasons, add a balanced one
  if (reasons.length === 0) {
    reasons.push(getRandomItem(REASONING_TEMPLATES.balanced));
  }

  // Add decision confidence
  const topScore = Math.max(...Object.values(allScores));
  const secondScore = Object.values(allScores).sort((a, b) => b - a)[1] || 0;
  const margin = topScore - secondScore;

  if (margin > 20) {
    reasons.push("This was a clear winner given your current state.");
  } else if (margin < 5) {
    reasons.push("It was close, but we've made the call for you.");
  }

  return reasons.slice(0, 2).join(' ');
}

function getCurrentTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function makeDecision(options, constraints, energy, mood) {
  // Parse options (comma or newline separated)
  const optionsList = options
    .split(/[,\n]/)
    .map(opt => opt.trim())
    .filter(opt => opt.length > 0);

  if (optionsList.length === 0) {
    return {
      decision: null,
      reasoning: "Please provide at least one option to choose from.",
      confidence: 0,
      allScores: {},
    };
  }

  if (optionsList.length === 1) {
    return {
      decision: optionsList[0],
      reasoning: "Only one option? Well, that makes this easy! " + getRandomItem(REASONING_TEMPLATES.quick_decision),
      confidence: 100,
      allScores: { [optionsList[0]]: 100 },
    };
  }

  const timeOfDay = getCurrentTimeOfDay();
  const allScores = {};

  // Score each option
  for (const option of optionsList) {
    allScores[option] = scoreOption(option, constraints, energy, mood, timeOfDay);
  }

  // Find the winner
  let winningOption = optionsList[0];
  let highestScore = allScores[optionsList[0]];

  for (const option of optionsList) {
    if (allScores[option] > highestScore) {
      highestScore = allScores[option];
      winningOption = option;
    }
  }

  // Generate reasoning
  const reasoning = generateReasoning(winningOption, energy, mood, allScores);

  // Calculate confidence (how much better is the winner vs average)
  const avgScore = Object.values(allScores).reduce((a, b) => a + b, 0) / optionsList.length;
  const confidence = Math.min(100, Math.max(50, 50 + (highestScore - avgScore) * 2));

  return {
    decision: winningOption,
    reasoning,
    confidence: Math.round(confidence),
    allScores,
  };
}

export const ENERGY_LEVELS = [
  { value: 'exhausted', label: '😴 Exhausted' },
  { value: 'tired', label: '😮‍💨 Tired' },
  { value: 'neutral', label: '😐 Neutral' },
  { value: 'good', label: '😊 Good' },
  { value: 'energized', label: '⚡ Energized' },
];

export const MOOD_OPTIONS = [
  { value: 'stressed', label: '😰 Stressed' },
  { value: 'anxious', label: '😟 Anxious' },
  { value: 'neutral', label: '😌 Calm' },
  { value: 'happy', label: '😄 Happy' },
  { value: 'excited', label: '🤩 Excited' },
];
