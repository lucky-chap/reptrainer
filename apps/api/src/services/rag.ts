import {
  VertexRagDataServiceClient,
  VertexRagServiceClient,
} from "@google-cloud/aiplatform";
import { db } from "../config/firebase.js";
import { env } from "../config/env.js";

/**
 * Service for managing Retrieval-Augmented Generation (RAG) using Vertex AI.
 */
class RagService {
  private dataClient: VertexRagDataServiceClient;
  private retrievalClient: VertexRagServiceClient;
  private project: string;
  private location: string;

  constructor() {
    this.project = env.GOOGLE_CLOUD_PROJECT;
    this.location = env.GOOGLE_CLOUD_LOCATION;

    // The Node.js SDK uses gRPC/REST clients under the hood
    this.dataClient = new VertexRagDataServiceClient({
      apiEndpoint: `${this.location}-aiplatform.googleapis.com`,
    });
    this.retrievalClient = new VertexRagServiceClient({
      apiEndpoint: `${this.location}-aiplatform.googleapis.com`,
    });
  }

  private getParentPath() {
    return `projects/${this.project}/locations/${this.location}`;
  }

  /**
   * Gets or creates a RagCorpus for a specific team.
   */
  async getOrCreateCorpus(teamId: string): Promise<string> {
    const kbRef = db.collection("knowledgeBases").doc(teamId);
    const kbSnap = await kbRef.get();
    const kbData = kbSnap.data();

    if (kbData?.ragCorpusId) {
      return kbData.ragCorpusId;
    }

    console.log(`Creating new RagCorpus for team: ${teamId}`);
    const [operation] = await this.dataClient.createRagCorpus({
      parent: this.getParentPath(),
      ragCorpus: {
        displayName: `Team Knowledge Base - ${teamId}`,
        description: `Corpus for RepTrainer team ${teamId}`,
      },
    });

    const result = await operation.promise();
    const corpusId = result[0].name;

    if (!corpusId) {
      throw new Error("Failed to create RagCorpus: No name returned");
    }

    await kbRef.set({ ragCorpusId: corpusId }, { merge: true });
    return corpusId;
  }

  /**
   * Imports a file from Google Cloud Storage into the team's RAG corpus.
   */
  async importFile(
    teamId: string,
    gcsUri: string,
    displayName: string,
  ): Promise<string> {
    const corpusId = await this.getOrCreateCorpus(teamId);

    console.log(`Importing file to RAG: ${gcsUri} into corpus ${corpusId}`);

    const [operation] = await this.dataClient.importRagFiles({
      parent: corpusId,
      importRagFilesConfig: {
        gcsSource: {
          uris: [gcsUri],
        },
        // Optional: can add transformation configuration here if needed
      },
    });

    const result = await operation.promise();
    // The result of importRagFiles is an ImportRagFilesResponse which contains the count of imported files
    console.log(`Imported files to RAG. Result:`, JSON.stringify(result));

    // We don't get individual file IDs back in the same way, but we can list files if needed.
    // For now, we'll return the corpus ID as the primary reference.
    return corpusId;
  }

  /**
   * Retrieves relevant context snippets from the team's RAG corpus.
   */
  async retrieve(
    teamId: string,
    query: string,
    topK: number = 5,
  ): Promise<string[]> {
    const corpusId = await this.getOrCreateCorpus(teamId);

    try {
      const response = (await this.retrievalClient.retrieveContexts({
        parent: this.getParentPath(),
        vertexRagStore: {
          ragResources: [{ ragCorpus: corpusId }],
        },
        query: {
          text: query,
          ragRetrievalConfig: {
            topK: topK,
          },
        },
      })) as any;

      // The response might be [response] or just response depending on version
      const result = Array.isArray(response) ? response[0] : response;

      return (
        result.contexts?.contexts
          ?.map((c: any) => c.text)
          .filter((t: any): t is string => !!t) || []
      );
    } catch (error) {
      console.error("RAG Retrieval failed:", error);
      return [];
    }
  }
}

export const ragService = new RagService();
