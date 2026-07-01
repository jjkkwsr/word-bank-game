document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let activeFileName = '';
    let vocabWords = [];
    let correctAnswers = [];
    let currentStoryText = '';

    // --- DOM Elements ---
    const viewMenu = document.getElementById('view-menu');
    const viewGame = document.getElementById('view-game');
    const viewResult = document.getElementById('view-result');
    const appContainer = document.getElementById('app-container');
    const toast = document.getElementById('feedback-toast');

    const themeMenuBtn = document.getElementById('theme-menu-btn');
    const themeDropdownMenu = document.getElementById('theme-dropdown-menu');

    const csvFileInput = document.getElementById('csv-file-input');
    const uploadTriggerBtn = document.getElementById('upload-trigger-btn');
    const storyTitle = document.getElementById('story-title');
    const storyTextContainer = document.getElementById('story-text-container');
    const wordbankChips = document.getElementById('wordbank-chips');
    const submitQuizBtn = document.getElementById('submit-quiz-btn');
    const exitGameBtn = document.getElementById('exit-game-btn');

    const finalScoreText = document.getElementById('final-score-text');
    const summaryText = document.getElementById('summary-text');
    const retryStoryBtn = document.getElementById('retry-story-btn');
    const menuBtn = document.getElementById('menu-btn');

    // --- Helper: Switch Views ---
    function switchView(viewId) {
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        const target = document.getElementById('view-' + viewId);
        if (target) {
            target.classList.add('active');
        }
    }

    // --- Helper: Shuffle Array ---
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- Helper: Show Toast ---
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    // --- Theme Controller ---
    themeMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdownMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        themeDropdownMenu.classList.add('hidden');
    });

    document.querySelectorAll('.theme-dropdown-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const theme = btn.dataset.theme;
            document.querySelectorAll('.theme-dropdown-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (theme === 'default') {
                document.body.removeAttribute('data-theme');
            } else {
                document.body.setAttribute('data-theme', theme);
            }
            themeDropdownMenu.classList.add('hidden');
        });
    });

    // --- CSV Parser ---
    function parseCSV(text) {
        const lines = text.split(/\r?\n/);
        const words = [];
        let isFirst = true;
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
            if (isFirst) {
                isFirst = false;
                if (cols[0].toLowerCase() === 'word') {
                    continue;
                }
            }
            if (cols[0]) {
                words.push(cols[0]);
            }
        }
        return words;
    }

    // --- Fallback Story Builder ---
    function getFallbackStory(words) {
        return "Here is your custom word bank challenge. Let's find where each vocabulary word belongs: " + 
               words.map(w => `[${w}]`).join(', ') + ". Read carefully and match them correctly!";
    }

    // --- Load Game logic ---
    function initGame(fileName, csvText) {
        activeFileName = fileName;
        vocabWords = parseCSV(csvText);

        if (vocabWords.length === 0) {
            showToast("No vocabulary words found in this file.");
            return;
        }

        // Clean lesson title name
        let cleanName = fileName.replace('.csv', '').replace(/^[0-9]+_/, '').replace(/_/g, ' ');
        cleanName = cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        storyTitle.textContent = cleanName;

        const storyFilename = fileName.replace('.csv', '.txt');

        // Check if custom uploaded file, use fallback immediately
        if (fileName === 'custom_uploaded.csv') {
            currentStoryText = getFallbackStory(vocabWords);
            renderStoryQuiz();
        } else {
            // Fetch the human-written story
            fetch(`story/${storyFilename}`)
                .then(res => {
                    if (res.status === 200) {
                        return res.text();
                    } else {
                        return getFallbackStory(vocabWords);
                    }
                })
                .then(text => {
                    currentStoryText = text;
                    renderStoryQuiz();
                })
                .catch(() => {
                    currentStoryText = getFallbackStory(vocabWords);
                    renderStoryQuiz();
                });
        }
    }

    // --- Render Story and Chips ---
    function renderStoryQuiz() {
        // Render Word Bank Chips
        wordbankChips.innerHTML = '';
        
        // Use unique correct answers from the story if available, or vocab list
        const regexMatch = currentStoryText.match(/\[([^\]]+)\]/g) || [];
        let uniqueWords = Array.from(new Set(regexMatch.map(w => w.slice(1, -1))));
        
        if (uniqueWords.length === 0) {
            uniqueWords = [...vocabWords];
        }
        
        shuffleArray(uniqueWords);

        uniqueWords.forEach(word => {
            const chip = document.createElement('div');
            chip.className = 'wordbank-chip';
            chip.textContent = word;
            chip.dataset.word = word;
            
            chip.addEventListener('click', () => {
                // Focus active input, or find the first empty input
                let activeInput = document.activeElement;
                if (!activeInput || !activeInput.classList.contains('cloze-input') || activeInput.disabled) {
                    const inputs = Array.from(document.querySelectorAll('.cloze-input'));
                    activeInput = inputs.find(input => input.value === '' && !input.disabled);
                }
                
                if (activeInput) {
                    activeInput.value = word;
                    activeInput.focus();
                    
                    // Trigger input event to refresh chip used state
                    activeInput.dispatchEvent(new Event('input'));
                    
                    // Autofocus next empty blank space
                    const inputs = Array.from(document.querySelectorAll('.cloze-input'));
                    const nextEmpty = inputs.find(input => input.value === '' && !input.disabled);
                    if (nextEmpty) {
                        nextEmpty.focus();
                    } else {
                        activeInput.blur();
                    }
                }
            });
            
            wordbankChips.appendChild(chip);
        });

        // Render Cloze Story Content
        storyTextContainer.innerHTML = '';
        correctAnswers = [];

        let storyHtml = "";
        let inputsCount = 0;
        
        const bracketsRegex = /\[([^\]]+)\]/g;
        let match;
        let lastIdx = 0;
        
        while ((match = bracketsRegex.exec(currentStoryText)) !== null) {
            storyHtml += currentStoryText.substring(lastIdx, match.index);
            
            const answerWord = match[1];
            correctAnswers.push(answerWord);
            
            const inputWidth = Math.max(110, answerWord.length * 13);
            
            storyHtml += `<input type="text" class="cloze-input" id="cloze-input-${inputsCount}" data-answer="${answerWord}" placeholder="Fill..." autocomplete="off" spellcheck="false" style="width: ${inputWidth}px;">`;
            
            inputsCount++;
            lastIdx = bracketsRegex.lastIndex;
        }
        storyHtml += currentStoryText.substring(lastIdx);

        // Populate story area
        storyTextContainer.innerHTML = storyHtml.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');

        // Bind input listeners to toggle chip styles dynamically
        document.querySelectorAll('.cloze-input').forEach(input => {
            input.addEventListener('input', updateChipStatus);
            input.addEventListener('change', updateChipStatus);
        });

        // Initialize state
        updateChipStatus();
        switchView('game');
    }

    // --- Dynamic Chip Status Check ---
    function updateChipStatus() {
        const inputValues = Array.from(document.querySelectorAll('.cloze-input'))
            .map(input => input.value.trim().toLowerCase());
            
        document.querySelectorAll('.wordbank-chip').forEach(chip => {
            const word = chip.dataset.word.trim().toLowerCase();
            if (inputValues.includes(word)) {
                chip.classList.add('used');
            } else {
                chip.classList.remove('used');
            }
        });
    }

    // --- Grading / Submission ---
    function submitQuiz() {
        let score = 0;
        const inputs = Array.from(document.querySelectorAll('.cloze-input'));
        
        if (inputs.length === 0) return;

        inputs.forEach(input => {
            const userAns = input.value.trim().toLowerCase().replace(/\s+/g, ' ');
            const correctAns = input.dataset.answer.trim().toLowerCase().replace(/\s+/g, ' ');

            if (userAns === correctAns) {
                score++;
                input.classList.add('correct');
                input.classList.remove('incorrect');
                input.disabled = true;
            } else {
                input.classList.add('incorrect');
                input.classList.remove('correct');
                input.disabled = true;
                input.value = `${userAns || '(Empty)'} (✗ -> ${input.dataset.answer})`;
            }
        });

        // Switch to result page after review delay
        setTimeout(() => {
            switchView('result');
            const percent = Math.round((score / inputs.length) * 100);
            finalScoreText.textContent = `${percent}%`;
            summaryText.innerHTML = `You completed the story filling quest!<br>Correctly filled <strong>${score}</strong> out of <strong>${inputs.length}</strong> blank spaces.`;
        }, 2500);
    }

    // --- Click Handlers: Selection Menu ---
    document.querySelectorAll('.lesson-card-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const fileName = btn.dataset.lesson;
            fetch(`vocabularies/${fileName}`)
                .then(res => res.text())
                .then(csvText => {
                    initGame(fileName, csvText);
                })
                .catch(() => {
                    showToast("Could not load vocabulary list.");
                });
        });
    });

    // --- Custom CSV Upload Handlers ---
    uploadTriggerBtn.addEventListener('click', () => {
        csvFileInput.click();
    });

    csvFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            initGame('custom_uploaded.csv', event.target.result);
        };
        reader.readAsText(file);
    });

    // --- Action Controllers ---
    submitQuizBtn.addEventListener('click', submitQuiz);
    
    exitGameBtn.addEventListener('click', () => {
        switchView('menu');
    });

    retryStoryBtn.addEventListener('click', () => {
        renderStoryQuiz();
    });

    menuBtn.addEventListener('click', () => {
        switchView('menu');
    });
});
