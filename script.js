document.addEventListener('DOMContentLoaded', function () {

    let score = 0;
    let startTime = null;
    let timerInterval = null;


    // Game state
    let deck = [];
    let waste = [];
    let foundations = [[], [], [], []];
    let tableaus = [[], [], [], [], [], [], []];
    let draggedCards = [];
    let dragSource = null;
    let moveHistory = [];

    // Animation state tracking
    let animationInProgress = false;
    let animationQueue = [];


    // Variables to track hint highlighting
    let hintTimeout = null;
    let hintElements = [];


    // Card suits and values
    const suits = ['♥', '♦', '♣', '♠'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    // Initialize game
    function initGame() {
        // Clear previous game state
        deck = [];
        waste = [];
        foundations = [[], [], [], []];
        tableaus = [[], [], [], [], [], [], []];
        moveHistory = [];

        // Create deck
        for (let suit of suits) {
            for (let i = 0; i < values.length; i++) {
                deck.push({
                    suit: suit,
                    value: values[i],
                    numValue: i + 1,
                    color: (suit === '♥' || suit === '♦') ? 'red' : 'black',
                    faceUp: false
                });
            }
        }

        // Shuffle deck
        shuffle(deck);

        // Deal cards to tableaus
        for (let i = 0; i < 7; i++) {
            for (let j = i; j < 7; j++) {
                const card = deck.pop();
                if (i === j) {
                    card.faceUp = true;
                }
                tableaus[j].push(card);
            }
        }

        // Reset score and timer
        score = 0;
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        startTime = new Date();
        timerInterval = setInterval(updateTimer, 1000);

        updateScore();
        updateTimer();


        // Render game
        renderGame();
    }

    // Update score display
    function updateScore() {
        const scoreElement = document.getElementById('score');
        scoreElement.textContent = `Score: ${score}`;
    }


    // Update timer display
    function updateTimer() {
        const timerElement = document.getElementById('timer');
        const elapsedSeconds = Math.floor((new Date() - startTime) / 1000);
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        timerElement.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Shuffle array (Fisher-Yates algorithm)
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Modify renderGame to handle card flipping animations
    function renderGame() {
        // Store references to cards that need to be flipped
        const cardsToFlip = [];

        // Render deck
        const deckElement = document.getElementById('deck');
        deckElement.innerHTML = '';
        if (deck.length > 0) {
            const cardElement = createCardElement(null, true);
            deckElement.appendChild(cardElement);
        }

        // Render waste
        const wasteElement = document.getElementById('waste');
        wasteElement.innerHTML = '';
        if (waste.length > 0) {
            const topCard = waste[waste.length - 1];
            const cardElement = createCardElement(topCard, false);
            wasteElement.appendChild(cardElement);
        }

        // Render foundations
        for (let i = 0; i < 4; i++) {
            const foundationElement = document.getElementById(`foundation-${i}`);
            foundationElement.innerHTML = '';
            if (foundations[i].length > 0) {
                const topCard = foundations[i][foundations[i].length - 1];
                const cardElement = createCardElement(topCard, false);
                foundationElement.appendChild(cardElement);
            }
        }

        // Render tableaus
        for (let i = 0; i < 7; i++) {
            const tableauElement = document.getElementById(`tableau-${i}`);
            tableauElement.innerHTML = '';
            for (let j = 0; j < tableaus[i].length; j++) {
                const card = tableaus[i][j];
                const cardElement = createCardElement(card, !card.faceUp);
                cardElement.style.top = `${j * 30}px`;
                tableauElement.appendChild(cardElement);

                // Check if this card was just flipped
                if (moveHistory.length > 0) {
                    const lastMove = moveHistory[moveHistory.length - 1];
                    if (lastMove.flippedCard &&
                        lastMove.flippedCard.suit === card.suit &&
                        lastMove.flippedCard.value === card.value) {
                        cardsToFlip.push(cardElement);
                    }
                }
            }
        }

        // Add event listeners
        addEventListeners();

        // Apply flip animations after a short delay
        setTimeout(() => {
            cardsToFlip.forEach(cardElement => {
                animateCardFlip(cardElement);
            });
        }, 50);
    }

    // Function to animate a card moving from one position to another
    function animateCardMove(card, fromElement, toElement, onComplete) {
        // If animation is already in progress, queue this one
        if (animationInProgress) {
            animationQueue.push(() => animateCardMove(card, fromElement, toElement, onComplete));
            return;
        }

        animationInProgress = true;

        // Get positions
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();

        // Create a temporary card element for animation
        const tempCard = createCardElement(card, false);
        tempCard.classList.add('animating');
        document.body.appendChild(tempCard);

        // Position at start
        tempCard.style.position = 'fixed';
        tempCard.style.top = `${fromRect.top}px`;
        tempCard.style.left = `${fromRect.left}px`;
        tempCard.style.width = `${fromRect.width}px`;
        tempCard.style.height = `${fromRect.height}px`;
        tempCard.style.zIndex = '10000';

        // Force reflow
        tempCard.offsetHeight;

        // Animate to destination
        tempCard.style.transition = 'all 0.3s ease-out';
        tempCard.style.top = `${toRect.top}px`;
        tempCard.style.left = `${toRect.left}px`;

        // Listen for animation end
        tempCard.addEventListener('transitionend', function handler() {
            tempCard.removeEventListener('transitionend', handler);
            document.body.removeChild(tempCard);

            // Execute callback
            if (onComplete) onComplete();

            // Process next animation in queue
            animationInProgress = false;
            if (animationQueue.length > 0) {
                const nextAnimation = animationQueue.shift();
                nextAnimation();
            }
        });
    }

    // Function to animate card flipping
    function animateCardFlip(cardElement, onComplete) {
        cardElement.classList.add('flipping');

        setTimeout(() => {
            if (onComplete) onComplete();
            cardElement.classList.remove('flipping');
        }, 600);
    }


    // Create card element
    function createCardElement(card, faceDown) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';

        if (faceDown) {
            cardElement.classList.add('facedown');
        } else if (card) {
            cardElement.classList.add(card.color);
            cardElement.dataset.suit = card.suit;
            cardElement.dataset.value = card.value;
            cardElement.dataset.numValue = card.numValue;

            const cardContent = document.createElement('div');
            cardContent.className = 'card-content';

            const valueElement = document.createElement('div');
            valueElement.className = 'card-value';
            valueElement.textContent = card.value;

            const suitElement = document.createElement('div');
            suitElement.className = 'card-suit';
            suitElement.textContent = card.suit;

            cardContent.appendChild(valueElement);
            cardContent.appendChild(suitElement);
            cardElement.appendChild(cardContent);
        }

        return cardElement;
    }

    // Add event listeners
    function addEventListeners() {
        // Deck click event
        const deckElement = document.getElementById('deck');
        deckElement.addEventListener('click', handleDeckClick);

        // Drag and drop events for cards
        const cards = document.querySelectorAll('.card:not(.facedown)');
        cards.forEach(card => {
            card.setAttribute('draggable', 'true');
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
            card.addEventListener('dblclick', handleDoubleClick);
        });

        // Drop targets
        const dropTargets = document.querySelectorAll('.tableau, .foundation');
        dropTargets.forEach(target => {
            target.addEventListener('dragover', handleDragOver);
            target.addEventListener('dragenter', handleDragEnter);
            target.addEventListener('dragleave', handleDragLeave);
            target.addEventListener('drop', handleDrop);
        });

        // New game button
        document.getElementById('new-game').addEventListener('click', initGame);

        // Undo button
        document.getElementById('undo').addEventListener('click', undoMove);

        // Autocomplete Button
        document.getElementById('auto-complete').addEventListener('click', autoComplete);

        // Add event listener for the hint button
        document.getElementById('hint').addEventListener('click', showHint);


        // Double-click event for auto-move to foundation
        // const cards = document.querySelectorAll('.card:not(.facedown)');
        cards.forEach(card => {
            card.addEventListener('dblclick', handleDoubleClick);
        });
    }

    // Function to show a hint
    function showHint() {
        // Clear any existing hint
        clearHint();

        // Find a valid move
        const hintMove = findHintMove();

        if (hintMove) {
            // Highlight the suggested move
            highlightHintMove(hintMove);
        } else {
            // No valid moves found
            checkIfGameIsWinnable();
        }
    }

    // Function to find a valid move
    function findHintMove() {
        // Check moves from waste to foundation
        if (waste.length > 0) {
            const card = waste[waste.length - 1];
            for (let i = 0; i < 4; i++) {
                const foundation = foundations[i];
                if (foundation.length === 0 && card.value === 'A') {
                    return { from: 'waste', cards: [card], to: 'foundation', index: i };
                } else if (foundation.length > 0) {
                    const topCard = foundation[foundation.length - 1];
                    if (card.suit === topCard.suit && card.numValue === topCard.numValue + 1) {
                        return { from: 'waste', cards: [card], to: 'foundation', index: i };
                    }
                }
            }
        }

        // Check moves from tableau to foundation
        for (let i = 0; i < 7; i++) {
            if (tableaus[i].length > 0) {
                const card = tableaus[i][tableaus[i].length - 1];
                if (card.faceUp) {
                    for (let j = 0; j < 4; j++) {
                        const foundation = foundations[j];
                        if (foundation.length === 0 && card.value === 'A') {
                            return { from: `tableau-${i}`, cards: [card], to: 'foundation', index: j };
                        } else if (foundation.length > 0) {
                            const topCard = foundation[foundation.length - 1];
                            if (card.suit === topCard.suit && card.numValue === topCard.numValue + 1) {
                                return { from: `tableau-${i}`, cards: [card], to: 'foundation', index: j };
                            }
                        }
                    }
                }
            }
        }

        // Check moves from tableau to tableau
        for (let i = 0; i < 7; i++) {
            const tableau = tableaus[i];
            for (let cardIndex = 0; cardIndex < tableau.length; cardIndex++) {
                const card = tableau[cardIndex];
                if (!card.faceUp) continue;

                const cardsToMove = tableau.slice(cardIndex);

                // Check if cardsToMove are in valid sequence
                let validSequence = true;
                for (let k = 0; k < cardsToMove.length - 1; k++) {
                    if (cardsToMove[k].color === cardsToMove[k + 1].color ||
                        cardsToMove[k].numValue !== cardsToMove[k + 1].numValue + 1) {
                        validSequence = false;
                        break;
                    }
                }

                if (!validSequence) continue;

                for (let j = 0; j < 7; j++) {
                    if (i === j) continue;

                    if (tableaus[j].length === 0) {
                        if (cardsToMove[0].value === 'K') {
                            return { from: `tableau-${i}`, cards: cardsToMove, to: 'tableau', index: j };
                        }
                    } else {
                        const topCard = tableaus[j][tableaus[j].length - 1];
                        if (topCard.faceUp &&
                            cardsToMove[0].color !== topCard.color &&
                            cardsToMove[0].numValue === topCard.numValue - 1) {
                            return { from: `tableau-${i}`, cards: cardsToMove, to: 'tableau', index: j };
                        }
                    }
                }
            }
        }

        // Check moves from waste to tableau
        if (waste.length > 0) {
            const card = waste[waste.length - 1];
            for (let j = 0; j < 7; j++) {
                if (tableaus[j].length === 0) {
                    if (card.value === 'K') {
                        return { from: 'waste', cards: [card], to: 'tableau', index: j };
                    }
                } else {
                    const topCard = tableaus[j][tableaus[j].length - 1];
                    if (topCard.faceUp &&
                        card.color !== topCard.color &&
                        card.numValue === topCard.numValue - 1) {
                        return { from: 'waste', cards: [card], to: 'tableau', index: j };
                    }
                }
            }
        }

        return null;
    }

    // Function to highlight a hint move
    function highlightHintMove(hintMove) {
        // Add CSS for hint highlighting
        const style = document.createElement('style');
        style.textContent = `
        .hint-source { 
            box-shadow: 0 0 10px 3px gold !important; 
            animation: pulse 1.5s infinite;
        }
        .hint-target { 
            box-shadow: 0 0 10px 3px limegreen !important;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% { box-shadow: 0 0 10px 3px rgba(255, 215, 0, 0.7); }
            50% { box-shadow: 0 0 15px 5px rgba(255, 215, 0, 1); }
            100% { box-shadow: 0 0 10px 3px rgba(255, 215, 0, 0.7); }
        }
    `;
        document.head.appendChild(style);
        hintElements.push(style);

        // Highlight source
        let sourceElement;
        if (hintMove.from === 'waste') {
            sourceElement = document.querySelector('#waste .card:last-child');
        } else if (hintMove.from.startsWith('tableau')) {
            const tableauIndex = hintMove.from.split('-')[1];
            const tableauElement = document.getElementById(`tableau-${tableauIndex}`);
            const startIndex = tableaus[tableauIndex].length - hintMove.cards.length;
            sourceElement = tableauElement.children[startIndex];
        } else if (hintMove.from.startsWith('foundation')) {
            const foundationIndex = hintMove.from.split('-')[1];
            sourceElement = document.querySelector(`#foundation-${foundationIndex} .card:last-child`);
        }

        if (sourceElement) {
            sourceElement.classList.add('hint-source');
            hintElements.push(sourceElement);
        }

        // Highlight target
        let targetElement;
        if (hintMove.to === 'foundation') {
            targetElement = document.getElementById(`foundation-${hintMove.index}`);
        } else if (hintMove.to === 'tableau') {
            targetElement = document.getElementById(`tableau-${hintMove.index}`);
        }

        if (targetElement) {
            targetElement.classList.add('hint-target');
            hintElements.push(targetElement);
        }

        // Clear hint after 3 seconds
        hintTimeout = setTimeout(clearHint, 3000);
    }

    // Function to clear hint highlighting
    function clearHint() {
        if (hintTimeout) {
            clearTimeout(hintTimeout);
            hintTimeout = null;
        }

        hintElements.forEach(element => {
            if (element.tagName === 'STYLE') {
                document.head.removeChild(element);
            } else {
                element.classList.remove('hint-source');
                element.classList.remove('hint-target');
            }
        });

        hintElements = [];
    }



    // Auto-complete function
    function autoComplete() {
        document.querySelector('.game-container').classList.add('auto-completing');

        setTimeout(() => {
            autoCompleteStep();
        }, 300);
    }

    // Process one step of auto-complete at a time
    function autoCompleteStep() {
        let moveFound = false;

        // Try to move from tableaus to foundations
        for (let i = 0; i < 7; i++) {
            if (tableaus[i].length > 0) {
                const card = tableaus[i][tableaus[i].length - 1];
                if (card.faceUp) {
                    // Try to move to foundation
                    for (let j = 0; j < 4; j++) {
                        const foundation = foundations[j];

                        if (foundation.length === 0) {
                            // Empty foundation - only accept Ace
                            if (card.value === 'A') {
                                const sourceElement = document.querySelector(`#tableau-${i} .card:last-child`);
                                const targetElement = document.getElementById(`foundation-${j}`);

                                // Animate the move
                                animateCardMove(card, sourceElement, targetElement, () => {
                                    moveCardToFoundation(card, 'tableau', i, tableaus[i].length - 1, j);
                                    renderGame();

                                    // Continue with next step after a delay
                                    setTimeout(() => {
                                        autoCompleteStep();
                                    }, 300);
                                });

                                moveFound = true;
                                return;
                            }
                        } else {
                            // Check if card can be placed on foundation
                            const topCard = foundation[foundation.length - 1];
                            if (card.suit === topCard.suit && card.numValue === topCard.numValue + 1) {
                                const sourceElement = document.querySelector(`#tableau-${i} .card:last-child`);
                                const targetElement = document.getElementById(`foundation-${j}`);

                                // Animate the move
                                animateCardMove(card, sourceElement, targetElement, () => {
                                    moveCardToFoundation(card, 'tableau', i, tableaus[i].length - 1, j);
                                    renderGame();

                                    // Continue with next step after a delay
                                    setTimeout(() => {
                                        autoCompleteStep();
                                    }, 300);
                                });

                                moveFound = true;
                                return;
                            }
                        }
                    }
                }
            }
        }

        // Try to move from waste to foundations
        if (!moveFound && waste.length > 0) {
            const card = waste[waste.length - 1];

            // Try to move to foundation
            for (let j = 0; j < 4; j++) {
                const foundation = foundations[j];

                if (foundation.length === 0) {
                    // Empty foundation - only accept Ace
                    if (card.value === 'A') {
                        const sourceElement = document.querySelector(`#waste .card`);
                        const targetElement = document.getElementById(`foundation-${j}`);

                        // Animate the move
                        animateCardMove(card, sourceElement, targetElement, () => {
                            moveCardToFoundation(card, 'waste', null, null, j);
                            renderGame();

                            // Continue with next step after a delay
                            setTimeout(() => {
                                autoCompleteStep();
                            }, 300);
                        });

                        moveFound = true;
                        return;
                    }
                } else {
                    // Check if card can be placed on foundation
                    const topCard = foundation[foundation.length - 1];
                    if (card.suit === topCard.suit && card.numValue === topCard.numValue + 1) {
                        const sourceElement = document.querySelector(`#waste .card`);
                        const targetElement = document.getElementById(`foundation-${j}`);

                        // Animate the move
                        animateCardMove(card, sourceElement, targetElement, () => {
                            moveCardToFoundation(card, 'waste', null, null, j);
                            renderGame();

                            // Continue with next step after a delay
                            setTimeout(() => {
                                autoCompleteStep();
                            }, 300);
                        });

                        moveFound = true;
                        return;
                    }
                }
            }
        }

        // If no moves were found, we're done
        if (!moveFound) {
            document.querySelector('.game-container').classList.remove('auto-completing');
            checkWinCondition();
        }
    }

    // Handle double-click on cards
    function handleDoubleClick(e) {
        const cardElement = e.target.closest('.card');
        if (!cardElement || cardElement.classList.contains('facedown')) return;

        let sourceType, sourceIndex, cardIndex;

        // Determine the source of the card
        if (cardElement.parentElement.id === 'waste') {
            sourceType = 'waste';
        } else if (cardElement.parentElement.classList.contains('foundation')) {
            sourceType = 'foundation';
            sourceIndex = parseInt(cardElement.parentElement.dataset.foundation);
        } else if (cardElement.parentElement.classList.contains('tableau')) {
            sourceType = 'tableau';
            sourceIndex = parseInt(cardElement.parentElement.dataset.tableau);
            cardIndex = Array.from(cardElement.parentElement.children).indexOf(cardElement);
        } else {
            return; // Unknown source
        }

        // Get the card(s) to move
        let cardsToMove = [];
        if (sourceType === 'waste') {
            if (waste.length === 0) return;
            cardsToMove = [waste[waste.length - 1]];
        } else if (sourceType === 'foundation') {
            if (foundations[sourceIndex].length === 0) return;
            cardsToMove = [foundations[sourceIndex][foundations[sourceIndex].length - 1]];
        } else if (sourceType === 'tableau') {
            if (tableaus[sourceIndex].length === 0 || cardIndex >= tableaus[sourceIndex].length) return;

            // Check if all cards from this index to the end are face up and in sequence
            const tableau = tableaus[sourceIndex];
            const cards = tableau.slice(cardIndex);

            // All cards must be face up
            if (cards.some(card => !card.faceUp)) return;

            // Check if cards are in sequence and alternating colors
            for (let i = 0; i < cards.length - 1; i++) {
                const currentCard = cards[i];
                const nextCard = cards[i + 1];
                if (currentCard.color === nextCard.color || currentCard.numValue !== nextCard.numValue + 1) {
                    return; // Not a valid sequence
                }
            }

            cardsToMove = cards;
        }

        if (cardsToMove.length === 0) return;


        // Try to auto-move the card(s)
        // if (tryAutoMove(cardsToMove, sourceType, sourceIndex, cardIndex)) {
        //     renderGame();
        //     checkWinCondition();
        // }

        // Try to auto-move the card(s) with animation
        tryAutoMoveWithAnimation(cardsToMove, sourceType, sourceIndex, cardIndex);
    }

    // Try to automatically move card(s) to the best destination with animation
    function tryAutoMoveWithAnimation(cards, sourceType, sourceIndex, cardIndex) {
        // If it's a single card, try to move to foundation first
        if (cards.length === 1) {
            const card = cards[0];

            // Try to move to foundation
            for (let i = 0; i < 4; i++) {
                // Skip if source is the same foundation
                if (sourceType === 'foundation' && sourceIndex === i) continue;

                // Check if card can be moved to this foundation
                const foundation = foundations[i];

                if (foundation.length === 0) {
                    // Empty foundation - only accept Ace
                    if (card.value === 'A') {
                        // Get source and target elements
                        const sourceElement = getSourceElement(sourceType, sourceIndex);
                        const targetElement = document.getElementById(`foundation-${i}`);

                        // Animate the move
                        animateCardMove(card, sourceElement, targetElement, () => {
                            // Actually perform the move after animation
                            moveCardToFoundation(card, sourceType, sourceIndex, cardIndex, i);
                            renderGame();
                            checkWinCondition();
                        });

                        return true;
                    }
                } else {
                    // Check if card can be placed on foundation (same suit, next value)
                    const topCard = foundation[foundation.length - 1];
                    if (card.suit === topCard.suit && card.numValue === topCard.numValue + 1) {
                        // Get source and target elements
                        const sourceElement = getSourceElement(sourceType, sourceIndex);
                        const targetElement = document.getElementById(`foundation-${i}`);

                        // Animate the move
                        animateCardMove(card, sourceElement, targetElement, () => {
                            // Actually perform the move after animation
                            moveCardToFoundation(card, sourceType, sourceIndex, cardIndex, i);
                            renderGame();
                            checkWinCondition();
                        });

                        return true;
                    }
                }
            }
        }

        // For any number of cards, try to move to tableau
        // We prioritize moving to empty tableaus for Kings
        if (cards[0].value === 'K') {
            // Find empty tableau
            for (let i = 0; i < 7; i++) {
                // Skip if source is the same tableau
                if (sourceType === 'tableau' && sourceIndex === i) continue;

                if (tableaus[i].length === 0) {
                    // Get source and target elements
                    const sourceElement = getSourceElement(sourceType, sourceIndex);
                    const targetElement = document.getElementById(`tableau-${i}`);

                    // Animate the move
                    animateCardMove(cards[0], sourceElement, targetElement, () => {
                        // Actually perform the move after animation
                        moveCardsToTableau(cards, sourceType, sourceIndex, cardIndex, i);
                        renderGame();
                    });

                    return true;
                }
            }
        }

        // Try to move to any valid tableau
        for (let i = 0; i < 7; i++) {
            // Skip if source is the same tableau
            if (sourceType === 'tableau' && sourceIndex === i) continue;

            const tableau = tableaus[i];
            if (tableau.length > 0) {
                const topCard = tableau[tableau.length - 1];

                // Check if cards can be placed on tableau (alternate color, previous value)
                if (cards[0].color !== topCard.color && cards[0].numValue === topCard.numValue - 1) {
                    // Get source and target elements
                    const sourceElement = getSourceElement(sourceType, sourceIndex);
                    const targetElement = document.getElementById(`tableau-${i}`);

                    // Animate the move
                    animateCardMove(cards[0], sourceElement, targetElement, () => {
                        // Actually perform the move after animation
                        moveCardsToTableau(cards, sourceType, sourceIndex, cardIndex, i);
                        renderGame();
                    });

                    return true;
                }
            }
        }

        return false; // No valid move found
    }

    // Helper function to get the source element
    function getSourceElement(sourceType, sourceIndex) {
        if (sourceType === 'waste') {
            return document.querySelector('#waste .card');
        } else if (sourceType === 'foundation') {
            return document.querySelector(`#foundation-${sourceIndex} .card`);
        } else if (sourceType === 'tableau') {
            return document.querySelector(`#tableau-${sourceIndex} .card:last-child`);
        }
        return null;
    }

    // Try to automatically move card(s) to the best destination
    function tryAutoMove(cards, sourceType, sourceIndex, cardIndex) {
        // If it's a single card, try to move to foundation first
        if (cards.length === 1) {
            const card = cards[0];

            // Try to move to foundation
            for (let i = 0; i < 4; i++) {
                // Skip if source is the same foundation
                if (sourceType === 'foundation' && sourceIndex === i) continue;

                // Check if card can be moved to this foundation
                const foundation = foundations[i];

                if (foundation.length === 0) {
                    // Empty foundation - only accept Ace
                    if (card.value === 'A') {
                        // Move the card
                        moveCardToFoundation(card, sourceType, sourceIndex, cardIndex, i);
                        return true;
                    }
                } else {
                    // Check if card can be placed on foundation (same suit, next value)
                    const topCard = foundation[foundation.length - 1];
                    if (card.suit === topCard.suit && card.numValue === topCard.numValue + 1) {
                        // Move the card
                        moveCardToFoundation(card, sourceType, sourceIndex, cardIndex, i);
                        return true;
                    }
                }
            }
        }

        // For any number of cards, try to move to tableau
        // We prioritize moving to empty tableaus for Kings
        if (cards[0].value === 'K') {
            // Find empty tableau
            for (let i = 0; i < 7; i++) {
                // Skip if source is the same tableau
                if (sourceType === 'tableau' && sourceIndex === i) continue;

                if (tableaus[i].length === 0) {
                    // Move the cards
                    moveCardsToTableau(cards, sourceType, sourceIndex, cardIndex, i);
                    return true;
                }
            }
        }

        // Try to move to any valid tableau
        for (let i = 0; i < 7; i++) {
            // Skip if source is the same tableau
            if (sourceType === 'tableau' && sourceIndex === i) continue;

            const tableau = tableaus[i];
            if (tableau.length > 0) {
                const topCard = tableau[tableau.length - 1];

                // Check if cards can be placed on tableau (alternate color, previous value)
                if (cards[0].color !== topCard.color && cards[0].numValue === topCard.numValue - 1) {
                    // Move the cards
                    moveCardsToTableau(cards, sourceType, sourceIndex, cardIndex, i);
                    return true;
                }
            }
        }

        return false; // No valid move found
    }

    // Helper function to move a single card to a foundation
    function moveCardToFoundation(card, sourceType, sourceIndex, cardIndex, foundationIndex) {
        // Save move for undo
        const moveData = {
            type: 'move',
            cards: [card],
            source: sourceType === 'tableau' ? `tableau-${sourceIndex}` :
                sourceType === 'foundation' ? `foundation-${sourceIndex}` : 'waste',
            targetType: 'foundation',
            targetIndex: foundationIndex
        };

        // Remove card from source
        if (sourceType === 'waste') {
            waste.pop();
        } else if (sourceType === 'foundation') {
            foundations[sourceIndex].pop();
        } else if (sourceType === 'tableau') {
            tableaus[sourceIndex].splice(tableaus[sourceIndex].length - 1);

            // Flip the new top card if it's face down
            if (tableaus[sourceIndex].length > 0 && !tableaus[sourceIndex][tableaus[sourceIndex].length - 1].faceUp) {
                tableaus[sourceIndex][tableaus[sourceIndex].length - 1].faceUp = true;
                moveData.flippedCard = tableaus[sourceIndex][tableaus[sourceIndex].length - 1];
            }
        }

        // Add card to foundation
        foundations[foundationIndex].push(card);

        // Update score
        score += 10; // Points for moving to foundation
        if (moveData.flippedCard) {
            score += 5; // Points for revealing a new card
        }
        if (sourceType === 'waste') {
            score += 5; // Points for using card from waste
        }

        updateScore();
        moveHistory.push(moveData);
    }

    // Helper function to move cards to a tableau
    function moveCardsToTableau(cards, sourceType, sourceIndex, cardIndex, tableauIndex) {
        // Save move for undo
        const moveData = {
            type: 'move',
            cards: [...cards],
            source: sourceType === 'tableau' ? `tableau-${sourceIndex}` :
                sourceType === 'foundation' ? `foundation-${sourceIndex}` : 'waste',
            targetType: 'tableau',
            targetIndex: tableauIndex
        };

        // Remove cards from source
        if (sourceType === 'waste') {
            waste.pop();
        } else if (sourceType === 'foundation') {
            foundations[sourceIndex].pop();
        } else if (sourceType === 'tableau') {
            tableaus[sourceIndex].splice(cardIndex);

            // Flip the new top card if it's face down
            if (tableaus[sourceIndex].length > 0 && !tableaus[sourceIndex][tableaus[sourceIndex].length - 1].faceUp) {
                tableaus[sourceIndex][tableaus[sourceIndex].length - 1].faceUp = true;
                moveData.flippedCard = tableaus[sourceIndex][tableaus[sourceIndex].length - 1];
            }
        }

        // Add cards to tableau
        tableaus[tableauIndex].push(...cards);

        // Update score
        if (sourceType === 'foundation') {
            score -= 5; // Penalty for moving from foundation to tableau
        } else if (sourceType === 'waste') {
            score += 5; // Points for using card from waste
        }

        if (moveData.flippedCard) {
            score += 5; // Points for revealing a new card
        }

        updateScore();
        moveHistory.push(moveData);
    }


    // Handle deck click
    function handleDeckClick() {
        if (deck.length === 0) {
            // Reset deck from waste
            moveHistory.push({
                type: 'reset-deck',
                waste: [...waste]
            });

            deck = waste.reverse();
            waste = [];
            deck.forEach(card => card.faceUp = false);
        } else {
            // Draw card from deck to waste
            const card = deck.pop();
            card.faceUp = true;

            moveHistory.push({
                type: 'draw',
                card: { ...card }
            });

            waste.push(card);
        }

        renderGame();
    }

    // Track mouse position for custom drag visual
    let dragOffsetX, dragOffsetY;

    // Enhance handleDragStart function
    function handleDragStart(e) {
        const cardElement = e.target;
        cardElement.classList.add('dragging');

        // Calculate offset for better drag positioning
        const rect = cardElement.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;

        // Store data about dragged card
        e.dataTransfer.setData('text/plain', '');

        // For better drag image (optional)
        if (e.dataTransfer.setDragImage) {
            const dragImage = cardElement.cloneNode(true);
            dragImage.style.opacity = '0.8';
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, dragOffsetX, dragOffsetY);
            setTimeout(() => {
                document.body.removeChild(dragImage);
            }, 0);
        }

        // Find the source of the drag
        if (cardElement.parentElement.id === 'waste') {
            draggedCards = [waste[waste.length - 1]];
            dragSource = 'waste';
        } else if (cardElement.parentElement.classList.contains('foundation')) {
            const foundationIndex = parseInt(cardElement.parentElement.dataset.foundation);
            draggedCards = [foundations[foundationIndex][foundations[foundationIndex].length - 1]];
            dragSource = `foundation-${foundationIndex}`;
        } else if (cardElement.parentElement.classList.contains('tableau')) {
            const tableauIndex = parseInt(cardElement.parentElement.dataset.tableau);
            const cardIndex = Array.from(cardElement.parentElement.children).indexOf(cardElement);
            draggedCards = tableaus[tableauIndex].slice(cardIndex);
            dragSource = `tableau-${tableauIndex}`;
        }
    }

    // Handle drag end
    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
        draggedCards = [];
        dragSource = null;
    }

    // Handle drag over
    function handleDragOver(e) {
        e.preventDefault();
    }

    // Handle drag enter
    function handleDragEnter(e) {
        e.preventDefault();
        e.currentTarget.classList.add('over');
    }

    // Handle drag leave
    function handleDragLeave(e) {
        e.currentTarget.classList.remove('over');
    }

    // Handle drop
    function handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('over');

        if (draggedCards.length === 0 || !dragSource) return;

        // Determine the drop target
        let targetType, targetIndex;

        if (e.currentTarget.classList.contains('foundation')) {
            targetType = 'foundation';
            targetIndex = parseInt(e.currentTarget.dataset.foundation);
        } else if (e.currentTarget.classList.contains('tableau')) {
            targetType = 'tableau';
            targetIndex = parseInt(e.currentTarget.dataset.tableau);
        }

        // Check if move is valid and perform it
        if (isValidMove(draggedCards, dragSource, targetType, targetIndex)) {
            performMove(draggedCards, dragSource, targetType, targetIndex);
            renderGame();
            checkWinCondition();
        }
    }

    // Check if move is valid
    function isValidMove(cards, source, targetType, targetIndex) {
        const firstCard = cards[0];

        if (targetType === 'foundation') {
            // Only single cards can be moved to foundation
            if (cards.length !== 1) return false;

            const foundation = foundations[targetIndex];

            // If foundation is empty, only Ace can be placed
            if (foundation.length === 0) {
                return firstCard.value === 'A';
            }

            // Check if card can be placed on foundation (same suit, next value)
            const topCard = foundation[foundation.length - 1];
            return firstCard.suit === topCard.suit && firstCard.numValue === topCard.numValue + 1;
        } else if (targetType === 'tableau') {
            const tableau = tableaus[targetIndex];

            // If tableau is empty, only King can be placed
            if (tableau.length === 0) {
                return firstCard.value === 'K';
            }

            // Check if card can be placed on tableau (alternate color, previous value)
            const topCard = tableau[tableau.length - 1];
            return firstCard.color !== topCard.color && firstCard.numValue === topCard.numValue - 1;
        }

        return false;
    }

    // Perform move
    function performMove(cards, source, targetType, targetIndex) {
        // Save current state if it's winnable
        if (isCurrentlyWinnable) {
            saveWinnableState();
        }

        // Save move for undo
        const moveData = {
            type: 'move',
            cards: [...cards],
            source: source,
            targetType: targetType,
            targetIndex: targetIndex
        };

        // Remove cards from source
        if (source === 'waste') {
            waste.pop();
        } else if (source.startsWith('foundation')) {
            const foundationIndex = parseInt(source.split('-')[1]);
            foundations[foundationIndex].pop();
        } else if (source.startsWith('tableau')) {
            const tableauIndex = parseInt(source.split('-')[1]);
            tableaus[tableauIndex].splice(tableaus[tableauIndex].length - cards.length);

            // Flip the new top card if it's face down
            if (tableaus[tableauIndex].length > 0 && !tableaus[tableauIndex][tableaus[tableauIndex].length - 1].faceUp) {
                tableaus[tableauIndex][tableaus[tableauIndex].length - 1].faceUp = true;
                moveData.flippedCard = tableaus[tableauIndex][tableaus[tableauIndex].length - 1];

                // We'll handle the flip animation in renderGame
            }
        }

        // Add cards to target
        if (targetType === 'foundation') {
            foundations[targetIndex].push(cards[0]);
        } else if (targetType === 'tableau') {
            tableaus[targetIndex].push(...cards);
        }

        // Update score based on move type
        if (targetType === 'foundation') {
            score += 10; // Points for moving to foundation
        } else if (source.startsWith('foundation') && targetType === 'tableau') {
            score -= 5; // Penalty for moving from foundation to tableau
        } else if (source === 'waste') {
            score += 5; // Points for using card from waste
        }

        if (moveData.flippedCard) {
            score += 5; // Points for revealing a new card
        }

        updateScore();
        moveHistory.push(moveData);

        // After move, check if game is still winnable
        isCurrentlyWinnable = isGameWinnable();
    }


    // Enhance the checkWinCondition function with animation
    function checkWinCondition() {
        const won = foundations.every(foundation => foundation.length === 13);
        if (won) {
            clearInterval(timerInterval);

            // Create winning animation
            const cards = document.querySelectorAll('.card');
            cards.forEach(card => {
                card.style.transition = 'all 1s';
                setTimeout(() => {
                    card.style.transform = `translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) rotate(${Math.random() * 360}deg)`;
                }, Math.random() * 1000);
            });

            setTimeout(() => {
                alert(`Congratulations! You won!\nScore: ${score}\nTime: ${document.getElementById('timer').textContent.replace('Time: ', '')}`);
            }, 2000);
        }
    }


    // Undo last move
    function undoMove() {
        if (moveHistory.length === 0) return;

        const lastMove = moveHistory.pop();

        if (lastMove.type === 'draw') {
            // Undo draw from deck
            waste.pop();
            deck.push(lastMove.card);
        } else if (lastMove.type === 'reset-deck') {
            // Undo deck reset
            waste = lastMove.waste;
            deck = [];
        } else if (lastMove.type === 'move') {
            // Undo card move
            const cards = lastMove.cards;

            // Remove cards from target
            if (lastMove.targetType === 'foundation') {
                foundations[lastMove.targetIndex].pop();
            } else if (lastMove.targetType === 'tableau') {
                tableaus[lastMove.targetIndex].splice(tableaus[lastMove.targetIndex].length - cards.length);
            }

            // Add cards back to source
            if (lastMove.source === 'waste') {
                waste.push(cards[0]);
            } else if (lastMove.source.startsWith('foundation')) {
                const foundationIndex = parseInt(lastMove.source.split('-')[1]);
                foundations[foundationIndex].push(cards[0]);
            } else if (lastMove.source.startsWith('tableau')) {
                const tableauIndex = parseInt(lastMove.source.split('-')[1]);
                tableaus[tableauIndex].push(...cards);

                // Unflip card if needed
                if (lastMove.flippedCard) {
                    const index = tableaus[tableauIndex].findIndex(card =>
                        card.suit === lastMove.flippedCard.suit &&
                        card.value === lastMove.flippedCard.value
                    );
                    if (index !== -1) {
                        tableaus[tableauIndex][index].faceUp = false;
                    }
                }
            }
        }

        renderGame();
    }

    // Check win condition
    function checkWinCondition() {
        const won = foundations.every(foundation => foundation.length === 13);
        if (won) {
            setTimeout(() => {
                alert('Congratulations! You won!');
            }, 500);
        }
    }

    // Start the game
    initGame();
});
