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
type ColorSelection = Map<AllowedColors, number>;

type Game = {
  id: number;
  requirements: ColorSelection;
};

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
    numberSum += calculatePower(game);

    lineNumber++;
  });
  console.log("The sum total is", numberSum);
} catch (e) {
  console.error("FATAL ERROR: ", e);
}

function calculatePower(game: Game) {
  return Array.from(game.requirements.entries()).reduce((acc, [, value]) => {
    return acc * value;
  }, 1);
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

    let gameRequirements: ColorSelection = new Map();
    for (let roundPart of roundParts) {
      findGameRequirements(roundPart, gameRequirements);
    }
    return {
      id: lineNumber + 1,
      requirements: gameRequirements,
    };
  } catch (e) {
    throw new Error(`Error parsing Game ${lineNumber}: ${line}, cause: ${e}`);
  }
}

function findGameRequirements(
  roundsStr: string,
  gameRequirements: ColorSelection
): boolean {
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
    const existingColorEntry = gameRequirements.get(validColor);
    if (
      typeof existingColorEntry !== "number" ||
      existingColorEntry < colorTotal
    ) {
      gameRequirements.set(validColor, colorTotal);
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
