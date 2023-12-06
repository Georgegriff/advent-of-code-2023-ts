import readline from "node:readline/promises";
import fs from "node:fs";
import path from "node:path";
import events from "node:events";
import { fileURLToPath } from "node:url";

const dirname = () => path.dirname(fileURLToPath(import.meta.url));

let logDebug = false;
function debug(...args) {
  if (logDebug) {
    console.debug("[DEBUG]", ...args);
  }
}

type GameIndex = number;

interface GameCard {
  idx: GameIndex;
  gameNumber: number;
  winningNumbers: Set<number>;
  cardNumbers: Set<number>;
}

async function processLines(fileName: string, onLine: (line: string) => void) {
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(dirname(), fileName)),
  });

  rl.on("line", onLine);

  await events.once(rl, "close");
}
let numberSum = 0;
let lineNumber = 0;
let initialGames: GameCard[] = [];
try {
  await processLines("./input.txt", (line) => {
    const game = parseGame(line, lineNumber);
    lineNumber++;
    initialGames.push(game);
  });

  const start = performance.now();
  console.log(`Starting game cards: ${initialGames.length}`);
  numberSum = gainScratchCards(initialGames) + initialGames.length;

  console.log("The sum total is", numberSum);
  const end = performance.now();
  console.log(`Took ${end - start}ms`);
} catch (e) {
  console.error("FATAL ERROR: ", e);
}

function parseGame(line: string, lineNumber: number): GameCard {
  try {
    const cardParts = line.split(":");
    if (cardParts.length !== 2) {
      throw new Error("Invalid game format, missing :");
    }
    const [, numbers] = cardParts;
    const numberParts = numbers.split("|");
    if (numberParts.length !== 2) {
      throw new Error("Invalid number format, missing | or too many numbers");
    }
    const [winningNumbersStr, cardNumbersStr] = numberParts;

    return {
      get gameNumber() {
        return lineNumber + 1;
      },
      idx: lineNumber,
      winningNumbers: parseNumbers(winningNumbersStr),
      cardNumbers: parseNumbers(cardNumbersStr),
    };
  } catch (e) {
    throw new Error(`Error parsing Game ${lineNumber}: ${line}`, { cause: e });
  }
}

function parseNumbers(numbers: string) {
  return new Set(
    numbers
      .trim()
      .split(/\s+/)
      .map((numberStr) => {
        const numberParsed = parseInt(numberStr, 10);
        if (isNaN(numberParsed)) {
          throw new Error(`Invalid number: ${numberStr}`);
        }
        return numberParsed;
      })
  );
}

function gainScratchCards(
  games: GameCard[],
  startIdx = 0,
  endIdx = games.length
): number {
  // debug(`Checking games from ${startIdx + 1} to ${endIdx + 1}`);
  let total = 0;
  if (games.length === 0 || endIdx === startIdx) {
    return total;
  }
  for (let i = startIdx; i < endIdx; i++) {
    const game = games[i];
    const winningNumbers = findWinningNumberCount(game);
    const newStartX = i + 1;
    const newEndIdx = newStartX + winningNumbers;

    total += winningNumbers + gainScratchCards(games, newStartX, newEndIdx);
  }
  return total;
}

function findWinningNumberCount(game: GameCard): number {
  let winningNumbers = 0;
  game.winningNumbers.forEach((winningNumber) => {
    if (game.cardNumbers.has(winningNumber)) {
      winningNumbers++;
    }
  });
  if (winningNumbers) {
    debug(`Game ${game.gameNumber} has ${winningNumbers} winning numbers.`);
  }
  return winningNumbers;
}
