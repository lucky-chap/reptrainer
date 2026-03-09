import { calculateSessionMetrics } from "./standardizer";

// Mock Session Types (partial for testing)
interface MockSession {
  evaluation: any;
}

const testCases = [
  {
    name: "New 5-Skill Format",
    session: {
      evaluation: {
        overallScore: 85,
        discovery: { score: 90 },
        objectionHandling: { score: 80 },
        productPositioning: { score: 75 },
        closing: { score: 95 },
        activeListening: { score: 85 },
      },
    },
    expected: {
      overall: 85,
      discovery: 90,
      objection_handling: 80,
      positioning: 75,
      closing: 95,
      listening: 85,
      confidence: 75,
    },
  },
  {
    name: "Legacy Format (Hybrid naming)",
    session: {
      evaluation: {
        overall_score: 8.5,
        confidenceScore: 7,
        objectionHandlingScore: 6,
        clarityScore: 9,
      },
    },
    expected: {
      overall: 85,
      discovery: 85, // Falls back to overall because no discovery field found
      objection_handling: 60,
      positioning: 70,
      closing: 70, // Falls back to conf
      listening: 90,
      confidence: 70,
    },
  },
  {
    name: "Mixed Format (New fields, 0-10 scores)",
    session: {
      evaluation: {
        overallScore: 7,
        discovery: { score: 8 },
        objectionHandling: { score: 6 },
      },
    },
    expected: {
      overall: 70,
      discovery: 80,
      objection_handling: 60,
      positioning: 70, // defaults to overall
      closing: 70,
      listening: 70,
      confidence: 70,
    },
  },
  {
    name: "Minimal Format (Legacy fields)",
    session: {
      evaluation: {
        objectionHandlingScore: 5,
        confidenceScore: 8,
      },
    },
    expected: {
      overall: 43, // (50 + 80 + 0) / 3 = 43.33
      discovery: 25, // (50 + 0) / 2 = 25
      objection_handling: 50,
      positioning: 80,
      closing: 80,
      listening: 43, // Falls back to overall
      confidence: 80,
    },
  },
];

function runTests() {
  console.log("Starting Analytics Verification...\n");
  let passed = 0;
  let failed = 0;

  testCases.forEach((tc) => {
    const actual = calculateSessionMetrics(tc.session as any);
    let tcPassed = true;

    for (const [key, value] of Object.entries(tc.expected)) {
      if ((actual as any)[key] !== value) {
        console.error(
          `[FAIL] ${tc.name}: ${key} expected ${value}, got ${(actual as any)[key]}`,
        );
        tcPassed = false;
      }
    }

    if (tcPassed) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      failed++;
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
