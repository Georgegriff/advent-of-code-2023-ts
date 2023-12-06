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
try {
  let recordDistance: number = 0;
  let timeLimit: number = 0;
  await processLines("./input.txt", (line) => {
    if (line.startsWith("Time")) {
      timeLimit = parseRaceTimeLimit(line);
    }
    if (line.startsWith("Distance")) {
      recordDistance = parseDistances(line);
    }
  });

  let marginOfError = 1;
  const race = getRaceFromInputs(timeLimit, recordDistance);
  const { times } = findRecordBeatingTimes(race.timeLimit, race.distanceRecord);
  if (times.length > 0) {
    marginOfError = marginOfError * times.length;
  }

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

function parseDistances(line: string): number {
  const label = "Distance:";
  return getLabelledNumber(line, label);
}

function getLabelledNumber(line: string, label: string): number {
  if (!line.startsWith(label)) {
    throw new Error(
      `Invalid line: ${line}. Did not start with label: ${label}`
    );
  }
  const lineParts = line.split(label);
  const numberInput = lineParts[1].trim();

  return parseNumber(numberInput.split(/\s+/).join(""));
}

function parseRaceTimeLimit(line: string): number {
  const label = "Time:";
  return getLabelledNumber(line, label);
}

function getRaceFromInputs(time: number, distance: number): Race {
  return {
    timeLimit: time,
    distanceRecord: distance,
  };
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
