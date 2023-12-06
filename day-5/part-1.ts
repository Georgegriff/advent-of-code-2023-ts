import readline from "node:readline/promises";
import fs from "node:fs";
import path from "node:path";
import events from "node:events";
import { fileURLToPath } from "node:url";

interface LineParser {
  name: string;
  type: "input" | "map" | "output";
}

interface InputParser extends LineParser {
  type: "input";
  input: number[];
}

type OutputRangeMapping = [number, number, number];

interface OutputNumbersParser extends LineParser {
  type: "output";
  numbers: OutputRangeMapping;
}

interface MapLineParser extends LineParser {
  type: "map";
}

function transformNumberWithRange(
  input: number,
  destinationRange: number,
  sourceRange: number,
  rangeLength: number
): { output?: number; matchedRange: boolean } {
  if (input < sourceRange) {
    // does not match
    return {
      matchedRange: false,
    };
  }
  const sourceRangeMax = sourceRange + rangeLength - 1;
  debug(
    `input: ${input} source min: ${sourceRange} source max: ${sourceRangeMax}`
  );
  if (input > sourceRangeMax) {
    // does not match
    return {
      matchedRange: false,
    };
  }
  const outputNumber = input - sourceRange + destinationRange;
  debug(`Transforming input: ${input} to ${outputNumber}`);

  return {
    output: outputNumber,
    matchedRange: true,
  };
}

function getTransformedNumbers(
  inputNumbers: number[],
  outputRanges: OutputRangeMapping[]
) {
  let outputNumbers = [];
  let min = inputNumbers[0];
  for (const inputNumber of inputNumbers) {
    let matchedARange = false;
    for (const range of outputRanges) {
      const [destinationRangeStart, sourceRangeStart, rangeLength] = range;

      debug(
        "DEST",
        destinationRangeStart,
        "SOURCE",
        sourceRangeStart,
        "RANGE",
        rangeLength
      );
      const transform = transformNumberWithRange(
        inputNumber,
        destinationRangeStart,
        sourceRangeStart,
        rangeLength
      );
      if (transform.matchedRange) {
        matchedARange = transform.matchedRange;
        if (typeof transform.output !== "number") {
          throw new Error("Matched output was missing");
        }
        if (transform.output < min) {
          min = transform.output;
        }
        outputNumbers.push(transform.output);
        break;
      }
    }
    if (!matchedARange) {
      outputNumbers.push(inputNumber);
      if (inputNumber < min) {
        min = inputNumber;
      }
    }
  }
  if (outputNumbers.length !== inputNumbers.length) {
    throw new Error("Input length did not match output length");
  }
  debug(`Current min: ${min}`);
  return {
    output: outputNumbers,
    min,
  };
}

type ParserType = InputParser | MapLineParser | OutputNumbersParser;

type SemanticParsers = Pick<InputParser | MapLineParser, "name" | "type">;
const processors: readonly SemanticParsers[] = [
  {
    name: "seeds",
    type: "input",
  },
  {
    name: "seed-to-soil",
    type: "map",
  },
  {
    name: "soil-to-fertilizer",
    type: "map",
  },
  {
    name: "fertilizer-to-water",
    type: "map",
  },
  {
    name: "water-to-light",
    type: "map",
  },
  { name: "light-to-temperature", type: "map" },

  {
    name: "temperature-to-humidity",
    type: "map",
  },
  {
    name: "humidity-to-location",
    type: "map",
  },
] as const;

const parserMap: Map<string, SemanticParsers> = new Map(
  Object.entries(
    processors.reduce((acc, curr) => {
      acc[curr.name] = curr;
      return acc;
    }, {} as Record<string, SemanticParsers>)
  )
);

const dirname = () => path.dirname(fileURLToPath(import.meta.url));

let logDebug = true;
function debug(...args: unknown[]) {
  if (logDebug) {
    console.debug("[DEBUG]", ...args);
  }
}

async function processLines(fileName: string, onLine: (line: string) => void) {
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(dirname(), fileName)),
  });

  rl.on("line", onLine);

  await events.once(rl, "close");
}
let lineNumber = 0;
let processedInputs: number[] | null = null;
let outputRanges: OutputRangeMapping[] = [];
let currentProcessor: ParserType | null = null;

try {
  await processLines("./input.txt", (line) => {
    lineNumber++;
    try {
      const parsed = parseLine(line, currentProcessor);
      if (parsed) {
        if (parsed.type === "map") {
          if (!processedInputs?.length) {
            throw new Error(
              `Transforming inputs requires an input earlier in file, none found`
            );
          }
          if (outputRanges.length) {
            const transformed = getTransformedNumbers(
              processedInputs,
              outputRanges
            );
            processedInputs = transformed.output;
          }
          // reset for next transform
          currentProcessor = parsed;
          debug("MAP", currentProcessor.name);
          outputRanges = [];
        } else if (parsed.type === "input") {
          processedInputs = parsed.input;
          debug("INPUT", processedInputs);
        } else if (parsed.type === "output") {
          outputRanges.push(parsed.numbers);
        }
      }
    } catch (e) {
      throw new Error(`Parser error on line ${lineNumber} '${line}`, {
        cause: e,
      });
    }
  });
  // process the last line
  const { min } = getTransformedNumbers(processedInputs!, outputRanges);
  console.log("The smallest location number is", min);
} catch (e) {
  console.error("FATAL ERROR: ", e);
}

function getInputNumbers(line: string) {
  const numbers = line.split(" ");
  return numbers.map((num) => {
    const parsedNum = parseInt(num, 10);
    if (isNaN(parsedNum)) {
      throw new Error(`${num} is not a number`);
    }
    return parsedNum;
  });
}
/**
 * A line can be blank, an input line, a mapping start line or output mapping numbers
 * @param line
 * @returns
 */
function parseLine(
  line: string,
  previousProcessor: ParserType | null
): ParserType | null {
  if (line.match(/^\s*$/g)) {
    // blank line
    return null;
  }

  const processorParts = line.split(":");
  if (processorParts.length === 2) {
    if (line.trim().endsWith(":")) {
      const mapType = processorParts[0].split(" ")[0];
      const outputMappingFn = parserMap.get(mapType);
      if (!outputMappingFn) {
        // could check the type of the output fn too - meh good enough for now only have maps
        throw new Error(`Invalid mapping function type: ${mapType}`);
      }
      return {
        name: outputMappingFn.name,
        type: "map",
      };
    } else {
      // could be an input?
      const processor = parserMap.get(processorParts[0]);
      if (!processor) {
        throw new Error(`Invalid format ${processorParts[0]}`);
      }
      if (processor.type !== "input") {
        throw new Error(`Expected input processor but got ${processor.type}`);
      }
      return {
        name: processor.name,
        input: getInputNumbers(processorParts[1].trim()),
        type: "input",
      };
    }
  } else {
    const maybeNumbers = line.split(" ");

    if (maybeNumbers.length === 3) {
      if (previousProcessor?.type !== "map") {
        throw new Error(
          `Cannot parse numbers without active map processor, active processor: ${JSON.stringify(
            previousProcessor
          )}`
        );
      }
      // assume for numbers
      const numbers = maybeNumbers.map((numberStr) => {
        const number = parseInt(numberStr.trim(), 10);
        if (isNaN(number)) {
          throw new Error(`Error parsing number: ${numberStr}`);
        }
        return number;
      }) as OutputRangeMapping;
      return {
        name: previousProcessor.name,
        numbers,
        type: "output",
      };
    }
  }
  throw new Error("Unknown line: Did not match supported parsers.");
}
