# HubSpot CRM Integration Plan

## Context

Reptrainer is an AI sales training platform where reps practice live roleplay calls with AI buyer personas. After each call, reps get scores, transcripts, and coaching debriefs. Currently, none of this training data flows into the team's CRM — sales managers can't correlate training performance with deal outcomes. This integration syncs training data to HubSpot so managers can see rep readiness alongside their pipeline.

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where integration code lives | `apps/api/src/services/crm/` | API server already has Firebase Admin, auth middleware, and handles all server-side AI calls. Natural home for OAuth token management and outbound API calls. |
| Sync trigger | Web client calls API after session ends | No Cloud Functions or event system exists today. The client already orchestrates post-call flow (`updateCallSession` → `updateUserMetrics`). Adding one more fire-and-forget API call is simplest. |
| Scope | One integration per team, not per user | HubSpot is a team-level CRM. Admin connects once, all team members' data syncs to the same portal. Matches existing team-scoped multi-tenancy. |
| Token storage | Encrypted in Firestore | OAuth tokens are sensitive. AES-256-GCM encryption with a server-side key adds defense in depth beyond Firestore security rules. |
| Contact matching | By email, not by creating new contacts | Reps likely already exist as HubSpot contacts. Creating new ones would cause duplicates. Match by Firebase Auth email, optionally create if missing. |
| CRM abstraction | `CrmProvider` interface | Enables future Salesforce/Pipedrive support without rewriting sync logic. |

---

## Data Mapping

### HubSpot Contact Properties (custom, group: `reptrainer`)

| Property | Internal Name | Type | Source |
|----------|--------------|------|--------|
| Avg Score | `reptrainer_avg_score` | number | `UserMetrics.averageScore` |
| Total Sessions | `reptrainer_total_sessions` | number | `UserMetrics.totalCalls` |
| Practice Streak | `reptrainer_practice_streak` | number | `UserMetrics.practiceStreak` |
| Objection Handling Avg | `reptrainer_objection_avg` | number | `UserMetrics.objectionHandlingAverage` |
| Closing Avg | `reptrainer_closing_avg` | number | `UserMetrics.closingAverage` |
| Discovery Avg | `reptrainer_discovery_avg` | number | `UserMetrics.discoveryAverage` |
| Last Practice Date | `reptrainer_last_practice` | date | `UserMetrics.lastPracticeDate` |
| Total Training Minutes | `reptrainer_total_minutes` | number | `UserMetrics.totalDurationSeconds / 60` |

### HubSpot Custom Object: `training_session`

| Property | Type | Source |
|----------|------|--------|
| `session_id` | string (unique) | `CallSession.id` |
| `session_date` | datetime | `CallSession.callStartTime` |
| `persona_name` | string | `Persona.name` |
| `persona_role` | string | `Persona.role` |
| `overall_score` | number | `FeedbackReport.overall_score` |
| `objection_handling_score` | number | `FeedbackReport.objection_handling_score` |
| `closing_score` | number | `FeedbackReport.closing_effectiveness_score` |
| `duration_seconds` | number | `CallSession.durationSeconds` |
| `strengths` | text | `JSON.stringify(FeedbackReport.strengths)` |
| `weaknesses` | text | `JSON.stringify(FeedbackReport.weaknesses)` |

Associated to the Contact via HubSpot Associations API.

---

## Integration Flows

### OAuth Connection (admin connects HubSpot)

```
[Admin: "Connect HubSpot" on Team Settings]
  → GET /api/integrations/hubspot/auth?teamId=xxx
  → Generate state token, store in Firestore (crmOauthStates/{token})
  → Redirect to HubSpot OAuth authorize URL
  → HubSpot redirects to /api/integrations/hubspot/callback?code=...&state=...
  → Validate state, exchange code for tokens
  → Encrypt tokens, store in Firestore (crmIntegrations/{teamId})
  → Provision custom properties + custom object schema (idempotent)
  → Redirect to /dashboard/team?hubspot=connected
```

### Session Sync (after each call)

```
[Rep ends call]
  → updateCallSession(callStatus: "ended")
  → updateUserMetrics()
  → POST /api/integrations/crm/sync-session { teamId, userId, sessionId }  ← NEW
      → Check crmIntegrations/{teamId} exists & enabled
      → Refresh OAuth token if expired
      → Fetch CallSession + UserMetrics from Firestore
      → Find HubSpot contact by rep's email
      → Update contact properties (aggregate metrics)
      → Create training_session custom object + associate to contact
      → Log result to crmSyncLogs
  → (fire-and-forget, failures logged server-side)
```

---

## New Files

```
apps/api/src/
  routes/
    integrations.ts                 # Express router: /api/integrations/*
  services/
    crm/
      crm-provider.ts              # Abstract CrmProvider interface
      hubspot-provider.ts          # HubSpot implementation (uses @hubspot/api-client)
      hubspot-schema.ts            # Custom object/property provisioning
      crm-sync.ts                  # Orchestrator: picks provider, runs sync
      token-manager.ts             # OAuth token refresh logic
      encryption.ts                # AES-256-GCM encrypt/decrypt for tokens

apps/web/
  lib/db/
    integrations.ts                # Firestore reads for crmIntegrations (status checks)
  components/
    integrations/
      hubspot-connect-card.tsx     # "Connect to HubSpot" UI card
      sync-status-badge.tsx        # Shows last sync time/status
  app/dashboard/team/
    integrations/
      page.tsx                     # Integrations settings page
```

## Files to Modify

| File | Change |
|------|--------|
| [packages/shared/src/types.ts](packages/shared/src/types.ts) | Add `CrmIntegration`, `CrmSyncLog`, `CrmFieldMapping`, `CrmProviderType` types |
| [apps/api/src/config/env.ts](apps/api/src/config/env.ts) | Add `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `HUBSPOT_REDIRECT_URI`, `CRM_ENCRYPTION_KEY` (all optional) |
| [apps/api/src/index.ts](apps/api/src/index.ts) | Mount `integrationRoutes` at `/api/integrations` |
| [apps/web/components/roleplay-session.tsx](apps/web/components/roleplay-session.tsx) | Add fire-and-forget `POST /api/integrations/crm/sync-session` after `updateUserMetrics` (~line 451) |
| [apps/web/app/dashboard/team/page.tsx](apps/web/app/dashboard/team/page.tsx) | Add link/card for HubSpot integration settings |
| [apps/api/package.json](apps/api/package.json) | Add `@hubspot/api-client` dependency |

## New Firestore Collections

| Collection | Key | Purpose |
|------------|-----|---------|
| `crmIntegrations/{teamId}` | teamId | Stores provider type, encrypted tokens, sync settings. One doc per team. |
| `crmSyncLogs/{autoId}` | auto | Append-only log of sync attempts (teamId, userId, sessionId, status, error). |
| `crmOauthStates/{stateToken}` | UUID | Ephemeral. Maps state token → teamId during OAuth flow. TTL-based, deleted after callback. |

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/integrations/hubspot/auth` | API Secret | Initiate OAuth, redirect to HubSpot |
| `GET` | `/api/integrations/hubspot/callback` | None (HubSpot callback) | Exchange code for tokens, store encrypted |
| `POST` | `/api/integrations/crm/sync-session` | API Secret | Sync one session + metrics to CRM |
| `POST` | `/api/integrations/crm/sync-all` | API Secret | Bulk sync all team members (on-demand) |
| `GET` | `/api/integrations/crm/status` | API Secret | Integration status + last sync info |
| `DELETE` | `/api/integrations/crm/disconnect` | API Secret | Revoke tokens, remove integration |

## Environment Variables (apps/api)

```
HUBSPOT_CLIENT_ID=              # From HubSpot developer portal
HUBSPOT_CLIENT_SECRET=          # From HubSpot developer portal
HUBSPOT_REDIRECT_URI=           # e.g. https://api.reptrainer.com/api/integrations/hubspot/callback
CRM_ENCRYPTION_KEY=             # 32-byte hex string for AES-256-GCM
```

## HubSpot OAuth Scopes

```
crm.objects.contacts.read
crm.objects.contacts.write
crm.schemas.custom.read
crm.schemas.custom.write
crm.objects.custom.read
crm.objects.custom.write
oauth
```

---

## Phases

### Phase 1: OAuth + Contact Property Sync (MVP)

**Goal**: Admin connects HubSpot. After each session, rep's aggregate metrics sync to their HubSpot contact.

1. Add CRM types to `packages/shared/src/types.ts`
2. Add env vars to `apps/api/src/config/env.ts` (all optional so existing deploys don't break)
3. Implement `encryption.ts` (AES-256-GCM)
4. Implement `token-manager.ts` (refresh flow)
5. Implement `hubspot-provider.ts` — `findContactByEmail()`, `updateContactProperties()`, `ensureCustomProperties()`
6. Implement `routes/integrations.ts` — OAuth routes, `POST /sync-session`, `GET /status`, `DELETE /disconnect`
7. Mount routes in `apps/api/src/index.ts`
8. Add "Connect HubSpot" card to team settings page
9. Add `syncToCrm()` call in `roleplay-session.tsx` after `updateUserMetrics`

**Syncs**: Contact properties only (aggregate scores). No custom objects yet.

### Phase 2: Custom Objects + Session Detail Sync

**Goal**: Each completed session creates a `training_session` record in HubSpot, linked to the contact.

1. Implement `hubspot-schema.ts` — create custom object schema (idempotent, runs on OAuth connect)
2. Extend `hubspot-provider.ts` — `createTrainingSession()`, `associateSessionToContact()`
3. Extend `POST /sync-session` to create custom object records
4. Add sync log viewer to integrations page

### Phase 3: Bulk Sync + CRM Abstraction

**Goal**: On-demand bulk sync. Prepare for Salesforce/Pipedrive.

1. Implement `crm-provider.ts` interface
2. Implement `crm-sync.ts` factory (picks provider by `CrmIntegration.provider`)
3. Implement `POST /sync-all` endpoint
4. Add field mapping configuration UI
5. Add "Sync All" button to integrations page

### Phase 4: Salesforce Provider (future)

1. Implement `salesforce-provider.ts` following `CrmProvider` interface
2. Add Salesforce OAuth flow
3. Map to Salesforce custom objects or Activity records

---

## Verification

1. **OAuth flow**: Click "Connect HubSpot" → redirect to HubSpot → authorize → redirect back → verify `crmIntegrations/{teamId}` doc created with encrypted tokens
2. **Property provisioning**: After OAuth, verify custom property group `reptrainer` and all 8 properties exist in HubSpot Settings → Properties
3. **Session sync**: Complete a roleplay call → check HubSpot contact record for updated `reptrainer_*` properties
4. **Custom object sync** (Phase 2): Complete a call → verify `training_session` record created and associated to contact in HubSpot
5. **Token refresh**: Wait for token expiry (or force-expire) → verify next sync auto-refreshes
6. **Disconnect**: Click "Disconnect" → verify tokens removed from Firestore, HubSpot properties remain (data preservation)
7. **Error resilience**: Disable network to HubSpot → complete a call → verify sync fails gracefully (logged in `crmSyncLogs`), user experience unaffected
