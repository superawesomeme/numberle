window.tailwind = window.tailwind || {};
window.tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Helvetica', 'sans-serif'],
                    },
                    colors: {
                        glass: {
                            100: 'rgba(255, 255, 255, 0.1)',
                            200: 'rgba(255, 255, 255, 0.2)',
                            300: 'rgba(255, 255, 255, 0.3)',
                            border: 'rgba(255, 255, 255, 0.15)',
                        },
                        game: {
                            correct: '#10b981', // Emerald 500
                            wrongLocation: '#f59e0b', // Amber 500
                            wrong: '#374151', // Gray 700
                        }
                    }
                }
            }
        }

// --- Run game code after the page has loaded ---
document.addEventListener("DOMContentLoaded", () => {
// --- Game Setup & State ---
        // Generate random 5 digit number between 10000 and 99999
        let targetWord = Math.floor(Math.random() * (99999 - 10000) + 10000).toString();
        // UNCOMMENT FOR DEBUGGING: console.log("Target Number:", targetWord);

        const keyboard = document.querySelector("[data-keyboard]");
        const alertContainer = document.querySelector("[data-alert-container]");
        const guessGrid = document.querySelector("[data-guess-grid]");
        const instructionsPanel = document.getElementById("instructions-panel");

        const WORD_LENGTH = 5;
        const FLIP_ANIMATION_DURATION = 500;
        const DANCE_ANIMATION_DURATION = 500;
        let isInteractionDisabled = false;

        // Start listening immediately
        startInteraction();

        // --- Instructions Modal Toggle (Mobile) ---
        window.toggleInstructions = function toggleInstructions() {
            if (instructionsPanel.classList.contains('hidden')) {
                instructionsPanel.classList.remove('hidden');
                instructionsPanel.classList.add('fixed', 'inset-0', 'z-50', 'm-4', 'overflow-y-auto');
                // Dim background
                const overlay = document.createElement('div');
                overlay.id = 'modal-overlay';
                overlay.classList.add('fixed', 'inset-0', 'bg-black/50', 'z-40', 'backdrop-blur-sm');
                document.body.appendChild(overlay);
            } else {
                instructionsPanel.classList.add('hidden');
                instructionsPanel.classList.remove('fixed', 'inset-0', 'z-50', 'm-4', 'overflow-y-auto');
                const overlay = document.getElementById('modal-overlay');
                if (overlay) overlay.remove();
            }
        }

        // --- Input Handling ---
        function startInteraction() {
            document.addEventListener("click", handleClick);
            document.addEventListener("keydown", handleKeyPress);
            isInteractionDisabled = false;
        }

        function stopInteraction() {
            document.removeEventListener("click", handleClick);
            document.removeEventListener("keydown", handleKeyPress);
            isInteractionDisabled = true;
        }

        function handleClick(event) {
            // Find closest element with data attributes in case of nested spans/svgs
            const target = event.target.closest('button');
            if (!target) return;

            if (target.matches("[data-key]")) {
                pressKey(target.dataset.key);
                return;
            }
            if (target.matches("[data-enter]")) {
                submitGuess();
                return;
            }
            if (target.matches("[data-delete]")) {
                deleteKey();
                return;
            }
            if (target.matches("[data-reset]")) {
                window.location.reload();
                return;
            }
        }

        function handleKeyPress(event) {
            if (isInteractionDisabled) return;

            if (event.key === "Enter") {
                submitGuess();
                return;
            }
            if (event.key === "Backspace" || event.key === "Delete") {
                deleteKey();
                return;
            }
            // Match numbers only
            if (event.key.match(/^[0-9]$/)) {
                pressKey(event.key);
                return;
            }
        }

        // --- Game Actions ---
        function pressKey(key) {
            const activeTiles = getActiveTiles();
            if (activeTiles.length >= WORD_LENGTH) return;
            
            // Find first empty tile
            const nextTile = guessGrid.querySelector(":not([data-letter])");
            if (!nextTile) return;

            nextTile.dataset.letter = key;
            nextTile.textContent = key;
            nextTile.dataset.state = "active";
        }

        function deleteKey() {
            const activeTiles = getActiveTiles();
            const lastTile = activeTiles[activeTiles.length - 1];
            if (!lastTile) return;

            lastTile.textContent = "";
            delete lastTile.dataset.state;
            delete lastTile.dataset.letter;
        }

        function getActiveTiles() {
            return guessGrid.querySelectorAll('[data-state="active"]');
        }

        function submitGuess() {
            const activeTiles = [...getActiveTiles()];
            if (activeTiles.length !== WORD_LENGTH) {
                showAlert("Not long enough");
                shakeTiles(activeTiles);
                return;
            }

            const guess = activeTiles.reduce((word, tile) => word + tile.dataset.letter, "");
            
            // Check constraints (must be 10000 - 99999 based on rules)
            if (parseInt(guess) < 10000) {
                showAlert("Must be at least 10000");
                shakeTiles(activeTiles);
                return;
            }

            stopInteraction();
            const flips = mapTiles(guess);
            
            // Flip tiles sequentially
            activeTiles.forEach((tile, index) => {
                flipTile(tile, index, activeTiles, guess, flips);
            });
        }

        // Accurate Wordle logic for duplicate letters/numbers
        function mapTiles(guess) {
            const targetMap = [...targetWord].reduce((res, char) => {
                res[char] = (res[char] || 0) + 1;
                return res;
            }, {});
            
            let map2 = "";
            // First pass: Find exact matches (Correct/Green)
            for (let i = 0; i < guess.length; i++) {
                const c = guess.charAt(i);
                if (c === targetWord.charAt(i)) {
                    map2 += "c";
                    targetMap[c] -= 1;
                } else {
                    map2 += "i"; // Initial incorrect placeholder
                }
            }

            let finalMap = "";
            // Second pass: Find wrong location matches (Yellow)
            for (let i = 0; i < map2.length; i++) {
                let status = map2.charAt(i);
                if (status === 'i') {
                    const c = guess.charAt(i);
                    if (targetMap[c] && targetMap[c] > 0) {
                        targetMap[c] -= 1;
                        status = 'p'; // Present / wrong location
                    } else {
                        status = 'w'; // Wrong completely
                    }
                }
                finalMap += status;
            }
            return finalMap;
        }

        // --- Animations & Feedback ---
        function flipTile(tile, index, array, guess, flips) {
            const letter = tile.dataset.letter;
            const key = keyboard.querySelector(`[data-key="${letter}"]`);
            const statusChar = flips.charAt(index);

            setTimeout(() => {
                tile.classList.add("flip");
            }, (index * FLIP_ANIMATION_DURATION) / 2);

            tile.addEventListener("animationend", () => {
                tile.classList.remove("flip");
                
                // Set tile states based on evaluation map
                if (statusChar === 'c') {
                    tile.dataset.state = "correct";
                    updateKeyClass(key, "correct");
                } else if (statusChar === 'p') {
                    tile.dataset.state = "wrong-location";
                    updateKeyClass(key, "wrong-location");
                } else {
                    tile.dataset.state = "wrong";
                    updateKeyClass(key, "wrong");
                }

                // If last tile has flipped, check win/loss state
                if (index === array.length - 1) {
                    checkWinLose(guess, array);
                }
            }, { once: true });
        }

        function updateKeyClass(keyElement, newClass) {
            if (!keyElement) return;
            // Prevent downgrading a correct key to a wrong-location or wrong key
            const currentClasses = keyElement.classList;
            if (currentClasses.contains("correct")) return;
            if (currentClasses.contains("wrong-location") && newClass === "wrong") return;
            
            keyElement.classList.add(newClass);
        }

        function checkWinLose(guess, tiles) {
            if (guess === targetWord) {
                showAlert(`Genius! The number was ${targetWord}`, null);
                danceTiles(tiles);
                return; // Interaction remains disabled
            }

            const remainingTiles = guessGrid.querySelectorAll(":not([data-letter])");
            if (remainingTiles.length === 0) {
                showAlert(`Game Over! The number was ${targetWord}`, null);
                return; // Interaction remains disabled
            }
            
            // Resume interaction for next guess
            startInteraction();
        }

        function showAlert(message, duration = 2000) {
            const alert = document.createElement("div");
            alert.textContent = message;
            alert.classList.add("alert");
            alertContainer.prepend(alert);

            if (duration !== null) {
                setTimeout(() => {
                    alert.classList.add("hide");
                    alert.addEventListener("transitionend", () => alert.remove(), { once: true });
                }, duration);
            }
        }

        function shakeTiles(tiles) {
            tiles.forEach(tile => {
                tile.classList.add("shake");
                tile.addEventListener("animationend", () => {
                    tile.classList.remove("shake");
                }, { once: true });
            });
        }

        function danceTiles(tiles) {
            tiles.forEach((tile, index) => {
                setTimeout(() => {
                    tile.classList.add("dance");
                    tile.addEventListener("animationend", () => {
                        tile.classList.remove("dance");
                    }, { once: true });
                }, (index * DANCE_ANIMATION_DURATION) / 5);
            });
        }
});
