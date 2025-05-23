var gk_isXlsx = false;
var gk_xlsxFileLookup = {};
var gk_fileData = {};

function filledCell(cell) {
  return cell !== '' && cell != null;
}

function loadFileData(filename) {
  if (gk_isXlsx && gk_xlsxFileLookup[filename]) {
    try {
      var workbook = XLSX.read(gk_fileData[filename], { type: 'base64' });
      var firstSheetName = workbook.SheetNames[0];
      var worksheet = workbook.Sheets[firstSheetName];

      // Convert sheet to JSON to filter blank rows
      var jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
      // Filter out blank rows (rows where all cells are empty, null, or undefined)
      var filteredData = jsonData.filter(row => row.some(filledCell));

      // Heuristic to find the header row by ignoring rows with fewer filled cells than the next row
      var headerRowIndex = filteredData.findIndex((row, index) =>
        row.filter(filledCell).length >= filteredData[index + 1]?.filter(filledCell).length
      );
      // Fallback
      if (headerRowIndex === -1 || headerRowIndex > 25) {
        headerRowIndex = 0;
      }

      // Convert filtered JSON back to CSV
      var csv = XLSX.utils.aoa_to_sheet(filteredData.slice(headerRowIndex));
      csv = XLSX.utils.sheet_to_csv(csv, { header: 1 });
      return csv;
    } catch (e) {
      console.error(e);
      return "";
    }
  }
  return gk_fileData[filename] || "";
}

const screens = ['home-screen', 'avatar-screen', 'game-screen', 'end-screen'];
let selectedAvatar = '';
let playerName = '';
let currentPosition = 1;
let correctAnswers = 0;
const usedQuestions = new Set();

const questions = [
  { type: 'true-false', question: 'Το αντικείμενο πρόγραμμα παράγεται από τον μεταγλωττιστή.', correct: true },
  { type: 'true-false', question: 'Σε ένα δυαδικό δένδρο κάθε κόμβος έχει 0, 1 ή 2 υποδένδρα.', correct: true },
  { type: 'true-false', question: 'Η ενθυλάκωση υποδηλώνει ότι οι εσωτερικές λειτουργίες ενός αντικειμένου είναι ορατές στον έξω κόσμο.', correct: false },
  { type: 'true-false', question: 'Η ώθηση ενός στοιχείου γίνεται στην κορυφή της στοίβας.', correct: true },
  { type: 'true-false', question: 'Το όχημα είναι υποκλάση του αυτοκινήτου.', correct: false },
  { type: 'matching', question: 'Παράλειψη δήλωσης μεταβλητής', options: ['Συντακτικό Λάθος', 'Λάθος κατά την εκτέλεση', 'Λογικό Λάθος'], correct: 'Συντακτικό Λάθος' },
  { type: 'matching', question: 'Εξαγωγή λανθασμένου αποτελέσματος', options: ['Συντακτικό Λάθος', 'Λάθος κατά την εκτέλεση', 'Λογικό Λάθος'], correct: 'Λογικό Λάθος' },
  { type: 'matching', question: 'Διαίρεση με το μηδέν (0)', options: ['Συντακτικό Λάθος', 'Λάθος κατά την εκτέλεση', 'Λογικό Λάθος'], correct: 'Λάθος κατά την εκτέλεση' },
  { type: 'matching', question: 'Καταχώριση από τον χρήστη γράμματος σε ακέραια μεταβλητή', options: ['Συντακτικό Λάθος', 'Λάθος κατά την εκτέλεση', 'Λογικό Λάθος'], correct: 'Λάθος κατά την εκτέλεση' },
  { type: 'matching', question: 'Όνομα μεταβλητής: 3Α', options: ['Συντακτικό Λάθος', 'Λάθος κατά την εκτέλεση', 'Λογικό Λάθος'], correct: 'Συντακτικό Λάθος' }
];

// --- Fill-in-the-blank exercises ---
const fillBlankExercises = [
  {
    text: 'Με τον όρο Πρόβλημα εννοείται μια <input type="text" id="blank0" size="10"> η οποία <input type="text" id="blank1" size="18">, απαιτεί <input type="text" id="blank2" size="6">, η δε <input type="text" id="blank3" size="6"> της δεν είναι <input type="text" id="blank4" size="8">, ούτε <input type="text" id="blank5" size="8">.',
    answers: [
      'κατάσταση',
      'χρήζει αντιμετώπισης',
      'λύση',
      'λύση',
      'γνωστή',
      'προφανής'
    ]
  },
  {
    text: 'Με τον όρο δεδομένο δηλώνεται οποιοδήποτε <input type="text" id="blank0" size="8"> μπορεί να γίνει <input type="text" id="blank1" size="10"> από έναν <input type="text" id="blank2" size="12"> με μία από τις <input type="text" id="blank3" size="14"> του.',
    answers: [
      'στοιχείο',
      'αντιληπτό',
      'τουλάχιστον παρατηρητή',
      'πέντε αισθήσεις'
    ]
  },
  {
    text: 'Με τον όρο πληροφορία αναφέρεται οποιοδήποτε <input type="text" id="blank0" size="18"> προέρχεται από <input type="text" id="blank1" size="18">.',
    answers: [
      'γνωσιακό στοιχείο',
      'επεξεργασία δεδομένων'
    ]
  },
  {
    text: 'Ο όρος επεξεργασία δεδομένων δηλώνει εκείνη τη <input type="text" id="blank0" size="10"> κατά την οποία ένας "<input type="text" id="blank1" size="10">" δέχεται <input type="text" id="blank2" size="8">, τα επεξεργάζεται σύμφωνα με έναν <input type="text" id="blank3" size="18"> και αποδίδει <input type="text" id="blank4" size="10">.',
    answers: [
      'διαδικασία',
      'μηχανισμός',
      'δεδομένα',
      'προκαθορισμένο τρόπο',
      'πληροφορίες'
    ]
  },
  {
    text: 'Με τον όρο δομή ενός προβλήματος αναφερόμαστε στα <input type="text" id="blank0" size="18"> του <input type="text" id="blank1" size="8">, στα <input type="text" id="blank2" size="18"> που το αποτελούν καθώς επίσης και στον <input type="text" id="blank3" size="8"> που αυτά τα <input type="text" id="blank4" size="14"> μεταξύ τους.',
    answers: [
      'συστατικά του μέρη',
      'προβλήματος',
      'επιμέρους τμήματα',
      'τρόπο',
      'μέρη συνδέονται'
    ]
  }
];

// Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  const an = a.length, bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = [];
  for (let i = 0; i <= bn; ++i) matrix[i] = [i];
  for (let j = 0; j <= an; ++j) matrix[0][j] = j;
  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[bn][an];
}

function isCloseEnough(user, answer) {
  user = user.trim().toLowerCase();
  answer = answer.trim().toLowerCase();
  if (user === answer) return true;
  // Allow up to 2 character difference for short answers, 3 for longer
  const maxDist = answer.length > 8 ? 3 : 2;
  return levenshtein(user, answer) <= maxDist;
}

// UI rendering
function renderFillBlankExercise(idx) {
  const ex = fillBlankExercises[idx];
  const container = document.getElementById('fill-blank-container');
  container.innerHTML = `<div style="font-size:22px;margin-bottom:16px;">${ex.text}</div>
    <button class="btn" onclick="checkFillBlank(${idx})">Έλεγχος</button>
    <div id="fill-blank-feedback" style="margin-top:12px;font-size:18px;"></div>`;
}

function checkFillBlank(idx) {
  const ex = fillBlankExercises[idx];
  let allCorrect = true;
  let wrongs = [];
  for (let i = 0; i < ex.answers.length; ++i) {
    const val = document.getElementById('blank'+i).value;
    if (!isCloseEnough(val, ex.answers[i])) {
      allCorrect = false;
      wrongs.push(i+1);
    }
  }
  const feedback = document.getElementById('fill-blank-feedback');
  if (allCorrect) {
    feedback.innerHTML = '<span style="color:green;">Σωστά! 🎉</span>';
  } else {
    feedback.innerHTML = '<span style="color:#d32f2f;">Λάθος στα κενά: ' + wrongs.join(', ') + '</span>';
  }
}

// Navigation
function renderFillBlankNav(current) {
  const nav = document.getElementById('fill-blank-nav');
  nav.innerHTML = fillBlankExercises.map((_, i) =>
    `<button class="btn" style="background:${i===current?'#0288d1':'#81c784'}" onclick="startFillBlank(${i})">Άσκηση ${i+1}</button>`
  ).join(' ');
}

// Entry point
function startFillBlank(idx=0) {
  renderFillBlankNav(idx);
  renderFillBlankExercise(idx);
}

// --- Add to window for inline onclick ---
window.startFillBlank = startFillBlank;
window.checkFillBlank = checkFillBlank;

// --- Render on page if container exists ---
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('fill-blank-container')) {
    startFillBlank(0);
  }
});

const generateBoardPositions = () => {
  const rows = 3, cols = 5, squareSize = 100, padding = 20;
  let positions = [];
  let index = 0;
  for (let row = rows - 1; row >= 0; row--) {
    for (let col = 0; col < cols; col++) {
      positions.push({ x: col * squareSize + padding, y: row * squareSize + padding });
      index++;
      if (index === 15) break;
    }
  }
  return positions;
};

const boardPositions = generateBoardPositions();

function showScreen(screenId) {
  screens.forEach(screen => {
    const el = document.getElementById(screen);
    el.classList.toggle('visible', screen === screenId);
    el.classList.toggle('hidden', screen !== screenId);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectAvatar(avatar) {
  selectedAvatar = avatar;
  document.querySelectorAll('.avatar').forEach(el => el.style.border = '3px solid #333');
  document.querySelector(`.avatar-${avatar}`).style.border = '3px solid #d81b60';
}

function startGame() {
  if (!selectedAvatar) {
    alert('Παρακαλώ επιλέξτε ένα avatar!');
    return;
  }
  playerName = document.getElementById('player-name').value || 'Παίκτης';
  currentPosition = 1;
  correctAnswers = 0;
  usedQuestions.clear();
  showScreen('game-screen');
  setupBoard();
  loadQuestion();
}

function setupBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  boardPositions.forEach((pos, index) => {
    const square = document.createElement('div');
    square.className = 'square';
    square.textContent = index + 1;
    square.style.left = `${pos.x}px`;
    square.style.top = `${pos.y}px`;
    square.style.backgroundColor = index % 2 === 0 ? '#81c784' : '#66bb6a';
    board.appendChild(square);
  });
  const player = document.createElement('div');
  player.className = `player avatar-${selectedAvatar}`;
  player.style.left = `${boardPositions[0].x + 25}px`;
  player.style.top = `${boardPositions[0].y + 25}px`;
  board.appendChild(player);
}

function loadQuestion() {
  if (usedQuestions.size >= questions.length || currentPosition >= 15) {
    endGame();
    return;
  }

  const availableQuestions = questions
    .map((q, i) => ({ q, i }))
    .filter(({ i }) => !usedQuestions.has(i));
  const { q: question, i: questionIndex } = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
  usedQuestions.add(questionIndex);

  document.getElementById('question-type').textContent = question.type === 'true-false' ? 'Σωστό/Λάθος' : 'Αντιστοίχιση';
  document.getElementById('question').textContent = question.question;
  const optionsDiv = document.getElementById('options');
  optionsDiv.innerHTML = '';

  if (question.type === 'true-false') {
    optionsDiv.innerHTML = `
      <button class="btn option-true" onclick="checkAnswer(true, ${questionIndex})">Σωστό</button>
      <button class="btn option-false" onclick="checkAnswer(false, ${questionIndex})">Λάθος</button>
    `;
  } else {
    const select = document.createElement('select');
    select.className = 'option-dropdown';
    select.innerHTML = '<option value="">Επιλέξτε...</option>' + 
      question.options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
    optionsDiv.appendChild(select);
    const submitButton = document.createElement('button');
    submitButton.className = 'btn';
    submitButton.textContent = 'Υποβολή';
    submitButton.onclick = () => checkAnswer(select.value, questionIndex);
    optionsDiv.appendChild(submitButton);
  }

  document.getElementById('feedback').textContent = '';
  document.getElementById('score').textContent = `Θέση: ${currentPosition} από 15 | Σωστές: ${correctAnswers}`;
}

let botElement = null;

function showBotKick(playerX, playerY, onComplete) {
  // Δημιουργία μποτας αν δεν υπάρχει
  if (!botElement) {
    botElement = document.createElement('div');
    botElement.id = 'bot-kick';
    botElement.innerText = '👢';
    document.getElementById('board').appendChild(botElement);
  }
  // Τοποθέτηση μποτας δεξιά από τον παίκτη
  botElement.style.left = (playerX + 40) + 'px'; // 40px δεξιά από το avatar
  botElement.style.top = (playerY - 10) + 'px'; // ελαφρώς πάνω για να "κλωτσάει" το avatar
  botElement.classList.remove('kick');
  // Ενεργοποίηση animation
  setTimeout(() => {
    botElement.classList.add('kick');
    // Κούνημα avatar
    const player = document.querySelector('.player');
    if (player) {
      player.classList.add('kick');
      setTimeout(() => {
        player.classList.remove('kick');
      }, 400);
    }
    // Αφαίρεση μποτας μετά το animation
    setTimeout(() => {
      botElement.classList.remove('kick');
      botElement.style.opacity = '0';
      if (onComplete) onComplete();
    }, 600);
  }, 10);
}

function checkAnswer(selected, questionIndex) {
  const question = questions[questionIndex];
  const isCorrect = question.type === 'true-false' ? selected === question.correct : selected === question.correct;

  document.getElementById('feedback').textContent = isCorrect ? 'Σωστά!' : 'Λάθος';
  if (isCorrect) {
    correctAnswers++;
    currentPosition += 2;
    movePlayer();
  } else {
    // Animation bot kick και μετακίνηση πίσω
    const player = document.querySelector('.player');
    if (player && currentPosition > 1) {
      const pos = boardPositions[currentPosition - 1];
      showBotKick(pos.x + 25, pos.y + 25, () => {
        currentPosition = Math.max(1, currentPosition - 1);
        movePlayer();
      });
    } else {
      movePlayer();
    }
  }
}

function movePlayer() {
  if (currentPosition >= 15 || usedQuestions.size >= questions.length) {
    endGame();
    return;
  }

  const player = document.querySelector('.player');
  player.classList.add('bounce');
  requestAnimationFrame(() => {
    player.style.left = `${boardPositions[currentPosition - 1].x + 25}px`;
    player.style.top = `${boardPositions[currentPosition - 1].y + 25}px`;
    player.classList.remove('bounce');
    setTimeout(loadQuestion, 500);
  });
}

function endGame() {
  showScreen('end-screen');
  document.getElementById('end-message').textContent = currentPosition >= 15
    ? 'Μπράβο! Ολοκλήρωσες το Παιχνίδι!'
    : 'Μπορείς και καλύτερα, δοκίμασε ξανά!';
  document.getElementById('end-score').textContent = `Συνολικές Σωστές Απαντήσεις: ${correctAnswers}`;
}