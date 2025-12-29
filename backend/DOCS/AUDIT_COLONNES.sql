-- ============================================================================
-- AUDIT COMPLET DES COLONNES - Tables principales
-- ============================================================================
-- Exécutez ce script dans SSMS pour voir toutes les colonnes disponibles
-- ============================================================================

PRINT '===================================================================='
PRINT 'TABLE: dbo.centres'
PRINT '===================================================================='
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'centres'
ORDER BY ORDINAL_POSITION

PRINT ''
PRINT '===================================================================='
PRINT 'TABLE: dbo.postes'
PRINT '===================================================================='
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'postes'
ORDER BY ORDINAL_POSITION

PRINT ''
PRINT '===================================================================='
PRINT 'TABLE: dbo.taches'
PRINT '===================================================================='
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'taches'
ORDER BY ORDINAL_POSITION

PRINT ''
PRINT '===================================================================='
PRINT 'TABLE: dbo.centre_postes'
PRINT '===================================================================='
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'centre_postes'
ORDER BY ORDINAL_POSITION

PRINT ''
PRINT '===================================================================='
PRINT 'RECHERCHE: Toutes les colonnes contenant "code"'
PRINT '===================================================================='
SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' 
  AND COLUMN_NAME LIKE '%code%'
ORDER BY TABLE_NAME, COLUMN_NAME
