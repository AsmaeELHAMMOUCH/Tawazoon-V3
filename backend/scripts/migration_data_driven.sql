-- ============================================================================
-- MIGRATION SQL - ARCHITECTURE DATA-DRIVEN
-- ============================================================================
-- Ce script crée les tables nécessaires pour l'architecture data-driven
-- À exécuter une seule fois sur la base de données
-- ============================================================================

-- ============================================================================
-- 1. TABLE : volume_mapping_rules
-- ============================================================================
-- Règles de mapping UI ↔ Tâche
-- Permet de résoudre automatiquement le volume UI à appliquer à chaque tâche
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'volume_mapping_rules' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.volume_mapping_rules (
        id INT IDENTITY(1,1) PRIMARY KEY,
        
        -- Critères de matching (NULL = wildcard)
        flux_id INT NULL,
        sens_id INT NULL,
        segment_id INT NULL,
        
        -- Critère optionnel : mot-clé dans nom_tache (pour guichet)
        nom_tache_keyword NVARCHAR(100) NULL,
        
        -- Chemin dans la structure UI (ex: "flux_arrivee.amana.global_")
        ui_path NVARCHAR(200) NOT NULL,
        
        -- Priorité (pour gérer les conflits, plus élevé = prioritaire)
        priority INT DEFAULT 0,
        
        -- Description pour la documentation
        description NVARCHAR(500) NULL,
        
        -- Clés étrangères
        CONSTRAINT FK_volume_mapping_flux FOREIGN KEY (flux_id) REFERENCES dbo.flux(id),
        CONSTRAINT FK_volume_mapping_sens FOREIGN KEY (sens_id) REFERENCES dbo.volume_sens(id),
        CONSTRAINT FK_volume_mapping_segment FOREIGN KEY (segment_id) REFERENCES dbo.volume_segments(id)
    );
    
    -- Index pour améliorer les performances
    CREATE INDEX IDX_volume_mapping_flux ON dbo.volume_mapping_rules(flux_id);
    CREATE INDEX IDX_volume_mapping_sens ON dbo.volume_mapping_rules(sens_id);
    CREATE INDEX IDX_volume_mapping_segment ON dbo.volume_mapping_rules(segment_id);
    CREATE INDEX IDX_volume_mapping_priority ON dbo.volume_mapping_rules(priority DESC);
    
    PRINT '✅ Table volume_mapping_rules créée avec succès';
END
ELSE
BEGIN
    PRINT '⚠️  Table volume_mapping_rules existe déjà';
END
GO

-- ============================================================================
-- 2. TABLE : unite_conversion_rules
-- ============================================================================
-- Règles de conversion d'unités
-- Permet d'appliquer automatiquement les facteurs de conversion
-- Exemple : 1 sac = 5 colis → facteur_conversion = 0.2
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'unite_conversion_rules' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.unite_conversion_rules (
        id INT IDENTITY(1,1) PRIMARY KEY,
        
        -- Unité de mesure (doit correspondre à Tache.unite_mesure)
        unite_mesure NVARCHAR(50) NOT NULL UNIQUE,
        
        -- Facteur de conversion à appliquer au volume
        -- volume_applicable = volume_ui * facteur_conversion
        -- Ex: Sac → 0.2 (car 1 sac = 5 colis)
        facteur_conversion FLOAT NOT NULL DEFAULT 1.0,
        
        -- Description
        description NVARCHAR(500) NULL,
        
        -- Contrainte d'unicité
        CONSTRAINT UQ_unite_mesure UNIQUE (unite_mesure)
    );
    
    PRINT '✅ Table unite_conversion_rules créée avec succès';
END
ELSE
BEGIN
    PRINT '⚠️  Table unite_conversion_rules existe déjà';
END
GO

-- ============================================================================
-- 3. TABLE : volume_normalization (OPTIONNELLE)
-- ============================================================================
-- Stockage des volumes normalisés pour une simulation donnée
-- Permet de tracer les volumes utilisés dans chaque simulation
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'volume_normalization' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.volume_normalization (
        id INT IDENTITY(1,1) PRIMARY KEY,
        
        -- Référence à la simulation (optionnel, peut être NULL pour simulation directe)
        simulation_id INT NULL,
        
        -- Dimensions du volume
        centre_poste_id INT NOT NULL,
        flux_id INT NULL,
        sens_id INT NOT NULL,
        segment_id INT NULL,
        
        -- Produit (optionnel, pour traçabilité)
        produit NVARCHAR(50) NULL,
        
        -- Volume annuel
        volume_annuel FLOAT NOT NULL DEFAULT 0.0,
        
        -- Volume journalier (calculé automatiquement)
        volume_jour FLOAT NOT NULL DEFAULT 0.0,
        
        -- Source UI (pour debug)
        source_ui_path NVARCHAR(200) NULL,
        
        -- Clés étrangères
        CONSTRAINT FK_volume_norm_centre_poste FOREIGN KEY (centre_poste_id) REFERENCES dbo.centre_postes(id),
        CONSTRAINT FK_volume_norm_flux FOREIGN KEY (flux_id) REFERENCES dbo.flux(id),
        CONSTRAINT FK_volume_norm_sens FOREIGN KEY (sens_id) REFERENCES dbo.volume_sens(id),
        CONSTRAINT FK_volume_norm_segment FOREIGN KEY (segment_id) REFERENCES dbo.volume_segments(id),
        
        -- Contrainte d'unicité
        CONSTRAINT UQ_volume_norm UNIQUE (simulation_id, centre_poste_id, flux_id, sens_id, segment_id)
    );
    
    -- Index pour améliorer les performances
    CREATE INDEX IDX_volume_norm_simulation ON dbo.volume_normalization(simulation_id);
    CREATE INDEX IDX_volume_norm_centre_poste ON dbo.volume_normalization(centre_poste_id);
    
    PRINT '✅ Table volume_normalization créée avec succès';
END
ELSE
BEGIN
    PRINT '⚠️  Table volume_normalization existe déjà';
END
GO

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

PRINT '';
PRINT '============================================================================';
PRINT 'VÉRIFICATION DES TABLES CRÉÉES';
PRINT '============================================================================';

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'volume_mapping_rules' AND schema_id = SCHEMA_ID('dbo'))
    PRINT '✅ volume_mapping_rules : OK';
ELSE
    PRINT '❌ volume_mapping_rules : MANQUANTE';

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'unite_conversion_rules' AND schema_id = SCHEMA_ID('dbo'))
    PRINT '✅ unite_conversion_rules : OK';
ELSE
    PRINT '❌ unite_conversion_rules : MANQUANTE';

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'volume_normalization' AND schema_id = SCHEMA_ID('dbo'))
    PRINT '✅ volume_normalization : OK';
ELSE
    PRINT '❌ volume_normalization : MANQUANTE';

PRINT '============================================================================';
PRINT '✅ MIGRATION TERMINÉE';
PRINT '============================================================================';
PRINT '';
PRINT '💡 PROCHAINES ÉTAPES :';
PRINT '   1. Exécuter : python scripts/init_mapping_rules.py';
PRINT '   2. Exécuter : python scripts/test_data_driven.py';
PRINT '   3. Tester les endpoints : /api/simulation-dd/*';
PRINT '';
GO
