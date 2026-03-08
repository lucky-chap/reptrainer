import { v4 as uuidv4 } from "uuid";
import type { Product, Persona, Session } from "./core";
import { saveProduct } from "./products";
import { savePersona } from "./personas";
import { addTeamMember } from "./teams";
import { saveSession } from "./sessions";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "./core";

export async function seedDemoTeamData(
  userId: string,
  teamId: string,
): Promise<void> {
  // 1. Create Demo Product
  const productId = uuidv4();
  const demoProduct: Product = {
    id: productId,
    userId,
    teamId,
    companyName: "Hugnotes",
    description:
      "A platform to create personalized digital greeting cards with voice messages, custom designs, and scheduled delivery.",
    targetCustomer:
      "Consumers looking for meaningful, personalized digital cards",
    industry: "Consumer SaaS / Gifting",
    objections: [
      "I prefer sending physical paper cards.",
      "Are digital cards really that meaningful?",
      "Can't I just send a text message with a voice note?",
    ],
    createdAt: new Date().toISOString(),
  };
  await saveProduct(demoProduct);

  // 2. Create Demo Personas
  const personasData = [
    {
      name: "Jean-Pierre",
      role: "Sales Director",
      gender: "male" as const,
      accent: "French",
      speakingStyle: "Sophisticated and slightly impatient",
      personalityPrompt:
        "You are a sophisticated French Sales Director. You are slightly impatient and value elegance in solutions.",
      avatarUrl:
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=faces",
    },
    {
      name: "Elena",
      role: "VP of Operations",
      gender: "female" as const,
      accent: "Spanish",
      speakingStyle: "Warm and relationship-focused",
      personalityPrompt:
        "You are a warm, relationship-focused Spanish VP of Operations. You prioritize trust and long-term partnerships.",
      avatarUrl:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=faces",
    },
    {
      name: "Hans",
      role: "CIO",
      gender: "male" as const,
      accent: "German",
      speakingStyle: "Direct and data-driven",
      personalityPrompt:
        "You are a direct, data-driven German CIO. You care about efficiency, metrics, and technical architecture.",
      avatarUrl:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=faces",
    },
    {
      name: "Sarah",
      role: "Procurement Manager",
      gender: "female" as const,
      accent: "British",
      speakingStyle: "Polished and stable",
      personalityPrompt:
        "You are a polished British Procurement Manager. You are cautious, risk-averse, and care about compliance.",
      avatarUrl:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=faces",
    },
    {
      name: "Chidi",
      role: "Founder",
      gender: "male" as const,
      accent: "Nigerian",
      speakingStyle: "Energetic with 'sharp-sharp' business focus",
      personalityPrompt:
        "You are a Nigerian Founder. You are energetic and focus on quick ROI. You sometimes use phrases like 'Oya' or 'Abeg' in conversation.",
      avatarUrl:
        "https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=150&h=150&fit=crop&crop=faces",
    },
    {
      name: "Kofi",
      role: "Customer Success Lead",
      gender: "male" as const,
      accent: "Ghanaian",
      speakingStyle: "Calm and polite with community-focused values",
      personalityPrompt:
        "You are a Ghanaian Customer Success Lead. You are calm, polite, and value community. You might use phrases like 'Charlie' or 'I beg' occasionally.",
      avatarUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces",
    },
  ];

  const createdPersonas: Persona[] = [];

  for (const pd of personasData) {
    const personaId = uuidv4();
    const persona: Persona = {
      id: personaId,
      userId,
      teamId,
      productId,
      name: pd.name,
      role: pd.role,
      gender: pd.gender,
      accent: pd.accent,
      speakingStyle: pd.speakingStyle,
      personalityPrompt: pd.personalityPrompt,
      intensityLevel: 2,
      objectionStrategy: "skeptical",
      traits: {
        aggressiveness: 3,
        interruptionFrequency: "rarely",
        objectionStyle: "direct",
      },
      avatarUrl: pd.avatarUrl,
      createdAt: new Date().toISOString(),
    };
    await savePersona(persona);
    createdPersonas.push(persona);
  }

  // 3. Create Demo Members
  const membersData = [
    {
      name: "Amara Okafor",
      role: "member" as const,
      userAvatarUrl:
        "https://images.unsplash.com/photo-1644152993066-9b9ee687930d?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      name: "David Chen",
      role: "member" as const,
      userAvatarUrl:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=faces",
    },
    {
      name: "Sarah Jenkins",
      role: "member" as const,
      userAvatarUrl:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces",
    },
    {
      name: "Liam O'Connor",
      role: "member" as const,
      userAvatarUrl:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=faces",
    },
    {
      name: "Priya Patel",
      role: "member" as const,
      userAvatarUrl:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=faces",
    },
    {
      name: "Marcus Johnson",
      role: "member" as const,
      userAvatarUrl:
        "https://images.unsplash.com/photo-1530268729831-4b0b9e170218?w=150&h=150&fit=crop&crop=faces",
    },
  ];

  for (const m of membersData) {
    const demoMemberId = uuidv4();
    await addTeamMember(teamId, demoMemberId, m.role, m.name, m.userAvatarUrl);

    // 4. Create Mock Sessions for each member
    for (let i = 0; i < 3; i++) {
      const persona =
        createdPersonas[Math.floor(Math.random() * createdPersonas.length)];
      const date = new Date(
        Date.now() - (i + 1) * 24 * 60 * 60 * 1000,
      ).toISOString();

      const overallScore = Math.floor(Math.random() * 40) + 50; // 50 to 90

      const session: Session = {
        id: uuidv4(),
        userId: demoMemberId,
        teamId,
        userName: m.name,
        personaId: persona.id,
        productId,
        personaName: persona.name,
        personaRole: persona.role,
        personaAvatarUrl: persona.avatarUrl,
        transcript: "Simulated conversation for demo purposes.",
        durationSeconds: Math.floor(Math.random() * 300) + 120, // 2-7 minutes
        createdAt: date,
        evaluation: {
          discovery: {
            score: Math.min(
              100,
              overallScore + Math.floor(Math.random() * 20) - 10,
            ),
            explanation: "Good effort.",
          },
          objectionHandling: {
            score: Math.min(
              100,
              overallScore + Math.floor(Math.random() * 20) - 10,
            ),
            explanation: "Needs work.",
          },
          productPositioning: {
            score: Math.min(
              100,
              overallScore + Math.floor(Math.random() * 20) - 10,
            ),
            explanation: "Solid.",
          },
          closing: {
            score: Math.min(
              100,
              overallScore + Math.floor(Math.random() * 20) - 10,
            ),
            explanation: "Could be stronger.",
          },
          activeListening: {
            score: Math.min(
              100,
              overallScore + Math.floor(Math.random() * 20) - 10,
            ),
            explanation: "Excellent.",
          },
          overallScore,
          strengths: ["Clear communication"],
          weaknesses: ["Rushed at the end"],
          improvementTips: ["Pause after answering objections"],
        },
      };
      await saveSession(session);
    }
  }
}

export async function removeDemoTeamData(teamId: string): Promise<void> {
  // 1. Delete Demo Members
  const demoMemberNames = [
    "Amara Okafor",
    "David Chen",
    "Sarah Jenkins",
    "Liam O'Connor",
    "Priya Patel",
    "Marcus Johnson",
  ];

  const membersQ = query(
    collection(db, "teamMembers"),
    where("teamId", "==", teamId),
  );
  const membersSnap = await getDocs(membersQ);
  const demoMembers = membersSnap.docs.filter((d) => {
    const data = d.data();
    return demoMemberNames.includes(data.userName || data.name);
  });

  const demoMemberIds = demoMembers.map((d) => d.data().userId);

  for (const memberDoc of demoMembers) {
    await deleteDoc(doc(db, "teamMembers", memberDoc.id));
  }

  // 2. Delete Demo Products
  const productsQ = query(
    collection(db, "products"),
    where("teamId", "==", teamId),
  );
  const productsSnap = await getDocs(productsQ);
  const demoProducts = productsSnap.docs.filter(
    (d) => d.data().companyName === "Hugnotes",
  );

  const demoProductIds = demoProducts.map((d) => d.id);

  for (const pDoc of demoProducts) {
    await deleteDoc(doc(db, "products", pDoc.id));
  }

  // 3. Delete Personas related to demo products or demo names
  const demoPersonaNames = [
    "Jean-Pierre",
    "Elena",
    "Hans",
    "Sarah",
    "Chidi",
    "Kofi",
  ];
  const personasQ = query(
    collection(db, "personas"),
    where("teamId", "==", teamId),
  );
  const personasSnap = await getDocs(personasQ);
  const demoPersonas = personasSnap.docs.filter(
    (d) =>
      demoProductIds.includes(d.data().productId) ||
      demoPersonaNames.includes(d.data().name),
  );

  for (const pDoc of demoPersonas) {
    await deleteDoc(doc(db, "personas", pDoc.id));
  }

  // 4. Delete Sessions related to demo products or demo members
  const sessionsQ = query(
    collection(db, "sessions"),
    where("teamId", "==", teamId),
  );
  const sessionsSnap = await getDocs(sessionsQ);
  const demoSessions = sessionsSnap.docs.filter(
    (d) =>
      demoProductIds.includes(d.data().productId) ||
      demoMemberIds.includes(d.data().userId) ||
      d.data().transcript === "Simulated conversation for demo purposes.",
  );

  for (const sDoc of demoSessions) {
    await deleteDoc(doc(db, "sessions", sDoc.id));
  }
}
