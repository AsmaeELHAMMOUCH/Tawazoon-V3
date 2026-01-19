-- ============================================================================
-- SEED VOLUME MAPPING RULES - COMPLET ET IDEMPOTENT
-- ============================================================================
-- Ce script ajoute toutes les règles de mapping nécessaires
-- Exécution : sqlcmd -S server -d database -i seed_volume_mapping_rules.sql
-- ============================================================================

USE [votre_base_de_donnees];
GO

-- ============================================================================
-- 1. RÈGLES GUICHET (PRIORITÉ MAXIMALE)
-- ============================================================================
-- Ces règles s'appliquent à toutes les tâches avec sens=DEPOT ou sens=RECUP
-- peu importe le flux ou le segment
-- ============================================================================

-- Règle pour DEPOT (sens_id=2)
IF NOT EXISTS (
    SELECT 1 FROM dbo.volume_mapping_rules 
    WHERE sens_id = 2 AND flux_id IS NULL AND segment_id IS NULL
)
BEGIN
    INSERT INTO dbo.volume_mapping_rules (flux_id, sens_id, segment_id, nom_tache_keyword, ui_path, priority, description)
    VALUES (NULL, 2, NULL, NULL, 'guichet.depot', 1000, 'Guichet DEPOT - Règle globale pour tous flux/segments');
    PRINT '✅ Règle DEPOT ajoutée';
END
ELSE
    PRINT '⚠️  Règle DEPOT existe déjà';

-- Règle pour RECUP (sens_id=3)
IF NOT EXISTS (
    SELECT 1 FROM dbo.volume_mapping_rules 
    WHERE sens_id = 3 AND flux_id IS NULL AND segment_id IS NULL
)
BEGIN
    INSERT INTO dbo.volume_mapping_rules (flux_id, sens_id, segment_id, nom_tache_keyword, ui_path, priority, description)
    VALUES (NULL, 3, NULL, NULL, 'guichet.recup', 1000, 'Guichet RECUP - Règle globale pour tous flux/segments');
    PRINT '✅ Règle RECUP ajoutée';
END
ELSE
    PRINT '⚠️  Règle RECUP existe déjà';

-- ============================================================================
-- 2. RÈGLES FLUX ARRIVÉE (sens_id=1)
-- ============================================================================
-- Génération automatique pour tous les flux × segments
-- ============================================================================

DECLARE @flux_id INT, @flux_code NVARCHAR(50), @flux_code_lower NVARCHAR(50);
DECLARE @segment_id INT, @segment_code NVARCHAR(50), @segment_field NVARCHAR(50);
DECLARE @ui_path NVARCHAR(200), @description NVARCHAR(500);

-- Mapping des codes segments vers les champs UI
DECLARE @segment_mapping TABLE (segment_code NVARCHAR(50), segment_field NVARCHAR(50));
INSERT INTO @segment_mapping VALUES 
    ('GLOBAL', 'global_'),
    ('PARTICULIER', 'part'),
    ('PRO_B2B', 'pro'),
    ('DISTRIBUTION', 'dist'),
    ('AXES', 'axes');

-- Curseur sur les flux
DECLARE flux_cursor CURSOR FOR
SELECT id, code FROM dbo.flux WHERE code IN ('AMANA', 'CO', 'CR', 'EBARKIA', 'LRH');

OPEN flux_cursor;
FETCH NEXT FROM flux_cursor INTO @flux_id, @flux_code;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @flux_code_lower = LOWER(@flux_code);
    
    -- Curseur sur les segments
    DECLARE segment_cursor CURSOR FOR
    SELECT id, code FROM dbo.volume_segments WHERE code IN ('GLOBAL', 'PARTICULIER', 'PRO_B2B', 'DISTRIBUTION', 'AXES');
    
    OPEN segment_cursor;
    FETCH NEXT FROM segment_cursor INTO @segment_id, @segment_code;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Récupérer le champ UI correspondant
        SELECT @segment_field = segment_field FROM @segment_mapping WHERE segment_code = @segment_code;
        
        -- Construire le ui_path pour ARRIVEE
        SET @ui_path = 'flux_arrivee.' + @flux_code_lower + '.' + @segment_field;
        SET @description = 'Flux Arrivée - ' + @flux_code + ' - ' + @segment_code;
        
        -- Insérer si n'existe pas
        IF NOT EXISTS (
            SELECT 1 FROM dbo.volume_mapping_rules 
            WHERE flux_id = @flux_id AND sens_id = 1 AND segment_id = @segment_id
        )
        BEGIN
            INSERT INTO dbo.volume_mapping_rules (flux_id, sens_id, segment_id, nom_tache_keyword, ui_path, priority, description)
            VALUES (@flux_id, 1, @segment_id, NULL, @ui_path, 100, @description);
        END
        
        FETCH NEXT FROM segment_cursor INTO @segment_id, @segment_code;
    END
    
    CLOSE segment_cursor;
    DEALLOCATE segment_cursor;
    
    FETCH NEXT FROM flux_cursor INTO @flux_id, @flux_code;
END

CLOSE flux_cursor;
DEALLOCATE flux_cursor;

PRINT '✅ Règles FLUX ARRIVÉE générées';

-- ============================================================================
-- 3. RÈGLES FLUX DÉPART (sens_id=4)
-- ============================================================================

-- Curseur sur les flux
DECLARE flux_cursor2 CURSOR FOR
SELECT id, code FROM dbo.flux WHERE code IN ('AMANA', 'CO', 'CR', 'EBARKIA', 'LRH');

OPEN flux_cursor2;
FETCH NEXT FROM flux_cursor2 INTO @flux_id, @flux_code;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @flux_code_lower = LOWER(@flux_code);
    
    -- Curseur sur les segments
    DECLARE segment_cursor2 CURSOR FOR
    SELECT id, code FROM dbo.volume_segments WHERE code IN ('GLOBAL', 'PARTICULIER', 'PRO_B2B', 'DISTRIBUTION', 'AXES');
    
    OPEN segment_cursor2;
    FETCH NEXT FROM segment_cursor2 INTO @segment_id, @segment_code;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Récupérer le champ UI correspondant
        SELECT @segment_field = segment_field FROM @segment_mapping WHERE segment_code = @segment_code;
        
        -- Construire le ui_path pour DEPART
        SET @ui_path = 'flux_depart.' + @flux_code_lower + '.' + @segment_field;
        SET @description = 'Flux Départ - ' + @flux_code + ' - ' + @segment_code;
        
        -- Insérer si n'existe pas
        IF NOT EXISTS (
            SELECT 1 FROM dbo.volume_mapping_rules 
            WHERE flux_id = @flux_id AND sens_id = 4 AND segment_id = @segment_id
        )
        BEGIN
            INSERT INTO dbo.volume_mapping_rules (flux_id, sens_id, segment_id, nom_tache_keyword, ui_path, priority, description)
            VALUES (@flux_id, 4, @segment_id, NULL, @ui_path, 100, @description);
        END
        
        FETCH NEXT FROM segment_cursor2 INTO @segment_id, @segment_code;
    END
    
    CLOSE segment_cursor2;
    DEALLOCATE segment_cursor2;
    
    FETCH NEXT FROM flux_cursor2 INTO @flux_id, @flux_code;
END

CLOSE flux_cursor2;
DEALLOCATE flux_cursor2;

PRINT '✅ Règles FLUX DÉPART générées';

-- ============================================================================
-- 4. VÉRIFICATION FINALE
-- ============================================================================

DECLARE @total_rules INT, @guichet_rules INT, @arrivee_rules INT, @depart_rules INT;

SELECT @total_rules = COUNT(*) FROM dbo.volume_mapping_rules;
SELECT @guichet_rules = COUNT(*) FROM dbo.volume_mapping_rules WHERE sens_id IN (2, 3);
SELECT @arrivee_rules = COUNT(*) FROM dbo.volume_mapping_rules WHERE sens_id = 1;
SELECT @depart_rules = COUNT(*) FROM dbo.volume_mapping_rules WHERE sens_id = 4;

PRINT '';
PRINT '============================================================================';
PRINT 'RÉSUMÉ DES RÈGLES';
PRINT '============================================================================';
PRINT 'Total règles : ' + CAST(@total_rules AS NVARCHAR(10));
PRINT 'Règles Guichet (DEPOT/RECUP) : ' + CAST(@guichet_rules AS NVARCHAR(10));
PRINT 'Règles Flux Arrivée : ' + CAST(@arrivee_rules AS NVARCHAR(10));
PRINT 'Règles Flux Départ : ' + CAST(@depart_rules AS NVARCHAR(10));
PRINT '============================================================================';
PRINT '✅ SEED TERMINÉ';
PRINT '============================================================================';

GO
