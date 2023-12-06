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

type Coordinate = {
  xStart: number;
  xEnd: number;
  y: number;
};

interface Element {
  type: "number" | "symbol";
  position: Coordinate;
  value: number | string;
}

interface Number extends Element {
  type: "number";
  value: number;
}

interface Symbol extends Element {
  type: "symbol";
  value: string;
  adjacentNumbers?: Set<Number>;
}

type LineMap = Map<number, Element>;

type AdjacencyMap = Map<string, Symbol>;

async function processLines(fileName: string, onLine: (line: string) => void) {
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(dirname(), fileName)),
  });

  rl.on("line", onLine);

  await events.once(rl, "close");
}
let lineNumber = 0;
let previousLineMap: LineMap | null = null;
let symbolAdjacencies: AdjacencyMap = new Map();
try {
  await processLines("./input.txt", (line) => {
    const xPoints = line.split("");
    const currentLineMap = checkLine(xPoints, lineNumber, previousLineMap);
    previousLineMap = currentLineMap;
    lineNumber++;
  });
  const numberSum = [...symbolAdjacencies.values()].reduce((acc, curr) => {
    if (curr.value !== "*" || curr.adjacentNumbers?.size !== 2) {
      // not a valid gear
      return acc;
    }
    const numbs = [...curr.adjacentNumbers.values()];
    const gearRatio = numbs[0].value * numbs[1].value;
    return acc + gearRatio;
  }, 0);
  console.log("The sum total is", numberSum);
} catch (e) {
  console.error("FATAL ERROR: ", e);
}

function checkLine(
  xPoints: string[],
  yPosition: number,
  previousLineMap: LineMap | null
): LineMap {
  let numberStr = "";

  const currentLineMap: LineMap = new Map();
  try {
    xPoints.forEach((point, idx) => {
      if (point.match(/[0-9]/)) {
        numberStr += point;
      } else {
        if (numberStr.length) {
          const number: Number = {
            value: collectNumber(numberStr),
            type: "number",
            position: {
              xStart: idx - numberStr.length,
              xEnd: idx - 1,
              y: yPosition,
            },
          };
          debug(number);

          for (let i = 0; i < numberStr.length; i++) {
            currentLineMap.set(number.position.xStart + i, number);
          }
          checkAdjacency(
            previousLineMap,
            currentLineMap,
            number,
            symbolAdjacencies
          );
          numberStr = "";
        }
        if (point !== ".") {
          const symbol: Symbol = {
            value: point,
            type: "symbol",
            position: {
              xStart: idx,
              xEnd: idx,
              y: yPosition,
            },
          };
          debug(symbol);
          checkAdjacency(
            previousLineMap,
            currentLineMap,
            symbol,
            symbolAdjacencies
          );
          currentLineMap.set(symbol.position.xStart, symbol);
        }
      }
    });
    if (numberStr.length) {
      const number: Number = {
        value: collectNumber(numberStr),
        type: "number",
        position: {
          xStart: xPoints.length - numberStr.length,
          xEnd: xPoints.length - 1,
          y: yPosition,
        },
      };
      debug(number);

      for (let i = 0; i < numberStr.length; i++) {
        currentLineMap.set(number.position.xStart + i, number);
      }
      checkAdjacency(
        previousLineMap,
        currentLineMap,
        number,
        symbolAdjacencies
      );
      numberStr = "";
    }
    return currentLineMap;
  } catch (e) {
    throw new Error(`Line parse error: line: ${yPosition}`, { cause: e });
  }
}

function checkAdjacency(
  previousLineMap: LineMap | null,
  currentLineMap: LineMap,
  currentElement: Element,
  adjacencies: AdjacencyMap
) {
  const start = currentElement.position.xStart;
  const end = currentElement.position.xEnd;

  // check previous line
  if (previousLineMap) {
    let scanPoint = start - 1;
    while (scanPoint <= end + 1) {
      debug(
        `Scanning ${currentElement.value} on line ${currentElement.position.y} above at position: ${scanPoint}`
      );
      const point = previousLineMap.get(scanPoint);
      recordMatch(point, currentElement, adjacencies);

      scanPoint++;
    }
  }

  // current line checks
  const currentLineStartMatch = currentLineMap.get(start - 1);
  const currentLineEndMatch = currentLineMap.get(end + 1);
  recordMatch(currentLineStartMatch, currentElement, adjacencies);
  if (currentLineStartMatch !== currentLineEndMatch) {
    recordMatch(currentLineEndMatch, currentElement, adjacencies);
  }
}

function recordMatch(
  compareMatch: Element | undefined,
  currentElement: Element,
  adjacencySymbols: AdjacencyMap
) {
  if (compareMatch && compareMatch.type !== currentElement.type) {
    const matchingSymbol = (
      currentElement.type === "symbol" ? currentElement : compareMatch
    ) as Symbol;

    const matchingNumber = (
      currentElement.type === "number" ? currentElement : compareMatch
    ) as Number;
    const mapKey = encodeCoordinateKey(matchingSymbol);
    if (!matchingSymbol.adjacentNumbers) {
      matchingSymbol.adjacentNumbers = new Set();
    }
    matchingSymbol.adjacentNumbers.add(matchingNumber);
    if (adjacencySymbols.has(mapKey)) {
      debug(
        `Comparison: curr: ${currentElement.value} prev: ${compareMatch.value}`
      );
      console.log(
        `Symbol: ${matchingNumber.value} already recorded at ${mapKey}`
      );
    } else {
      debug(
        `Comparison: curr: ${currentElement.value} prev: ${compareMatch.value}`
      );
      console.log(
        `Recording Symbol: ${matchingSymbol.value} ${matchingSymbol.position.xStart} to ${matchingSymbol.position.xEnd} on line ${matchingSymbol.position.y}`
      );
      adjacencySymbols.set(mapKey, matchingSymbol as Symbol);
    }
  }
}

function encodeCoordinateKey(number: Element) {
  const matchCoord = `${number.position.y}:${number.position.xStart}-${number.position.xEnd}-${number.value}`;
  debug("Match cache key", matchCoord);
  return matchCoord;
}

function collectNumber(numberStr: string): number {
  const num = parseInt(numberStr, 10);
  if (isNaN(num)) {
    throw new Error(`Invalid number: ${numberStr}`);
  }
  return num;
}
