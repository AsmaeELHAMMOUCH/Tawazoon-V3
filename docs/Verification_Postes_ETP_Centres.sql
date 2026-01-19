select * from centres where label LIKE ('AIN HAROUDA CELLULE DE DISTRIBUTION%')
SELECT
cp.id,
    cp.centre_id,
    cp.poste_id,
    p.label,
	 SUM(cp.effectif_actuel) AS effectif_actuel_total,
    p.intitule_rh,
    p.label_norm,
    p.type_poste
   
FROM centre_postes cp
JOIN postes p
    ON cp.poste_id = p.id
WHERE cp.centre_id = 1952
GROUP BY
cp.id,
    cp.centre_id,
    cp.poste_id,
    p.label,
    p.intitule_rh,
    p.label_norm,
    p.type_poste;
	
SELECT
    c.id        AS centre_id,
    c.label     AS centre_label,
    SUM(cp.effectif_actuel) AS total_effectif
FROM centre_postes cp
JOIN centres c
    ON c.id = cp.centre_id
	where c.label IN ('DIRECTION CENTRALE DES OPERATIONS (AGADIR)',
'DIRECTION CENTRALE DES OPERATIONS (CASABLANCA)',
'DIRECTION CENTRALE DES OPERATIONS (FES)',
'DIRECTION CENTRALE DES OPERATIONS (LAAYOUNE)',
'DIRECTION CENTRALE DES OPERATIONS (MARRAKECH)',
'DIRECTION CENTRALE DES OPERATIONS (MEKNES)',
'DIRECTION CENTRALE DES OPERATIONS (OUJDA)',
'DIRECTION CENTRALE DES OPERATIONS (RABAT)',
'DIRECTION CENTRALE DES OPERATIONS (SETTAT)',
'DIRECTION TRAITEMENT & LAST MILE ',
'DIRECTION TRANSPORT',
'DIVISION CONTROLE OPERATIONNEL ET MESURE DE LA QUALITE',
'DIVISION INTERFACE SI ET SUPPORT FONCTIONNEL',
'DIVISION OPERATION COURRIER & SVA ',
'DIVISION OPERATIONS AMANA',
'DIVISION OPERATIONS INTERNATIONALES',
'SERVICE COORDINATION, SUIVI REPORTING',
'SERVICE EXPLOITATION',
'SERVICE NORMES & EXPLOITATION TRANSPORT',
'SERVICE OPERATIONS AMANA RESEAUX PARTENAIRES',
'SERVICE OPERATIONS AMANA RESEAUX PROPRES',
'SERVICE OPERATIONS COURRIER',
'SERVICE OPERATIONS SVA',
'SERVICE PARC AUTO-EXPLOITATION & PILOTAGE ',
'SERVICE PARTENARIAT ET COMPTABILITE INTERNATIONALE'
)
GROUP BY
    c.id,
    c.label
ORDER BY
    total_effectif DESC;
------------------------------------------------------------
-- Total centre
SELECT SUM(effectif_actuel) AS total_centre
FROM centre_postes
WHERE centre_id = 1932;

-- Détail par poste (doit sommer au même total)
SELECT
    cp.poste_id,
    p.label,
    SUM(cp.effectif_actuel) AS total_poste
FROM centre_postes cp
JOIN postes p ON p.id = cp.poste_id
WHERE cp.centre_id = 1932
GROUP BY cp.poste_id, p.label
ORDER BY total_poste DESC;

------------------------------------------------
SELECT
    cp.poste_id,
    COALESCE(p.label, '(POSTE INCONNU)') AS label,
    SUM(cp.effectif_actuel) AS total_poste
FROM centre_postes cp
LEFT JOIN postes p ON p.id = cp.poste_id
WHERE cp.centre_id = 2093
GROUP BY cp.poste_id, p.label
ORDER BY total_poste DESC;


DELETE FROM centre_postes
WHERE poste_id = 383;

SELECT *
FROM centre_postes
WHERE centre_id = 1944
ORDER BY poste_id;



update centre_postes set effectif_actuel=1 where poste_id=13 and centre_id = 1991
update centre_postes set effectif_actuel=0 where poste_id=303 and centre_id = 2149   


select * from postes where label like ('%GESTIONNAIRE OPÉRATIONS COLIS MESSAGERIE%')

INSERT INTO centre_postes (centre_id, poste_id, effectif_actuel)
VALUES (1962, 366, 1);

INSERT INTO centre_postes (centre_id, poste_id, effectif_actuel)
VALUES (2064, 442, 2);

delete from centre_postes where centre_id=2102 and poste_id=416

INSERT INTO POSTES (label,type_poste) values ('DIRECTEUR DE CENTRE COURRIER CATEGORIE B PI','MOI')
delete centres where id=2117




