# Security Specification: Torneo Hockey 2026

## 1. Data Invariants
1. A match cannot enter a "played" state (score updates) without valid team names that exist in the `teams` collection.
2. Only administrators (defined in `admins/{userId}`) can create or update teams and settings.
3. Only administrators can update match scores.
4. Settings MUST have a valid title.

## 2. The "Dirty Dozen" Payloads (Deny cases)
1. **Unauthenticated Write**: Non-signed-in user tries to update `app/settings`.
2. **Identity Spoofing**: Signed-in non-admin user tries to create an admin document for themselves.
3. **Ghost Field in Settings**: Admin tries to add `isSecret: true` to `app/settings`.
4. **Invalid Group**: Admin tries to set a team's group to 'C'.
5. **Score Injection**: Admin tries to set a score to a string "999".
6. **Time Poisoning**: Admin tries to set match time to a 500kb string.
7. **Malicious Match ID**: Admin tries to use a 2MB string as a match ID.
8. **Impersonation**: User A tries to update a match but their UID doesn't match an admin record.
9. **Settings Title size**: Admin tries to set title to a 10,000 character string.
10. **Admin Self-Assignment**: Non-admin user tries to write to the `admins` collection.
11. **Type Mismatch on Team**: Setting `isRest` to "yes" (string) instead of boolean.
12. **Blanket Read of Admins**: Unauthenticated user trying to list the `admins` collection (should be restricted).

## 3. The Test Runner Plan
I'll create a simulation in the rules themselves. (Note: I cannot actually run `vitest` or similar here easily, but I will write the rules and verify them with the linter).

# Phase 1: Relationship Mapping
- Matches are standalone but refer to Team names.
- RBAC is managed via the `admins` collection.

# Phase 2: Primitive Definition
```javascript
function isAdmin() {
  return isSignedIn() && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}
```
