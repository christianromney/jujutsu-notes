// Quiz Engine - Reusable JavaScript for multiple-choice tests
// Expects a global 'questionBank' array to be defined before loading this script
// questionBank should contain all available questions with a 'category' field

let currentQuestion = 0;
let answers = [];
let activeQuestions = []; // The 10 questions selected for this quiz session

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Select questions while maintaining balanced topic coverage
 * @param {Array} bank - Full question bank
 * @param {number} count - Number of questions to select (default: 10)
 * @returns {Array} - Selected questions
 */
function selectBalancedQuestions(bank, count = 10) {
    if (bank.length <= count) {
        return shuffleArray(bank);
    }

    // Group questions by category
    const categories = {};
    bank.forEach(q => {
        const cat = q.category || 'general';
        if (!categories[cat]) {
            categories[cat] = [];
        }
        categories[cat].push(q);
    });

    const categoryNames = Object.keys(categories);
    const questionsPerCategory = Math.floor(count / categoryNames.length);
    const remainder = count % categoryNames.length;

    let selected = [];

    // Select proportional questions from each category
    categoryNames.forEach((cat, index) => {
        const categoryQuestions = shuffleArray(categories[cat]);
        let toTake = questionsPerCategory;

        // Distribute remainder among first few categories
        if (index < remainder) {
            toTake++;
        }

        selected = selected.concat(categoryQuestions.slice(0, toTake));
    });

    // If we don't have enough questions yet (some categories might be too small)
    if (selected.length < count) {
        const unselected = bank.filter(q => !selected.includes(q));
        const additional = shuffleArray(unselected).slice(0, count - selected.length);
        selected = selected.concat(additional);
    }

    // Final shuffle to mix up the order
    return shuffleArray(selected);
}

function initQuiz() {
    // Check for questionBank (new) or questions (legacy)
    const bank = typeof questionBank !== 'undefined' ? questionBank :
                 typeof questions !== 'undefined' ? questions : null;

    if (!bank || !bank.length) {
        console.error('No questionBank array found. Please define questionBank before loading quiz.js');
        return;
    }

    // Select balanced set of questions
    activeQuestions = selectBalancedQuestions(bank, 10);
    answers = new Array(activeQuestions.length).fill(null);

    const container = document.getElementById('questionsContainer');
    container.innerHTML = ''; // Clear any existing content

    activeQuestions.forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-container';
        questionDiv.id = `question-${index}`;

        questionDiv.innerHTML = `
            <div class="question-number">Question ${index + 1} of ${activeQuestions.length}</div>
            <div class="question-text">${q.question}</div>
            <div class="options">
                ${q.options.map((option, optIndex) => `
                    <label class="option" onclick="selectOption(${index}, ${optIndex})">
                        <input type="radio" name="question-${index}" value="${optIndex}">
                        <span class="option-text">${option}</span>
                    </label>
                `).join('')}
            </div>
        `;

        container.appendChild(questionDiv);
    });

    showQuestion(0);
    updateProgress();
}

function showQuestion(index) {
    document.querySelectorAll('.question-container').forEach(q => q.classList.remove('active'));
    document.getElementById(`question-${index}`).classList.add('active');

    currentQuestion = index;
    updateNavigation();
    updateProgress();

    // Restore selected answer if exists
    if (answers[index] !== null) {
        const radio = document.querySelector(`#question-${index} input[value="${answers[index]}"]`);
        if (radio) {
            radio.checked = true;
            radio.closest('.option').classList.add('selected');
        }
    }
}

function selectOption(questionIndex, optionIndex) {
    answers[questionIndex] = optionIndex;

    // Update visual selection
    const container = document.getElementById(`question-${questionIndex}`);
    container.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
    container.querySelectorAll('.option')[optionIndex].classList.add('selected');

    updateNavigation();
}

function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.disabled = currentQuestion === 0;

    if (currentQuestion === activeQuestions.length - 1) {
        nextBtn.textContent = 'Submit';
        nextBtn.onclick = submitQuiz;
    } else {
        nextBtn.textContent = 'Next';
        nextBtn.onclick = nextQuestion;
    }
}

function updateProgress() {
    const progress = ((currentQuestion + 1) / activeQuestions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
}

function nextQuestion() {
    if (currentQuestion < activeQuestions.length - 1) {
        showQuestion(currentQuestion + 1);
    }
}

function previousQuestion() {
    if (currentQuestion > 0) {
        showQuestion(currentQuestion - 1);
    }
}

function submitQuiz() {
    // Check if all questions are answered
    if (answers.includes(null)) {
        alert('Please answer all questions before submitting.');
        return;
    }

    // Calculate score
    let correct = 0;
    answers.forEach((answer, index) => {
        if (answer === activeQuestions[index].correct) {
            correct++;
        }
    });

    const percentage = Math.round((correct / activeQuestions.length) * 100);

    // Hide questions and navigation
    document.getElementById('questionsContainer').style.display = 'none';
    document.getElementById('navigation').style.display = 'none';

    // Show results
    document.getElementById('score').textContent = `${percentage}%`;
    document.getElementById('scoreMessage').textContent = getScoreMessage(percentage);

    // Show answer review
    displayAnswerReview(correct);

    document.getElementById('results').classList.add('active');
}

function getScoreMessage(percentage) {
    if (percentage === 100) return "Perfect score! You've mastered this material!";
    if (percentage >= 80) return "Great job! You have a solid understanding!";
    if (percentage >= 60) return "Good work! Review the tutorial for areas to improve.";
    return "Keep learning! Review the tutorial and try again.";
}

function displayAnswerReview(correctCount) {
    const reviewContainer = document.getElementById('answerReview');
    reviewContainer.innerHTML = `<h3 style="margin-bottom: 20px;">Review Your Answers (${correctCount}/${activeQuestions.length} correct)</h3>`;

    activeQuestions.forEach((q, index) => {
        const userAnswer = answers[index];
        const isCorrect = userAnswer === q.correct;

        const reviewItem = document.createElement('div');
        reviewItem.className = `review-item ${isCorrect ? 'correct' : 'incorrect'}`;

        reviewItem.innerHTML = `
            <div class="review-question">Question ${index + 1}: ${q.question}</div>
            <div class="review-answer ${isCorrect ? 'correct' : 'incorrect'}">
                Your answer: ${q.options[userAnswer]}
                ${!isCorrect ? `<br><strong>Correct answer: ${q.options[q.correct]}</strong>` : ''}
            </div>
        `;

        reviewContainer.appendChild(reviewItem);
    });
}

function restartQuiz() {
    // Re-initialize quiz with new random selection
    initQuiz();

    // Hide results, show quiz
    document.getElementById('results').classList.remove('active');
    document.getElementById('questionsContainer').style.display = 'block';
    document.getElementById('navigation').style.display = 'flex';

    // Reset state
    currentQuestion = 0;
}

// Initialize quiz on page load
window.onload = initQuiz;
