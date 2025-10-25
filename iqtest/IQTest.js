const questions = [
  {
    category: 'Verbal Reasoning',
    question: 'Which word is MOST OPPOSITE to "Benevolent"?',
    options: ['Kind', 'Malevolent', 'Gentle', 'Compassionate'],
    correct: 'Malevolent',
    difficulty: 1
  },
  {
    category: 'Verbal Reasoning',
    question: 'Complete the analogy: "BOOK is to READING as TELESCOPE is to ____"',
    options: ['Seeing', 'Astronomy', 'Lens', 'Watching'],
    correct: 'Astronomy',
    difficulty: 2
  },
  {
    category: 'Verbal Reasoning',
    question: 'What word means the OPPOSITE of "Transparent"?',
    options: ['Clear', 'Opaque', 'Visible', 'Translucent'],
    correct: 'Opaque',
    difficulty: 1
  },
  {
    category: 'Verbal Reasoning',
    question: 'If "PAINTER" is coded as "IQMRZIV", what would "DOCTOR" be coded as?',
    options: ['KVXRVI', 'KVGZVI', 'QVXSZI', 'MVGZVI'],
    correct: 'KVGZVI',
    difficulty: 2
  },
  {
    category: 'Verbal Reasoning',
    question: 'Select the word that completes the sequence: STUDY → STUDIES → STUDYING → ____',
    options: ['Study', 'Studies', 'Studious', 'Studied'],
    correct: 'Studied',
    difficulty: 1
  },
  {
    category: 'Numerical Reasoning',
    question: 'What is the next number in the sequence: 2, 4, 8, 16, ____?',
    options: ['24', '31', '32', '64'],
    correct: '32',
    difficulty: 1
  },
  {
    category: 'Numerical Reasoning',
    question: 'If 3 workers can complete a job in 12 days, how many days would 4 workers take?',
    options: ['9 days', '8 days', '10 days', '6 days'],
    correct: '8 days',
    difficulty: 2
  },
  {
    category: 'Numerical Reasoning',
    question: 'What number logically follows? 1, 4, 9, 16, ____',
    options: ['20', '25', '30', '36'],
    correct: '25',
    difficulty: 2
  },
  {
    category: 'Numerical Reasoning',
    question: 'A train travels 240 miles in 4 hours. What is its speed?',
    options: ['50 miles/hour', '60 miles/hour', '70 miles/hour', '80 miles/hour'],
    correct: '60 miles/hour',
    difficulty: 1
  },
  {
    category: 'Numerical Reasoning',
    question: 'If x + 5 = 15, what is the value of x?',
    options: ['5', '10', '15', '20'],
    correct: '10',
    difficulty: 1
  },
  {
    category: 'Logical Reasoning',
    question: 'If all cats are mammals, and some mammals are pets, what is DEFINITELY true?',
    options: ['All cats are pets', 'Some pets are cats', 'No cats are pets', 'Some mammals are not cats'],
    correct: 'Some pets are cats',
    difficulty: 1
  },
  {
    category: 'Logical Reasoning',
    question: 'Tom is taller than John. John is shorter than Mary. Who is the shortest?',
    options: ['Tom', 'John', 'Mary', 'Cannot be determined'],
    correct: 'John',
    difficulty: 2
  },
  {
    category: 'Logical Reasoning',
    question: 'If A → B and B → C, then A → C. This is an example of what logical principle?',
    options: ['Contradiction', 'Transitive Relation', 'Commutative Property', 'Associative Property'],
    correct: 'Transitive Relation',
    difficulty: 2
  },
  {
    category: 'Spatial Reasoning',
    question: 'Which sequence continues the pattern? A, C, F, J, ____',
    options: ['M', 'N', 'O', 'P'],
    correct: 'M',
    difficulty: 1
  },
  {
    category: 'Spatial Reasoning',
    question: 'A cube has different colors on its faces: red on top, blue on front, green on right side, yellow on left side, white on bottom, and black on back. If the cube is rotated 90 degrees clockwise from its original position, what color will be on the front face?',
    options: ['Blue', 'Green', 'Yellow', 'Red'],
    correct: 'Yellow',
    difficulty: 2
  }
];

let current = 0;
let answers = [];
const startTime = Date.now();
let result = null;

function showQuestion() {
    if (current >= questions.length) {
        calculateScore();
        return;
    }
  const question = questions[current];
  document.getElementById('question-title').innerText = `Question ${current + 1} of ${questions.length}`;
  document.getElementById('question-text').innerText = question.question;

  const optionsContainer = document.getElementById('options-container');
  optionsContainer.innerHTML = '';

  question.options.forEach((opt, idx) => {
    const button = document.createElement('button');
    button.innerText = opt;
    button.onclick = () => handleAnswer(opt);
    optionsContainer.appendChild(button);
  });

  document.getElementById('question-counter').innerText = `Question ${current + 1} of ${questions.length}`;
}

function handleAnswer(answer) {
  answers.push(answer);

  if (answers.length === questions.length) {
    calculateScore();
  } else {
    current++;
    showQuestion();
  }
}

function calculateScore() {
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  let total = 0;

  answers.forEach((ans, i) => {
    if (ans === questions[i].correct) {
      total += questions[i].difficulty * 5;
    }
  });

  if (duration < 30) {
    showError('The test was completed too quickly. Please take your time and try again.');
    resetTest();
    return;
  } else if (duration > 780) {
    total *= 0.75;
    showError('Took too long! Score reduced by 25%.');
  }

  total = Math.max(0, total);
  let iq = 80 + Math.floor((total / 110) * 40);
  iq = Math.min(iq, 160);

  localStorage.setItem('iq_score', iq);
  result = iq;
  showResult();
}

function showResult() {
  document.getElementById('question-container').style.display = 'none';
  document.getElementById('result-container').style.display = 'block';
  document.getElementById('iq-score').innerText = result;
}

function showError(message) {
  const errorMessage = document.getElementById('error-message');
  errorMessage.innerText = message;
  setTimeout(() => {
    errorMessage.innerText = '';
  }, 3000);
}

function resetTest() {
  setTimeout(() => {
    current = 0;
    answers = [];
    document.getElementById('question-container').style.display = 'block';
    document.getElementById('result-container').style.display = 'none';
    showQuestion();
  }, 3000);
}

showQuestion();