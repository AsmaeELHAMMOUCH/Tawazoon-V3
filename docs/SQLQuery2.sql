SELECT
          c.id,
          c.T_APS, -- ✅ AJOUT: Récupération du champ T_APS
          c.label,
          c.region_id,
          c.categorie_id,
          c.id_categorisation AS id_categorisation,
          COALESCE(p.nb_postes, 0)      AS postes,
          COALESCE(p.type_agg, '')      AS type,
          COALESCE(f.fte_actuel, 0)     AS fte_actuel
        FROM dbo.centres c
        -- agrÃ©gats postes (nb + type_agg)
        LEFT JOIN (
          SELECT
            cp.centre_id,
            COUNT(*) AS nb_postes,
            CASE
              WHEN MIN(p.type_poste) = MAX(p.type_poste) THEN MIN(p.type_poste)
              ELSE 'MOI/MOD'
            END AS type_agg
          FROM dbo.centre_postes cp
          INNER JOIN dbo.postes p ON p.id = cp.poste_id
          GROUP BY cp.centre_id
        ) p ON p.centre_id = c.id
        -- somme effectif actuel par centre
        LEFT JOIN (
          SELECT
            cp.centre_id,
            SUM(COALESCE(cp.effectif_actuel, 0)) AS fte_actuel
          FROM dbo.centre_postes cp
          GROUP BY cp.centre_id
        ) f ON f.centre_id = c.id
        --WHERE (:region_id IS NULL OR c.region_id = :region_id)
        ORDER BY c.label