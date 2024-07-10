const app = new PIXI.Application({
    width: 375,
    height: 667,
    backgroundColor: 0x1099bb,
    resolution: window.devicePixelRatio || 1,
});
document.body.appendChild(app.view);

// Константы
const GRID_WIDTH = 5;
const GRID_HEIGHT = 6;
const CELL_SIZE = 60;
const CELL_MARGIN = 5;

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Переменные для подсчета очков и уровня сложности
let score = 0;
let difficulty = 1;

// Текст для отображения очков
const scoreText = new PIXI.Text('Score: 0', {
    fontFamily: 'Arial',
    fontSize: 24,
    fill: 0xFFFFFF,
    align: 'center',
});
scoreText.position.set(10, 10);
app.stage.addChild(scoreText);

// Текст для отображения уровня сложности
const difficultyText = new PIXI.Text('Level: 1', {
    fontFamily: 'Arial',
    fontSize: 24,
    fill: 0xFFFFFF,
    align: 'center',
});
difficultyText.position.set(10, 40);
app.stage.addChild(difficultyText);

// Звуковые эффекты
const sounds = {
    merge: new Howl({
        src: ['merge.mp3']
    }),
    special: new Howl({
        src: ['special.mp3']
    }),
    levelUp: new Howl({
        src: ['levelup.mp3']
    })
};

// Класс для ячейки игрового поля
class Cell extends PIXI.Container {
    constructor(value) {
        super();
        this.value = value;

        this.background = new PIXI.Graphics();
        this.background.beginFill(this.getColorForValue(value));
        this.background.drawRoundedRect(0, 0, CELL_SIZE, CELL_SIZE, 10);
        this.background.endFill();
        this.addChild(this.background);

        this.text = new PIXI.Text(value.toString(), {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xFFFFFF,
            align: 'center',
        });
        this.text.anchor.set(0.5);
        this.text.position.set(CELL_SIZE / 2, CELL_SIZE / 2);
        this.addChild(this.text);
    }

    getColorForValue(value) {
        const colors = {
            2: 0x3498db,
            4: 0xe74c3c,
            8: 0x2ecc71,
            16: 0xf39c12,
            32: 0x9b59b6,
            64: 0x1abc9c,
            128: 0xd35400,
            256: 0x27ae60,
        };
        return colors[value] || 0x95a5a6;
    }

    setValue(newValue) {
        this.value = newValue;
        this.text.text = newValue.toString();
        this.background.clear();
        this.background.beginFill(this.getColorForValue(newValue));
        this.background.drawRoundedRect(0, 0, CELL_SIZE, CELL_SIZE, 10);
        this.background.endFill();
    }
}

// Класс для специального блока
class SpecialBlock extends Cell {
    constructor() {
        super('∞');
        this.background.tint = 0xFF00FF;
    }
}

// Создание игрового поля
const grid = [];
for (let y = 0; y < GRID_HEIGHT; y++) {
    grid[y] = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
        const value = Math.random() < 0.5 ? 2 : 4;
        const cell = new Cell(value);
        cell.position.set(x * (CELL_SIZE + CELL_MARGIN), y * (CELL_SIZE + CELL_MARGIN));
        app.stage.addChild(cell);
        grid[y][x] = cell;
    }
}

// Обработка кликов
app.stage.interactive = true;
app.stage.on('pointerdown', onDragStart);
app.stage.on('pointermove', onDragMove);
app.stage.on('pointerup', onDragEnd);

let isDragging = false;
let startCell = null;
let currentLine = null;
let selectedCells = [];

function onDragStart(event) {
    const position = event.data.getLocalPosition(app.stage);
    startCell = getCellAtPosition(position);
    if (startCell) {
        isDragging = true;
        selectedCells = [startCell];
        currentLine = new PIXI.Graphics();
        app.stage.addChild(currentLine);
        drawLine();
    }
}

function onDragMove(event) {
    if (isDragging) {
        const position = event.data.getLocalPosition(app.stage);
        const cell = getCellAtPosition(position);
        if (cell && cell !== selectedCells[selectedCells.length - 1] && cell.value === startCell.value) {
            selectedCells.push(cell);
        }
        drawLine();
    }
}

function onDragEnd() {
    if (isDragging) {
        isDragging = false;
        if (selectedCells.length > 1) {
            mergeCells();
        }
        if (currentLine) {
            app.stage.removeChild(currentLine);
            currentLine = null;
        }
        selectedCells = [];
        addSpecialBlock();
        increaseDifficulty();
    }
}

function getCellAtPosition(position) {
    const x = Math.floor(position.x / (CELL_SIZE + CELL_MARGIN));
    const y = Math.floor(position.y / (CELL_SIZE + CELL_MARGIN));
    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
        return grid[y][x];
    }
    return null;
}

function drawLine() {
    if (currentLine) {
        currentLine.clear();
        currentLine.lineStyle(5, 0xFFFFFF, 1);
        currentLine.moveTo(selectedCells[0].x + CELL_SIZE / 2, selectedCells[0].y + CELL_SIZE / 2);
        for (let i = 1; i < selectedCells.length; i++) {
            currentLine.lineTo(selectedCells[i].x + CELL_SIZE / 2, selectedCells[i].y + CELL_SIZE / 2);
        }
    }
}

function mergeCells() {
    const newValue = selectedCells[0].value * selectedCells.length;
    selectedCells[0].setValue(newValue);
    updateScore(newValue);
    sounds.merge.play();
    for (let i = 1; i < selectedCells.length; i++) {
        const x = selectedCells[i].x / (CELL_SIZE + CELL_MARGIN);
        const y = selectedCells[i].y / (CELL_SIZE + CELL_MARGIN);
        grid[y][x].setValue(Math.random() < 0.5 ? 2 : 4);
    }
}

function updateScore(points) {
    score += points;
    scoreText.text = `Score: ${score}`;
}

function addSpecialBlock() {
    if (Math.random() < 0.05) { // 5% шанс появления
        const emptyCell = getRandomEmptyCell();
        if (emptyCell) {
            const specialBlock = new SpecialBlock();
            specialBlock.position.set(emptyCell.x, emptyCell.y);
            app.stage.addChild(specialBlock);
            grid[emptyCell.y / (CELL_SIZE + CELL_MARGIN)][emptyCell.x / (CELL_SIZE + CELL_MARGIN)] = specialBlock;
            sounds.special.play();
        }
    }
}

function getRandomEmptyCell() {
    const emptyCells = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (grid[y][x].value === 2 || grid[y][x].value === 4) {
                emptyCells.push({x: x * (CELL_SIZE + CELL_MARGIN), y: y * (CELL_SIZE + CELL_MARGIN)});
            }
        }
    }
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function increaseDifficulty() {
    if (score > difficulty * 1000) {
        difficulty++;
        difficultyText.text = `Level: ${difficulty}`;
        sounds.levelUp.play();
        addHigherNumbers();
    }
}

function addHigherNumbers() {
    for (let i = 0; i < difficulty; i++) {
        const cell = getRandomEmptyCell();
        if (cell) {
            const value = Math.pow(2, Math.floor(Math.random() * 4) + 3); // 8, 16, 32, or 64
            grid[cell.y / (CELL_SIZE + CELL_MARGIN)][cell.x / (CELL_SIZE + CELL_MARGIN)].setValue(value);
        }
    }
}

function sendScoreToTelegram() {
    tg.sendData(JSON.stringify({score: score}));
}

// Вызывайте sendScoreToTelegram() когда игра заканчивается
// Например, можно добавить кнопку "End Game" и вызывать эту функцию при нажатии на нее