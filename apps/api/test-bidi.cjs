const { VertexAI } = require("@google-cloud/vertexai");

async function main() {
  const vertexAI = new VertexAI({ project: "sales-agent-488516", location: "us-central1" });
  console.log(vertexAI.getGenerativeModel);
}
main();
