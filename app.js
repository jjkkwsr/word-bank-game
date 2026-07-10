document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let activeFileName = '';
    let vocabWords = [];
    let correctAnswers = [];
    let currentStoryText = '';
    let activeDifficulty = 'quiz';
    let activeStoryIndex = 1;
    let selectedInput = null;

    const STORIES_METADATA = {
        "1_a_favourite_toy_shop.csv": {
            "quiz": 3,
            "exam": 2
        },
        "2_the_party.csv": {
            "quiz": 3,
            "exam": 2
        },
        "3_at_the_doctors.csv": {
            "quiz": 3,
            "exam": 2
        },
        "4_uncle_charlies_hotel.csv": {
            "quiz": 3,
            "exam": 2
        },
        "5_from_the_countryside_to_the_jungle.csv": {
            "quiz": 3,
            "exam": 2
        },
        "6_the_weather.csv": {
            "quiz": 2,
            "exam": 2
        },
        "7_our_town.csv": {
            "quiz": 3,
            "exam": 2
        },
        "8_dreaming_of_holidays.csv": {
            "quiz": 2,
            "exam": 2
        },
        "9_some_games.csv": {
            "quiz": 3,
            "exam": 2
        },
        "default": {
            "quiz": 1,
            "exam": 1
        }
    };

    // --- DOM Elements ---
    const viewMenu = document.getElementById('view-menu');
    const viewPreview = document.getElementById('view-preview');
    const viewGame = document.getElementById('view-game');
    const viewResult = document.getElementById('view-result');
    const appContainer = document.getElementById('app-container');
    const toast = document.getElementById('feedback-toast');

    const themeMenuBtn = document.getElementById('theme-menu-btn');
    const themeDropdownMenu = document.getElementById('theme-dropdown-menu');

    const supermanToggle = document.getElementById('superman-toggle');
    
    const previewTitle = document.getElementById('preview-title');
    const previewTextContainer = document.getElementById('preview-text-container');
    const startGameBtn = document.getElementById('start-game-btn');
    const exitPreviewBtn = document.getElementById('exit-preview-btn');

    const storySelectorContainer = document.getElementById('story-selector-container');
    const storySelectorButtons = document.getElementById('story-selector-buttons');

    const storyTitle = document.getElementById('story-title');
    const storyTextContainer = document.getElementById('story-text-container');
    const wordbankSection = document.querySelector('.wordbank-section');
    const wordbankChips = document.getElementById('wordbank-chips');
    const submitQuizBtn = document.getElementById('submit-quiz-btn');
    const gameResultsCard = document.getElementById('game-results-card');
    const exitGameBtn = document.getElementById('exit-game-btn');

    const finalScoreText = document.getElementById('final-score-text');
    const summaryText = document.getElementById('summary-text');
    const retryStoryBtn = document.getElementById('retry-story-btn');
    const menuBtn = document.getElementById('menu-btn');

    // --- Helper: Pronounce Word ---
    function pronounceWord(word) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.85; // slightly slower for language learners
        window.speechSynthesis.speak(utterance);
    }

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
        document.querySelectorAll('.wordbank-chip').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.cloze-input').forEach(inp => inp.classList.remove('selected'));
        selectedInput = null;
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

        // Reset difficulty tabs in UI to quiz
        activeDifficulty = 'quiz';
        activeStoryIndex = 1;
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            if (btn.dataset.difficulty === 'quiz') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        loadStory('quiz', 1);
    }

    function loadStory(difficulty, storyIndex) {
        activeDifficulty = difficulty;
        activeStoryIndex = storyIndex;
        
        if (activeFileName === 'custom_uploaded.csv') {
            currentStoryText = getFallbackStory(vocabWords);
            renderStoryPreview();
            return;
        }

        const lessonBase = activeFileName.replace('.csv', '');
        const storyFilename = `${lessonBase}_${difficulty}_${storyIndex}.txt`;

        fetch(`story/${storyFilename}`)
            .then(res => {
                if (res.status === 200) {
                    return res.text();
                } else {
                    // Try original file name if storyIndex 1 (e.g. 2_the_party.txt)
                    const originalFilename = `${lessonBase}.txt`;
                    console.log(`Story ${storyFilename} not found, falling back to ${originalFilename}`);
                    return fetch(`story/${originalFilename}`).then(r => {
                        if (r.status === 200) {
                            return r.text();
                        } else {
                            return getFallbackStory(vocabWords);
                        }
                    });
                }
            })
            .then(text => {
                currentStoryText = text;
                renderStoryPreview();
            })
            .catch(() => {
                currentStoryText = getFallbackStory(vocabWords);
                renderStoryPreview();
            });
    }

    // --- Render Story Preview ---
    function renderStoryPreview() {
        // Clean lesson title name
        let cleanName = activeFileName.replace('.csv', '').replace(/^[0-9]+_/, '').replace(/_/g, ' ');
        cleanName = cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        previewTitle.textContent = cleanName;

        // Highlight correct answers
        let previewHtml = currentStoryText.replace(/\[([^\]]+)\]/g, '<span class="preview-highlight">$1</span>');

        // Populate preview container
        previewTextContainer.innerHTML = previewHtml.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');

        // Render Story Paging Buttons
        const metadata = STORIES_METADATA[activeFileName] || STORIES_METADATA['default'];
        const numStories = metadata[activeDifficulty] || 1;

        storySelectorButtons.innerHTML = '';
        if (numStories > 1) {
            storySelectorContainer.classList.remove('hidden');
            for (let i = 1; i <= numStories; i++) {
                const btn = document.createElement('button');
                btn.className = `story-select-btn${i === activeStoryIndex ? ' active' : ''}`;
                btn.textContent = i;
                btn.addEventListener('click', () => {
                    loadStory(activeDifficulty, i);
                });
                storySelectorButtons.appendChild(btn);
            }
        } else {
            storySelectorContainer.classList.add('hidden');
        }

        switchView('preview');
    }

    // --- Render Story and Chips ---
    function renderStoryQuiz() {
        // Check Superman Mode
        if (supermanToggle.checked) {
            wordbankSection.classList.add('hidden');
        } else {
            wordbankSection.classList.remove('hidden');
        }

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
            
            chip.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent document click listener from deselecting
                
                // If there's an active selected input, fill it
                if (selectedInput && !selectedInput.disabled) {
                    selectedInput.value = word;
                    selectedInput.dispatchEvent(new Event('input'));
                    selectedInput.classList.remove('selected');
                    selectedInput = null;
                    return;
                }
                
                // Otherwise, toggle active state on this chip
                const alreadyActive = chip.classList.contains('active');
                document.querySelectorAll('.wordbank-chip').forEach(c => c.classList.remove('active'));
                
                if (!alreadyActive) {
                    chip.classList.add('active');
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
            
            if (supermanToggle.checked) {
                storyHtml += `<button class="pronounce-btn" data-word="${answerWord}" title="Hear pronunciation">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                </button>`;
            }
            
            inputsCount++;
            lastIdx = bracketsRegex.lastIndex;
        }
        storyHtml += currentStoryText.substring(lastIdx);

        // Populate story area
        storyTextContainer.innerHTML = storyHtml.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');

        // Bind input listeners to toggle chip styles dynamically and handle click-to-fill
        document.querySelectorAll('.cloze-input').forEach(input => {
            input.addEventListener('input', updateChipStatus);
            input.addEventListener('change', updateChipStatus);
            
            input.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent document click listener from deselecting
                
                // Clear any other selected input styles
                document.querySelectorAll('.cloze-input').forEach(inp => inp.classList.remove('selected'));
                
                // Set this input as selected
                selectedInput = input;
                input.classList.add('selected');
                
                // Find if there is an active chip selected
                const activeChip = document.querySelector('.wordbank-chip.active');
                if (activeChip) {
                    e.preventDefault(); // prevent keyboard popup if mobile/tablet
                    input.value = activeChip.dataset.word;
                    input.dispatchEvent(new Event('input'));
                    activeChip.classList.remove('active');
                    
                    // Clear selected input state
                    input.classList.remove('selected');
                    selectedInput = null;
                }
            });
        });

        // Bind pronounce buttons
        document.querySelectorAll('.pronounce-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const word = btn.dataset.word;
                pronounceWord(word);
            });
        });

        // Initialize state
        submitQuizBtn.classList.remove('hidden');
        if (gameResultsCard) gameResultsCard.classList.add('hidden');
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
                input.style.width = Math.max(110, input.value.length * 13 + 24) + 'px';
            } else {
                input.classList.add('incorrect');
                input.classList.remove('correct');
                input.disabled = true;
                input.value = `${userAns || '(Empty)'} (✗ -> ${input.dataset.answer})`;
                input.style.width = Math.max(160, input.value.length * 13 + 30) + 'px';
            }
            input.title = input.value;
        });

        // Hide Check Answers button and display inline results summary right below the story
        submitQuizBtn.classList.add('hidden');
        const percent = Math.round((score / inputs.length) * 100);
        finalScoreText.textContent = `${percent}%`;
        summaryText.innerHTML = `You completed the story filling quest!<br>Correctly filled <strong>${score}</strong> out of <strong>${inputs.length}</strong> blank spaces.`;
        if (gameResultsCard) {
            gameResultsCard.classList.remove('hidden');
            gameResultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
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



    // --- Action Controllers ---
    submitQuizBtn.addEventListener('click', submitQuiz);
    
    exitGameBtn.addEventListener('click', () => {
        switchView('menu');
    });

    retryStoryBtn.addEventListener('click', () => {
        renderStoryPreview();
    });

    menuBtn.addEventListener('click', () => {
        switchView('menu');
    });

    startGameBtn.addEventListener('click', () => {
        renderStoryQuiz();
    });

    exitPreviewBtn.addEventListener('click', () => {
        switchView('menu');
    });

    // --- Difficulty Selector Controller ---
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const difficulty = btn.dataset.difficulty;
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            loadStory(difficulty, 1);
        });
    });
});
