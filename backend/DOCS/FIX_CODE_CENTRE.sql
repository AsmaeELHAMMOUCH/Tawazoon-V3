-- ============================================================================
-- DIAGNOSTIC ET CORRECTIF : Colonne code_centre dans dbo.taches
-- ============================================================================
-- Date : 2025-12-29
-- Objectif : Identifier et supprimer la colonne obsolète 'code_centre'
-- ============================================================================

-- 1️⃣ DIAGNOSTIC : Vérifier si la colonne existe
-- ============================================================================
PRINT '==================================================================='
PRINT '1. VÉRIFICATION DE L''EXISTENCE DE code_centre'
PRINT '==================================================================='

SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' 
  AND TABLE_NAME = 'taches'
  AND COLUMN_NAME = 'code_centre'

-- Si la requête ci-dessus retourne une ligne, la colonne existe
-- Sinon, le problème vient d'ailleurs (vue, trigger, contrainte)

-- 2️⃣ VÉRIFIER LES CONTRAINTES UTILISANT code_centre
-- ============================================================================
PRINT ''
PRINT '==================================================================='
PRINT '2. CONTRAINTES RÉFÉRENÇANT code_centre'
PRINT '==================================================================='

SELECT 
    c.name AS constraint_name,
    t.name AS table_name,
    col.name AS column_name,
    c.type_desc
FROM sys.check_constraints c
INNER JOIN sys.tables t ON c.parent_object_id = t.object_id
INNER JOIN sys.columns col ON col.object_id = t.object_id
WHERE c.definition LIKE '%code_centre%'
   OR col.name = 'code_centre'

-- 3️⃣ VÉRIFIER LES TRIGGERS UTILISANT code_centre
-- ============================================================================
PRINT ''
PRINT '==================================================================='
PRINT '3. TRIGGERS RÉFÉRENÇANT code_centre'
PRINT '==================================================================='

SELECT 
    t.name AS trigger_name,
    OBJECT_NAME(t.parent_id) AS table_name,
    m.definition
FROM sys.triggers t
INNER JOIN sys.sql_modules m ON t.object_id = m.object_id
WHERE m.definition LIKE '%code_centre%'

-- 4️⃣ VÉRIFIER LES VUES UTILISANT code_centre
-- ============================================================================
PRINT ''
PRINT '==================================================================='
PRINT '4. VUES RÉFÉRENÇANT code_centre'
PRINT '==================================================================='

SELECT 
    TABLE_NAME,
    VIEW_DEFINITION
FROM INFORMATION_SCHEMA.VIEWS
WHERE TABLE_SCHEMA = 'dbo'
  AND VIEW_DEFINITION LIKE '%code_centre%'

-- ============================================================================
-- 5️⃣ CORRECTIF : Supprimer la colonne code_centre (SI ELLE EXISTE)
-- ============================================================================
-- ⚠️ ATTENTION : Décommentez UNIQUEMENT si vous êtes sûr que code_centre
--                n'est plus utilisée et peut être supprimée
-- ============================================================================

/*
PRINT ''
PRINT '==================================================================='
PRINT '5. SUPPRESSION DE LA COLONNE code_centre'
PRINT '==================================================================='

-- Vérifier d'abord si la colonne existe
IF EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_NAME = 'taches' 
      AND COLUMN_NAME = 'code_centre'
)
BEGIN
    PRINT 'Suppression de la colonne code_centre...'
    
    -- Supprimer les contraintes liées si nécessaire
    DECLARE @sql NVARCHAR(MAX)
    SELECT @sql = 'ALTER TABLE dbo.taches DROP CONSTRAINT ' + QUOTENAME(name)
    FROM sys.default_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.taches')
      AND parent_column_id = (
          SELECT column_id 
          FROM sys.columns 
          WHERE object_id = OBJECT_ID('dbo.taches') 
            AND name = 'code_centre'
      )
    
    IF @sql IS NOT NULL
        EXEC sp_executesql @sql
    
    -- Supprimer la colonne
    ALTER TABLE dbo.taches DROP COLUMN code_centre
    
    PRINT '✅ Colonne code_centre supprimée avec succès'
END
ELSE
BEGIN
    PRINT '⚠️  La colonne code_centre n''existe pas dans dbo.taches'
    PRINT '    Le problème vient probablement d''une vue, trigger ou contrainte'
END
*/

-- ============================================================================
-- 6️⃣ ALTERNATIVE : Renommer la colonne au lieu de la supprimer
-- ============================================================================
-- Si vous préférez conserver les données pour archivage
-- ============================================================================

/*
IF EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_NAME = 'taches' 
      AND COLUMN_NAME = 'code_centre'
)
BEGIN
    EXEC sp_rename 'dbo.taches.code_centre', 'code_centre_OLD', 'COLUMN'
    PRINT '✅ Colonne renommée en code_centre_OLD'
END
*/

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
PRINT ''
PRINT '==================================================================='
PRINT 'DIAGNOSTIC TERMINÉ'
PRINT '==================================================================='
PRINT ''
PRINT 'ACTIONS RECOMMANDÉES :'
PRINT '1. Examinez les résultats ci-dessus'
PRINT '2. Si code_centre existe dans dbo.taches, décommentez la section 5'
PRINT '3. Si code_centre est dans une vue/trigger, corrigez la vue/trigger'
PRINT '4. Relancez l''application après correction'
PRINT '==================================================================='
