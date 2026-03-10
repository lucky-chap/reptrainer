import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  onSnapshot,
  updateDoc,
  limit,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  uploadString,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "./core";
import { v4 as uuidv4 } from "uuid";
import type {
  Persona,
  SessionEvaluation,
  Session,
  CallSession,
  CallStatus,
  FeedbackReport,
  TranscriptMessage,
  UserMetrics,
  TrainingTrackId,
  Team,
  TeamMember,
  Invitation,
  ProgressReport,
  PersonalityType,
  CoachDebriefResponse,
  SkillEvaluation,
  DifficultyLevel,
} from "./core";

// ─── Real-time Subscriptions (cache-first) ───

export function subscribePersonas(
  userId: string,
  teamIds: string[] = [],
  onData: (personas: Persona[]) => void,
  onError: (err: Error) => void,
) {
  const userQ = query(
    collection(db, "personas"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );

  let userPersonas: Persona[] = [];
  let teamPersonas: Persona[] = [];

  const update = () => {
    const combined = [...userPersonas, ...teamPersonas];
    const seen = new Set<string>();
    const unique = combined
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    onData(unique);
  };

  const unsubUser = onSnapshot(
    userQ,
    (snap) => {
      userPersonas = snap.docs.map((d) => d.data() as Persona);
      update();
    },
    onError,
  );

  let unsubTeam = () => {};
  if (Array.isArray(teamIds) && teamIds.length > 0) {
    const teamQ = query(
      collection(db, "personas"),
      where("teamId", "in", teamIds),
      orderBy("createdAt", "desc"),
    );
    unsubTeam = onSnapshot(
      teamQ,
      (snap) => {
        teamPersonas = snap.docs.map((d) => d.data() as Persona);
        update();
      },
      onError,
    );
  }

  return () => {
    unsubUser();
    unsubTeam();
  };
}

export function subscribeSessions(
  userId: string,
  teamIds: string[] = [],
  onData: (sessions: Session[]) => void,
  onError: (err: Error) => void,
) {
  const userQ = query(
    collection(db, "sessions"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );

  let userSessions: Session[] = [];
  let teamSessions: Session[] = [];

  const update = () => {
    const combined = [...userSessions, ...teamSessions];
    const seen = new Set<string>();
    const unique = combined
      .filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    onData(unique);
  };

  const unsubUser = onSnapshot(
    userQ,
    (snap) => {
      userSessions = snap.docs.map((d) => d.data() as Session);
      update();
    },
    onError,
  );

  let unsubTeam = () => {};
  if (Array.isArray(teamIds) && teamIds.length > 0) {
    const teamQ = query(
      collection(db, "sessions"),
      where("teamId", "in", teamIds),
      orderBy("createdAt", "desc"),
    );
    unsubTeam = onSnapshot(
      teamQ,
      (snap) => {
        teamSessions = snap.docs.map((d) => d.data() as Session);
        update();
      },
      onError,
    );
  }

  return () => {
    unsubUser();
    unsubTeam();
  };
}

export function subscribeSessionsByUserIds(
  userIds: string[],
  onData: (sessions: Session[]) => void,
  onError: (err: Error) => void,
) {
  if (!userIds || userIds.length === 0) {
    onData([]);
    return () => {};
  }

  // Firestore "in" query limit is 30 in some versions, 10 in others.
  // We'll chunk if needed, but for most teams 30 is enough.
  const q = query(
    collection(db, "sessions"),
    where("userId", "in", userIds.slice(0, 30)),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Session));
    },
    onError,
  );
}

// ─── Team Operations ───

export async function createTeam(
  name: string,
  ownerId: string,
  ownerName?: string,
  ownerAvatarUrl?: string,
): Promise<Team> {
  const team: Team = {
    id: uuidv4(),
    name,
    ownerId,
    hasKnowledgeBase: false,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "teams", team.id), team);

  // Add creator as admin member
  await addTeamMember(team.id, ownerId, "admin", ownerName, ownerAvatarUrl);

  return team;
}

export async function getTeam(id: string): Promise<Team | undefined> {
  const docRef = doc(db, "teams", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as Team) : undefined;
}

export async function updateTeam(
  id: string,
  updates: Partial<Team>,
): Promise<void> {
  await updateDoc(doc(db, "teams", id), updates);
}

export type TeamWithRole = Team & { role: "admin" | "member" };

export async function getAllUserMemberships(
  userId: string,
): Promise<TeamMember[]> {
  const q = query(collection(db, "teamMembers"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as TeamMember);
}

export async function getUserMemberships(
  userId: string,
): Promise<TeamWithRole[]> {
  const q = query(collection(db, "teamMembers"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);

  const memberships = querySnapshot.docs
    .map((doc) => doc.data() as TeamMember)
    .filter((m) => m.status === "active");

  if (memberships.length === 0) return [];

  const teamIds = memberships.map((m) => m.teamId);
  const roleMap: Record<string, "admin" | "member"> = {};
  memberships.forEach((m) => (roleMap[m.teamId] = m.role));

  const teams: TeamWithRole[] = [];
  // Firestore 'in' query has a limit of 10
  const teamsQuery = query(collection(db, "teams"), where("id", "in", teamIds));
  const teamsSnapshot = await getDocs(teamsQuery);

  teamsSnapshot.forEach((doc) => {
    const team = doc.data() as Team;
    teams.push({
      ...team,
      role: roleMap[team.id],
    });
  });

  return teams;
}

export async function getUserTeams(userId: string): Promise<Team[]> {
  const q = query(collection(db, "teamMembers"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  const teamIds = querySnapshot.docs
    .map((doc) => doc.data() as TeamMember)
    .filter((m) => m.status === "active")
    .map((m) => m.teamId);

  if (teamIds.length === 0) return [];

  const teams: Team[] = [];
  // Firestore 'in' query has a limit of 10, but good enough for now
  const teamsQuery = query(collection(db, "teams"), where("id", "in", teamIds));
  const teamsSnapshot = await getDocs(teamsQuery);
  teamsSnapshot.forEach((doc) => {
    teams.push(doc.data() as Team);
  });

  return teams;
}

/**
 * Real-time subscription for combined team and membership data.
 */
export function subscribeUserMemberships(
  userId: string,
  onData: (data: TeamWithRole[]) => void,
  onError: (err: Error) => void,
) {
  const q = query(collection(db, "teamMembers"), where("userId", "==", userId));

  return onSnapshot(
    q,
    async (snap) => {
      const memberships = snap.docs
        .map((d) => d.data() as TeamMember)
        .filter((m) => m.status === "active");
      if (memberships.length === 0) {
        onData([]);
        return;
      }

      const teamIds = memberships.map((m) => m.teamId);
      const roleMap: Record<string, "admin" | "member"> = {};
      memberships.forEach((m) => (roleMap[m.teamId] = m.role));

      try {
        const teamsQuery = query(
          collection(db, "teams"),
          where("id", "in", teamIds),
        );
        const teamsSnap = await getDocs(teamsQuery);

        const teamsWithRoles = teamsSnap.docs.map((d) => {
          const team = d.data() as Team;
          return {
            ...team,
            role: roleMap[team.id],
          };
        });

        onData(teamsWithRoles);
      } catch (err) {
        onError(err as Error);
      }
    },
    onError,
  );
}

export function subscribeUserTeams(
  userId: string,
  onData: (teams: Team[]) => void,
  onError: (err: Error) => void,
) {
  const q = query(collection(db, "teamMembers"), where("userId", "==", userId));
  return onSnapshot(
    q,
    async (snap) => {
      const teamIds = snap.docs
        .map((d) => d.data() as TeamMember)
        .filter((m) => m.status === "active")
        .map((m) => m.teamId);
      if (teamIds.length === 0) {
        onData([]);
        return;
      }
      const teamsQuery = query(
        collection(db, "teams"),
        where("id", "in", teamIds),
      );
      const teamsSnap = await getDocs(teamsQuery);
      onData(teamsSnap.docs.map((d) => d.data() as Team));
    },
    onError,
  );
}

// ─── Membership Operations ───

export async function addTeamMember(
  teamId: string,
  userId: string,
  role: "admin" | "member" = "member",
  userName?: string,
  userAvatarUrl?: string,
): Promise<void> {
  const member: TeamMember = {
    id: `${teamId}_${userId}`,
    teamId,
    userId,
    role,
    status: "active",
    joinedAt: new Date().toISOString(),
  };

  if (userName !== undefined) member.userName = userName;
  if (userAvatarUrl !== undefined) member.userAvatarUrl = userAvatarUrl;

  await setDoc(doc(db, "teamMembers", member.id), member);
}

export async function removeTeamMember(
  teamId: string,
  userId: string,
): Promise<void> {
  await updateDoc(doc(db, "teamMembers", `${teamId}_${userId}`), {
    status: "removed",
  });
}

// ─── Invitation Operations ───

export async function createInvitation(
  teamId: string,
  email: string,
  invitedBy: string,
  role: "admin" | "member" = "member",
): Promise<Invitation> {
  const invitation: Invitation = {
    id: uuidv4(), // token
    teamId,
    email,
    role,
    status: "pending",
    invitedBy,
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
  };
  await setDoc(doc(db, "invitations", invitation.id), invitation);
  return invitation;
}

export async function getInvitation(
  tokenId: string,
): Promise<Invitation | undefined> {
  const docRef = doc(db, "invitations", tokenId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as Invitation) : undefined;
}

export async function acceptInvitation(
  tokenId: string,
  userId: string,
  userName?: string,
  userAvatarUrl?: string,
): Promise<void> {
  const invitation = await getInvitation(tokenId);
  if (!invitation || invitation.status !== "pending") {
    throw new Error("Invalid or expired invitation");
  }

  const existingTeams = await getUserTeams(userId);
  if (existingTeams.length > 0) {
    throw new Error("You are already a member of a team.");
  }

  await addTeamMember(
    invitation.teamId,
    userId,
    invitation.role,
    userName,
    userAvatarUrl,
  );
  await updateDoc(doc(db, "invitations", tokenId), { status: "accepted" });
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const q = query(
    collection(db, "teamMembers"),
    where("teamId", "==", teamId),
    orderBy("joinedAt", "desc"),
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as TeamMember);
}

export function subscribeTeamMembers(
  teamId: string,
  onData: (members: TeamMember[]) => void,
  onError: (err: Error) => void,
) {
  const q = query(
    collection(db, "teamMembers"),
    where("teamId", "==", teamId),
    orderBy("joinedAt", "desc"),
  );

  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as TeamMember));
    },
    onError,
  );
}

export async function getPendingInvitations(
  teamId: string,
): Promise<Invitation[]> {
  const q = query(
    collection(db, "invitations"),
    where("teamId", "==", teamId),
    where("status", "==", "pending"),
    orderBy("expiresAt", "desc"),
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as Invitation);
}
