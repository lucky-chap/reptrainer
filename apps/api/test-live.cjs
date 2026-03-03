const { VertexAI } = require("@google-cloud/vertexai");

const vertexAI = new VertexAI({ project: "sales-agent-488516", location: "us-central1" });
console.log(vertexAI.getGenerativeModel);
console.log(Object.keys(vertexAI));
