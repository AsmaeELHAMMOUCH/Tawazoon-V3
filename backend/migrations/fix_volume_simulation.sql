-- Migration: Corriger la table VolumeSimulation pour la nouvelle architecture Flux/Sens/Segment
-- Date: 2025-12-30

USE SIMULATEUR_RH;
GO

-- Étape 1: Supprimer la contrainte unique existante si elle existe
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_vol_sim_match' AND object_id = OBJECT_ID('dbo.volume_simulation'))
BEGIN
    DROP INDEX idx_vol_sim_match ON dbo.volume_simulation;
END
GO

-- Étape 2: Supprimer la colonne doublon flux__id si elle existe
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.volume_simulation') AND name = 'flux__id')
BEGIN
    ALTER TABLE dbo.volume_simulation DROP COLUMN flux__id;
END
GO

-- Étape 3: Ajouter centre_poste_id si elle n'existe pas
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.volume_simulation') AND name = 'centre_poste_id')
BEGIN
    ALTER TABLE dbo.volume_simulation 
    ADD centre_poste_id INT NOT NULL DEFAULT 0;
    
    -- Ajouter la FK
    ALTER TABLE dbo.volume_simulation
    ADD CONSTRAINT FK_volume_simulation_centre_poste
    FOREIGN KEY (centre_poste_id) REFERENCES dbo.centre_postes(id);
END
GO

-- Étape 4: Créer la contrainte UNIQUE sur la combinaison complète
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_volume_simulation_keys' AND object_id = OBJECT_ID('dbo.volume_simulation'))
BEGIN
    ALTER TABLE dbo.volume_simulation
    ADD CONSTRAINT UQ_volume_simulation_keys 
    UNIQUE (simulation_id, centre_poste_id, flux_id, sens_id, segment_id);
END
GO

-- Étape 5: Créer l'index de performance pour les JOINs
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_volume_simulation_match' AND object_id = OBJECT_ID('dbo.volume_simulation'))
BEGIN
    CREATE INDEX IDX_volume_simulation_match 
    ON dbo.volume_simulation(simulation_id, centre_poste_id, flux_id, sens_id, segment_id);
END
GO

-- Étape 6: Créer l'index sur taches pour les JOINs (si pas déjà existant)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_taches_match' AND object_id = OBJECT_ID('dbo.taches'))
BEGIN
    CREATE INDEX IDX_taches_match 
    ON dbo.taches(centre_poste_id, flux_id, sens_id, segment_id);
END
GO

PRINT 'Migration VolumeSimulation terminée avec succès!';
GO
