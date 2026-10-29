-- Rename the legacy enum value. If both values already exist, keep the old
-- value as a temporary compatibility alias and normalize existing rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = '"RecommendationType"'::regtype
      AND enumlabel = 'RUTA_ACademica'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = '"RecommendationType"'::regtype
      AND enumlabel = 'RUTA_ACADEMICA'
  ) THEN
    ALTER TYPE "RecommendationType"
      RENAME VALUE 'RUTA_ACademica' TO 'RUTA_ACADEMICA';
  ELSIF EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = '"RecommendationType"'::regtype
      AND enumlabel = 'RUTA_ACademica'
  ) AND EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = '"RecommendationType"'::regtype
      AND enumlabel = 'RUTA_ACADEMICA'
  ) THEN
    UPDATE "recommendations"
    SET "type" = 'RUTA_ACADEMICA'
    WHERE "type" = 'RUTA_ACademica';
  END IF;
END
$$;
