import readline from "node:readline/promises";
import fs from "node:fs";
import path from "node:path";
import events from "node:events";
import { fileURLToPath } from "node:url";

// helpers
function parseNumber(roundNumber: string) {
  const num = parseInt(roundNumber);
  if (isNaN(num)) {
    throw new Error(`Invalid number ${roundNumber}`);
  }
  return num;
}

const dirname = () => path.dirname(fileURLToPath(import.meta.url));

let logDebug = false;
function debug(...args: unknown[]) {
  if (logDebug) {
    console.debug("[DEBUG]", ...args);
  }
}

// main

async function processLines(fileName: string, onLine: (line: string) => void) {
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(dirname(), fileName)),
  });

  rl.on("line", onLine);

  await events.once(rl, "close");
}
let numberSum = 0;
try {
  let distances: number[] = [];
  let times: number[] = [];
  await processLines("./input.txt", (line) => {
    if (line.startsWith("Time")) {
      times = parseRaceTimeLimits(line);
    }
    if (line.startsWith("Distance")) {
      distances = parseDistances(line);
    }
  });

  let marginOfError = 1;
  const races = getRacesFromInputs(times, distances);
  races.forEach((race) => {
    const { times } = findRecordBeatingTimes(
      race.timeLimit,
      race.distanceRecord
    );
    if (times.length > 0) {
      marginOfError = marginOfError * times.length;
    }
  });

  console.log("The sum total is", marginOfError);
} catch (e) {
  console.error("FATAL ERROR: ", e);
}

/// implementation

function calculateDistance(chargeTime: number, time: number) {
  return chargeTime * (time - chargeTime);
}

type Race = {
  timeLimit: number;
  distanceRecord: number;
};

function parseDistances(line: string): number[] {
  const label = "Distance:";
  return getLabelledNumbers(line, label);
}

function getLabelledNumbers(line: string, label: string): number[] {
  if (!line.startsWith(label)) {
    throw new Error(
      `Invalid line: ${line}. Did not start with label: ${label}`
    );
  }
  const lineParts = line.split(label);
  const numberInput = lineParts[1].trim();

  return numberInput.split(/\s+/).map((numString) => parseNumber(numString));
}

function parseRaceTimeLimits(line: string): number[] {
  const label = "Time:";
  return getLabelledNumbers(line, label);
}

function getRacesFromInputs(times: number[], distances: number[]): Race[] {
  return times.map((time, idx) => {
    return {
      timeLimit: time,
      distanceRecord: distances[idx],
    };
  });
}

function findRecordBeatingTimes(timeLimit: number, currentRecord: number) {
  let maxDistance = 0;
  let checked = 0;
  let wins: number[] = [];
  for (let i = 0; i < timeLimit; i++) {
    checked++;
    const distance = calculateDistance(i, timeLimit);
    if (distance > currentRecord) {
      wins.push(i);
    }
    if (distance > maxDistance) {
      maxDistance = distance;
    }
  }
  console.log(`Checked ${checked} options`);
  return { max: maxDistance, times: wins };
}
