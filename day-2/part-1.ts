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

const allowedColors = ["red", "green", "blue"] as const;
type AllowedColors = (typeof allowedColors)[number];
type ColorSelection = Record<AllowedColors, number>;
const constraints: ColorSelection = {
  red: 12,
  green: 13,
  blue: 14,
};

type Game = {
  id: number;
  isValid: boolean;
};

type Round = Partial<ColorSelection>;

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
    const game = parseGame(line, lineNumber);
    if (game.isValid) {
      numberSum += game.id;
    }
    lineNumber++;
  });
  console.log("The sum total is", numberSum);
} catch (e) {
  console.error("FATAL ERROR: ", e);
}

function parseGame(line: string, lineNumber: number): Game {
  try {
    const cardParts = line.split(":");
    if (cardParts.length !== 2) {
      throw new Error("Invalid game format, missing :");
    }
    const [, gameStr] = cardParts;
    const roundParts = gameStr.split(";");
    if (!roundParts.length) {
      throw new Error("Invalid number format, missing ;");
    }

    let isValid = true;
    for (let roundPart of roundParts) {
      const isRoundValid = checkIfRoundValid(roundPart);
      if (!isRoundValid) {
        isValid = false;
        break;
      }
    }
    return {
      id: lineNumber + 1,
      isValid,
    };
  } catch (e) {
    throw new Error(`Error parsing Game ${lineNumber}: ${line}`, { cause: e });
  }
}

function checkIfRoundValid(roundsStr: string): boolean {
  const roundParts = roundsStr.split(",");
  if (!roundParts.length) {
    throw new Error(`Invalid round: ${roundsStr}`);
  }
  let isValid = true;

  for (let roundSt of roundParts) {
    const roundSegments = roundSt.trim().split(" ");
    if (roundSegments.length !== 2) {
      throw new Error(`Invalid round: ${roundSt}`);
    }
    const [number, color] = roundSegments;
    const validColor = validateColor(color);
    const colorTotal = parseNumber(number);
    if (constraints[validColor] < colorTotal) {
      isValid = false;
      break;
    }
  }

  return isValid;
}

function validateColor(color: string): AllowedColors {
  const foundColor = allowedColors.find((col) => col === color);
  if (!foundColor) {
    throw new Error(`Invalid color: ${foundColor}`);
  }

  return foundColor;
}

function parseNumber(roundNumber: string) {
  const num = parseInt(roundNumber);
  if (isNaN(num)) {
    throw new Error(`Invalid number ${roundNumber}`);
  }
  return num;
}
