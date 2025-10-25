
const params = new URLSearchParams(window.location.search);
const username = params.get("username");

const questions = [
  // 1
  {
    category: 'Verbal Reasoning',
    question: 'Which word is MOST OPPOSITE to "Benevolent"?',
    options: ['Kind', 'Malevolent', 'Gentle', 'Compassionate'],
    correct: 'Malevolent',
    difficulty: 1
  },
  // 2
  {
    category: 'Verbal Reasoning',
    question: 'Complete the analogy: "BOOK is to READING as TELESCOPE is to ____"',
    options: ['Seeing', 'Astronomy', 'Lens', 'Watching'],
    correct: 'Astronomy',
    difficulty: 2
  },
  // 3
  {
    category: 'Verbal Reasoning',
    question: 'Find the correctly spelled word:',
    options: ['Definately', 'Definetely', 'Definitely', 'Definatly'],
    correct: 'Definitely',
    difficulty: 1
  },
  // 4
  {
    category: 'Logical Reasoning',
    question: 'If all roses are flowers, and some flowers fade quickly, what can be concluded?',
    options: [
      'All roses fade quickly',
      'Some roses fade quickly',
      'Some flowers are roses',
      'All flowers are roses'
    ],
    correct: 'Some flowers are roses',
    difficulty: 2
  },
  // 5
  {
    category: 'Logical Reasoning',
    question: 'Tom is taller than John. John is shorter than Mary. Who is the shortest?',
    options: ['Tom', 'John', 'Mary', 'Cannot be determined'],
    correct: 'John',
    difficulty: 2
  },
  // 6
  {
    category: 'Numerical Reasoning',
    question: 'What is the next number in the sequence: 2, 4, 8, 16, ____?',
    options: ['24', '31', '32', '64'],
    correct: '32',
    difficulty: 1
  },
  // 7
  {
    category: 'Numerical Reasoning',
    question: 'If 3 workers can complete a job in 12 days, how many days would 4 workers take?',
    options: ['9 days', '8 days', '10 days', '6 days'],
    correct: '9 days',
    difficulty: 2
  },
  // 8
  {
    category: 'Numerical Reasoning',
    question: 'A train travels 300 miles in 5 hours. What is its speed?',
    options: ['50 mph', '60 mph', '70 mph', '80 mph'],
    correct: '60 mph',
    difficulty: 1
  },
  // 9
  {
    category: 'Spatial Reasoning',
    question: 'Which sequence continues the pattern? A, C, F, J, ____',
    options: ['M', 'N', 'O', 'P'],
    correct: 'M',
    difficulty: 1
  },
  // 10
  {
    category: 'Spatial Reasoning',
    question: 'If a cube has red on top and blue on the front, after a 90° clockwise rotation, what color is now on the right?',
    options: ['Red', 'Blue', 'Green', 'Yellow'],
    correct: 'Blue',
    difficulty: 2
  }
];

// ====== VARIABLES ======
let iq = 0;
let current = 0;
let answers = [];
const startTime = Date.now();
let result = null;

// ====== CORE FUNCTIONS ======

function showQuestion() {
  if (current >= questions.length) {
    calculateScore();
    return;
  }

  const q = questions[current];
  document.getElementById('question-title').innerText = `Question ${current + 1}`;
  document.getElementById('question-text').innerText = q.question;

  const optionsContainer = document.getElementById('options-container');
  optionsContainer.innerHTML = '';

  q.options.forEach(opt => {
    const button = document.createElement('button');
    button.innerText = opt;
    button.className = 'option-btn';
    button.onclick = () => handleAnswer(opt);
    optionsContainer.appendChild(button);
  });

  document.getElementById('question-counter').innerText =
    `Category: ${q.category} • ${current + 1} of ${questions.length}`;
}

function handleAnswer(answer) {
  answers.push(answer);
  current++;
  showQuestion(); 
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

  // Time checks
  if (duration < 1) {
    showError('Finished too quickly! Try again carefully.');
    resetTest();
    return;
  } else if (duration > 600) {
    total *= 0.8;
    showError('You took too long! Score reduced by 20%.');
  }

  total = Math.max(0, total);
  iq = 80 + Math.floor((total / 50) * 40);
  iq = Math.min(iq, 160);
  result = iq;
  localStorage.setItem('iq', iq);

  saveresult();
}
const backendUrl="http://127.0.0.1:5000";
async function  saveresult() {
  // If passed, redirect immediately) 
    try{
      console.log(username,iq);
      const response = await fetch(`${backendUrl}/saveresult`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          iq: iq
        }),
      });
    }catch(err){
      console.error('Error saving IQ score:', err);
    }
    window.location.href = `../session/session.html?username=${username}` // Redirect without showing IQ
    return;
  }


function showError(msg) {
  const err = document.getElementById('error-message');
  err.style.display = 'block';
  err.innerText = msg;
  setTimeout(() => (err.style.display = 'none'), 4000);
}

function resetTest() {
  current = 0;
  answers = [];
  document.getElementById('result-container').style.display = 'none';
  document.getElementById('question-area').style.display = 'block';
  document.getElementById('options-container').style.display = 'flex';
  document.getElementById('question-counter').style.display = 'block';
  showQuestion();
}

// ====== START TEST ======
showQuestion();
