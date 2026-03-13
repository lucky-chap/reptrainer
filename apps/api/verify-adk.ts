import { geminiLiveToolsDict } from "./src/services/adk-tools.js";

async function verifyADKTools() {
  console.log("--- Starting ADK Tool Verification ---");

  const stateDelta: any = {
    knowledgeMetadata: {
      teamId: "test-team",
      competitorContexts: [
        { name: "CompetitorX", description: "Cached description" },
      ],
    },
    searchCount: 0,
  };
  const toolContext = { actions: { stateDelta } };

  // 1. Test Cached Competitor Research
  console.log("\n1. Testing research_competitor (cached)...");
  const toolX = geminiLiveToolsDict["research_competitor"];
  const respX = await toolX.execute(
    { competitorName: "CompetitorX" },
    toolContext,
  );
  console.log("Response:", JSON.stringify(respX));
  if (respX.name === "CompetitorX") {
    console.log("✅ Passed: Returned cached data.");
  } else {
    console.error("❌ Failed: Did not return cached data.");
  }

  // 2. Test Sales Insight Logging
  console.log("\n2. Testing log_sales_insight...");
  const toolInsight = geminiLiveToolsDict["log_sales_insight"];
  const respInsight = await toolInsight.execute({
    insight: "User handled the objection well.",
  });
  console.log("Response:", JSON.stringify(respInsight));
  if (respInsight.success) {
    console.log("✅ Passed");
  } else {
    console.error("❌ Failed");
  }

  // 3. Test Objection Logging
  console.log("\n3. Testing log_objection...");
  const toolObjection = geminiLiveToolsDict["log_objection"];
  const respObjection = await toolObjection.execute({
    objectionType: "Pricing",
    repResponse: "Offered a discount.",
    sentiment: "positive",
  });
  console.log("Response:", JSON.stringify(respObjection));
  if (respObjection.success) {
    console.log("✅ Passed");
  } else {
    console.error("❌ Failed");
  }

  // 4. Test Persona Mood Update
  console.log("\n4. Testing update_persona_mood...");
  const toolMood = geminiLiveToolsDict["update_persona_mood"];
  const respMood = await toolMood.execute({
    trust: 80,
    interest: 90,
    frustration: 10,
    dealLikelihood: 0.8,
  });
  console.log("Response:", JSON.stringify(respMood));
  if (respMood.success) {
    console.log("✅ Passed");
  } else {
    console.error("❌ Failed");
  }

  // 5. Test End Roleplay
  console.log("\n5. Testing end_roleplay...");
  const toolEnd = geminiLiveToolsDict["end_roleplay"];
  const respEnd = await toolEnd.execute();
  console.log("Response:", JSON.stringify(respEnd));
  if (respEnd.success) {
    console.log("✅ Passed");
  } else {
    console.error("❌ Failed");
  }

  console.log("\n--- ADK Tool Verification Component Finished ---");
}

verifyADKTools().catch(console.error);
