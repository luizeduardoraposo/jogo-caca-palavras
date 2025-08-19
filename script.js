// Funções utilitárias
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function readWordsFile(callback) {
  fetch('allwords.txt')
    .then(response => response.text())
    .then(text => callback(text.split(/\r?\n/).filter(w => w.length >= 2)))
    .catch(() => callback([]));
}

// Algoritmo para preencher a grade 4x4 com palavras contíguas
function fillBoard(words) {
  const size = 4;
  let board = Array(size).fill().map(() => Array(size).fill(''));
  let usedWords = [];
  let attempts = 0;

  function canPlace(word, path) {
    for (let i = 0; i < word.length; i++) {
      const [x, y] = path[i];
      if (board[x][y] !== '' && board[x][y] !== word[i]) return false;
    }
    return true;
  }

  function placeWord(word, path) {
    for (let i = 0; i < word.length; i++) {
      const [x, y] = path[i];
      board[x][y] = word[i];
    }
  }

  function findPaths(word) {
    // Busca todos caminhos contíguos para a palavra
    let paths = [];
    function dfs(x, y, idx, visited, path) {
      if (idx === word.length) {
        paths.push([...path]);
        return;
      }
      const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size && !visited[nx][ny]) {
          visited[nx][ny] = true;
          path.push([nx, ny]);
          if (board[nx][ny] === '' || board[nx][ny] === word[idx]) {
            dfs(nx, ny, idx + 1, visited, path);
          }
          path.pop();
          visited[nx][ny] = false;
        }
      }
    }
    for (let x = 0; x < size; x++) for (let y = 0; y < size; y++) {
      if (board[x][y] === '' || board[x][y] === word[0]) {
        let visited = Array(size).fill().map(() => Array(size).fill(false));
        visited[x][y] = true;
        dfs(x, y, 1, visited, [[x, y]]);
      }
    }
    return paths;
  }

  function backtrack(idx) {
    if (board.flat().every(cell => cell !== '')) return true;
    if (idx >= words.length) return false;
    let word = words[idx];
    let paths = findPaths(word);
    shuffle(paths);
    for (const path of paths) {
      if (canPlace(word, path)) {
        placeWord(word, path);
        usedWords.push(word);
        if (backtrack(idx + 1)) return true;
        // desfaz
        for (const [x, y] of path) board[x][y] = '';
        usedWords.pop();
      }
    }
    return backtrack(idx + 1);
  }

  shuffle(words);
  while (!backtrack(0)) {
    attempts++;
    shuffle(words);
    board = Array(size).fill().map(() => Array(size).fill(''));
    usedWords = [];
    if (attempts > 1000) break;
  }
  return { board, usedWords };
}

// Renderização do tabuleiro
function renderBoard(board) {
  const boardDiv = document.getElementById('board');
  const cells = boardDiv.querySelectorAll('.cell');
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board.length; j++) {
      const cell = boardDiv.querySelector(`.cell[data-x='${i}'][data-y='${j}']`);
      if (cell) {
        cell.textContent = board[i][j];
        cell.setAttribute('aria-label', `Letra ${board[i][j] || 'vazia'} linha ${i + 1} coluna ${j + 1}`);
      }
    }
  }
}

// Seleção de células
let selecting = false, selectedCells = [], selectedWord = '';
function setupSelection(board, usedWords) {
  const boardDiv = document.getElementById('board');
  boardDiv.onmousedown = e => {
    if (!e.target.classList.contains('cell')) return;
    selecting = true;
    selectedCells = [[+e.target.dataset.x, +e.target.dataset.y]];
    updateSelection();
  };
  boardDiv.onmouseover = e => {
    if (!selecting || !e.target.classList.contains('cell')) return;
    const x = +e.target.dataset.x, y = +e.target.dataset.y;
    const last = selectedCells[selectedCells.length - 1];
    // Permite seleção de células adjacentes em qualquer direção (incluindo diagonal)
    if (Math.abs(x - last[0]) <= 1 && Math.abs(y - last[1]) <= 1 && !(x === last[0] && y === last[1]) && !selectedCells.some(([cx, cy]) => cx === x && cy === y)) {
      selectedCells.push([x, y]);
      updateSelection();
    }
  };
  document.onmouseup = () => {
    if (!selecting) return;
    selecting = false;
    selectedWord = selectedCells.map(([x, y]) => board[x][y]).join('');
    if (usedWords.includes(selectedWord) && !foundWords.includes(selectedWord)) {
      animateFound(selectedCells);
      foundWords.push(selectedWord);
      addFoundWord(selectedWord);
    }
    selectedCells = [];
    updateSelection();
  };
}

function updateSelection() {
  document.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('selected');
  });
  for (const [x, y] of selectedCells) {
    document.querySelector(`.cell[data-x='${x}'][data-y='${y}']`).classList.add('selected');
  }
}

let foundWords = [];
function updateCounter(total, found) {
  document.getElementById('words-counter').textContent = `Palavras: ${found}/${total}`;
}
function addFoundWord(word) {
  const ul = document.getElementById('found-words');
  const li = document.createElement('li');
  li.textContent = word;
  ul.appendChild(li);
  updateCounter(window.usedWordsCount || 0, foundWords.length);
}

function animateFound(cells) {
  for (const [x, y] of cells) {
    const cell = document.querySelector(`.cell[data-x='${x}'][data-y='${y}']`);
    cell.classList.remove('selected'); // Remove seleção antes do flash
    cell.classList.add('found');
    setTimeout(() => cell.classList.remove('found'), 500);
  }
}

// Rotação do tabuleiro
function rotateBoard(board) {
  const size = board.length;
  let newBoard = Array(size).fill().map(() => Array(size).fill(''));
  for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) {
    newBoard[j][size - 1 - i] = board[i][j];
  }
  return newBoard;
}

document.addEventListener('DOMContentLoaded', () => {
  readWordsFile(words => {
    let { board, usedWords } = fillBoard(words);
    window.usedWordsCount = usedWords.length;
    console.log('Palavras adicionadas ao tabuleiro:', usedWords);
    renderBoard(board);
    setupSelection(board, usedWords);
    updateCounter(usedWords.length, foundWords.length);
    document.getElementById('rotate-btn').onclick = () => {
      board = rotateBoard(board);
      renderBoard(board);
      setupSelection(board, usedWords);
      updateCounter(usedWords.length, foundWords.length);
    };
  });
});
