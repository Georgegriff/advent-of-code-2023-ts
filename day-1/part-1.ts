import readline from "node:readline/promises";
import fs from "node:fs";
import path from "node:path";
import events from "node:events";
import { fileURLToPath } from "node:url";

const dirname = () => path.dirname(fileURLToPath(import.meta.url));

async function processLines(fileName: string, onLine: (line: string) => void) {
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(dirname(), fileName)),
  });

  rl.on("line", onLine);

  await events.once(rl, "close");
}
let numberSum = 0;
let lineNum = 0;
try {
  await processLines("./input.txt", (line) => {
    lineNum++;
    const chars = line.split("");
    const firstDigit = findFirstDigit(chars);
    const lastDigit = findLastDigit(chars);
    const mergedNumber = `${firstDigit}${lastDigit}`;
    console.log("Line: ", lineNum, "Found number", mergedNumber);
    numberSum += parseInt(mergedNumber, 10);
  });
  console.log("The sum total is", numberSum);
} catch (e) {
  console.error("FATAL ERROR: ", e);
}

function findFirstDigit(chars: string[]): number {
  let currentCharacterIdx = 0;

  let currentNumber = getNumber(chars[currentCharacterIdx]);
  while (!currentNumber && currentCharacterIdx < chars.length) {
    currentCharacterIdx++;
    const currentCharacter = chars[currentCharacterIdx];
    currentNumber = getNumber(currentCharacter);
  }
  if (!currentNumber) {
    throw new Error("Line has no number");
  }
  return currentNumber;
}

function findLastDigit(chars: string[]): number {
  let currentCharacterIdx = chars.length - 1;
  let currentNumber = getNumber(chars[currentCharacterIdx]);

  while (!currentNumber && currentCharacterIdx > 0) {
    currentCharacterIdx--;
    const currentCharacter = chars[currentCharacterIdx];

    currentNumber = getNumber(currentCharacter);
  }
  if (!currentNumber) {
    throw new Error("Line has no number");
  }
  return currentNumber;
}

function getNumber(char: string): number | null {
  const maybeNumber = parseInt(char, 10);
  if (isNaN(maybeNumber)) {
    return null;
  }
  return maybeNumber;
}
