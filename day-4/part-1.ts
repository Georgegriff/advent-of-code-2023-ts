import readline from "node:readline/promises";
import fs from "node:fs";
import path from "node:path";
import events from "node:events";
import { fileURLToPath } from "node:url";

const dirname = () => path.dirname(fileURLToPath(import.meta.url));

let logDebug = true;
function debug(...args) {
  if (logDebug) {
    console.debug("[DEBUG]", ...args);
  }
}

interface GameCard {
  game: number;
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
try {
  await processLines("./input.txt", (line) => {
    lineNumber++;
    const game = parseGame(line, lineNumber);
    numberSum += findCardScore(game);
  });
  console.log("The sum total is", numberSum);
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
      game: lineNumber,
      winningNumbers: parseNumbers(winningNumbersStr),
      cardNumbers: parseNumbers(cardNumbersStr),
    };
  } catch (e) {
    throw new Error(`Error parsing Game ${lineNumber}: ${line}, cause: ${e}`);
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

function findCardScore(game: GameCard): number {
  const winningNumbers = findWinningNumberCount(game);
  const score = getScore(winningNumbers);
  debug(
    `Game ${game.game} has ${winningNumbers} winning numbers. The card is worth: ${score}`
  );
  return score;
}

function findWinningNumberCount(game: GameCard): number {
  let winningNumbers = 0;
  game.winningNumbers.forEach((winningNumber) => {
    if (game.cardNumbers.has(winningNumber)) {
      winningNumbers++;
    }
  });

  return winningNumbers;
}

function getScore(winningNumbers: number) {
  if (winningNumbers === 0) {
    return 0;
  }
  return 2 ** (winningNumbers - 1);
}
