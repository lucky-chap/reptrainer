import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({
  project: "test",
  location: "us-central1",
  vertexai: true,
});
async function run() {
  const session = await ai.live.connect({ model: "placeholder" });
  console.log(session.constructor.name);
  console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(session)));
  console.log(session.conn.constructor.name);
  console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(session.conn)));
}
run().catch(console.error);
