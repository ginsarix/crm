UPDATE "user" u
SET "lastLoginAt" = sub."maxCreatedAt"
FROM (
  SELECT "userId", MAX("createdAt") AS "maxCreatedAt"
  FROM "LoginEvent"
  GROUP BY "userId"
) sub
WHERE u.id = sub."userId";
