import readline from "node:readline/promises";
import fs from "node:fs";
import path from "node:path";
import events from "node:events";
import { fileURLToPath } from "node:url";

const numberWordListMap = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

const wordNumbers = Object.keys(numberWordListMap);

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
    const firstDigit = findFirstDigitOrNumberWord(chars);
    const lastDigit = findLastDigitOrNumberWord(chars);
    const mergedNumber = `${firstDigit}${lastDigit}`;
    console.log("Line: ", lineNum, "Found number", mergedNumber);
    numberSum += parseInt(mergedNumber, 10);
  });
  console.log("The sum total is", numberSum);
} catch (e) {
  console.error("FATAL ERROR: ", e);
}

function couldBeNumberWord(
  currentInput: string,
  newCharacter: string,
  direction: "forwards" | "backwards"
): string {
  if (direction === "forwards") {
    let newInput = `${currentInput}${newCharacter}`;
    while (newInput) {
      const matches = wordNumbers.some((numberString) => {
        return numberString.startsWith(newInput);
      });
      if (matches) {
        return newInput;
      } else {
        console.log(newInput);
        const splitArray = newInput.split("");
        splitArray.shift();
        newInput = splitArray.join("");
      }
    }
    const matches = wordNumbers.some((numberString) => {
      return numberString.startsWith(newInput);
    });
    if (matches) {
      return newInput;
    }
  } else {
    let newInput = `${newCharacter}${currentInput}`;
    while (newInput) {
      const matches = wordNumbers.some((numberString) => {
        return numberString.endsWith(newInput);
      });
      if (matches) {
        return newInput;
      } else {
        const splitArray = newInput.split("");
        splitArray.pop();
        newInput = splitArray.join("");
      }
    }
  }
  return newCharacter;
}

function findFirstDigitOrNumberWord(chars: string[]): number {
  let currentCharacterIdx = 0;

  let currentNumber = getNumber(chars[currentCharacterIdx]);
  let numberWord = chars[currentCharacterIdx];
  while (!currentNumber && currentCharacterIdx < chars.length) {
    currentCharacterIdx++;
    const currentCharacter = chars[currentCharacterIdx];
    currentNumber = getNumber(currentCharacter);
    if (!currentNumber) {
      numberWord = couldBeNumberWord(numberWord, currentCharacter, "forwards");
      currentNumber = numberWordListMap.hasOwnProperty(numberWord)
        ? numberWordListMap[numberWord]
        : null;
    }
  }
  if (!currentNumber) {
    throw new Error("Line has no number");
  }
  return currentNumber;
}

function findLastDigitOrNumberWord(chars: string[]): number {
  let currentCharacterIdx = chars.length - 1;
  let currentNumber = getNumber(chars[currentCharacterIdx]);
  let numberWord = chars[currentCharacterIdx];

  while (!currentNumber && currentCharacterIdx > 0) {
    currentCharacterIdx--;
    const currentCharacter = chars[currentCharacterIdx];

    currentNumber = getNumber(currentCharacter);
    if (!currentNumber) {
      numberWord = couldBeNumberWord(numberWord, currentCharacter, "backwards");
      currentNumber = currentNumber = numberWordListMap.hasOwnProperty(
        numberWord
      )
        ? numberWordListMap[numberWord]
        : null;
    }
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
