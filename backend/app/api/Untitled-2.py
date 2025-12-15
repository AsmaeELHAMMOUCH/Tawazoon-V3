# ===============================================
#   REGIONS
# ===============================================
@router.get("/regions/", response_model=List[RegionOut])
def list_regions(db: Session = Depends(get_db)):
    """Retourne toutes les régions."""
    rows = db.execute(text("""
        SELECT id, label
        FROM dbo.regions
        ORDER BY label
    """)).mappings().all()
    return [dict(r) for r in rows]


# ===============================================
#   CATEGORIES
# ===============================================
@router.get("/categories/", response_model=List[CategorieOut])
def list_categories(
    region_id: Optional[int] = Query(None, description="Filter by region"),
    db: Session = Depends(get_db)
):
    """
    Liste les catégories.
    - Si region_id: catégories des centres de cette région
    - Sinon: toutes les catégories
    """
    if region_id is not None:
        sql = """
            SELECT DISTINCT cat.id, cat.label
            FROM dbo.categories cat
            INNER JOIN dbo.centres c ON c.categorie_id = cat.id
            WHERE c.region_id = :region_id
            ORDER BY cat.label
        """
        rows = db.execute(text(sql), {"region_id": region_id}).mappings().all()
    else:
        sql = "SELECT id, label FROM dbo.categories ORDER BY label"
        rows = db.execute(text(sql)).mappings().all()
    
    return [dict(r) for r in rows]


# ===============================================
#   CENTRES
# ===============================================
@router.get("/centres/", response_model=List[CentreOut])
def list_centres(
    region_id: Optional[int] = Query(None),
    categorie_id: Optional[int] = Query(None),
    poste_id: Optional[int] = Query(None, description="Centres ayant ce poste"),
    db: Session = Depends(get_db)
):
    """
    Liste les centres avec filtres optionnels.
    """
    sql = """
        SELECT DISTINCT c.id, c.label, c.region_id, c.categorie_id
        FROM dbo.centres c
    """
    
    where_clauses = []
    params = {}
    
    if poste_id is not None:
        sql += " INNER JOIN dbo.centre_postes cp ON cp.centre_id = c.id"
        where_clauses.append("cp.poste_id = :poste_id")
        params["poste_id"] = poste_id
    
    if region_id is not None:
        where_clauses.append("c.region_id = :region_id")
        params["region_id"] = region_id
    
    if categorie_id is not None:
        where_clauses.append("c.categorie_id = :categorie_id")
        params["categorie_id"] = categorie_id
    
    if where_clauses:
        sql += " WHERE " + " AND ".join(where_clauses)
    
    sql += " ORDER BY c.label"
    
    rows = db.execute(text(sql), params).mappings().all()
    return [dict(r) for r in rows]


@router.get("/centres/{centre_id}", response_model=CentreDetailOut)
def get_centre(centre_id: int, db: Session = Depends(get_db)):
    """Retourne un centre avec ses infos relationnelles."""
    row = db.execute(text("""
        SELECT 
            c.id, c.label, c.region_id, c.categorie_id,
            r.label as region_label,
            cat.label as categorie_label
        FROM dbo.centres c
        LEFT JOIN dbo.regions r ON r.id = c.region_id
        LEFT JOIN dbo.categories cat ON cat.id = c.categorie_id
        WHERE c.id = :centre_id
    """), {"centre_id": centre_id}).mappings().first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Centre non trouvé")
    
    return dict(row)


# ===============================================
#   POSTES
# ===============================================
@router.get("/postes/", response_model=List[PosteOut])
def list_postes(
    region_id: Optional[int] = Query(None, description="Filter by region"),
    centre_id: Optional[int] = Query(None, description="Filter by centre"),
    db: Session = Depends(get_db)
):
    """
    Liste les postes avec filtres optionnels.
    """
    if centre_id is not None:
        # Postes d'un centre spécifique
        sql = """
            SELECT p.id, p.label
            FROM dbo.postes p
            INNER JOIN dbo.centre_postes cp ON cp.poste_id = p.id
            WHERE cp.centre_id = :centre_id
            ORDER BY p.label
        """
        rows = db.execute(text(sql), {"centre_id": centre_id}).mappings().all()
    elif region_id is not None:
        # Postes disponibles dans une région
        sql = """
            SELECT DISTINCT p.id, p.label
            FROM dbo.postes p
            INNER JOIN dbo.centre_postes cp ON cp.poste_id = p.id
            INNER JOIN dbo.centres c ON c.id = cp.centre_id
            WHERE c.region_id = :region_id
            ORDER BY p.label
        """
        rows = db.execute(text(sql), {"region_id": region_id}).mappings().all()
    else:
        # Tous les postes
        sql = "SELECT id, label FROM dbo.postes ORDER BY label"
        rows = db.execute(text(sql)).mappings().all()
    
    return [{"id": r["id"], "label": r["label"], "centre_id": centre_id} for r in rows]


# ===============================================
#   CENTRE_POSTES (avec effectifs)
# ===============================================
@router.get("/centre-postes/", response_model=List[CentrePosteDetailOut])
def list_centre_postes(
    centre_id: Optional[int] = Query(None),
    poste_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Liste les associations centre-poste avec effectifs.
    """
    sql = """
        SELECT 
            cp.id, cp.centre_id, cp.poste_id, cp.effectif_actuel,
            c.label as centre_label,
            p.label as poste_label
        FROM dbo.centre_postes cp
        INNER JOIN dbo.centres c ON c.id = cp.centre_id
        INNER JOIN dbo.postes p ON p.id = cp.poste_id
        WHERE 1=1
    """
    params = {}
    
    if centre_id is not None:
        sql += " AND cp.centre_id = :centre_id"
        params["centre_id"] = centre_id
    
    if poste_id is not None:
        sql += " AND cp.poste_id = :poste_id"
        params["poste_id"] = poste_id
    
    sql += " ORDER BY c.label, p.label"
    
    rows = db.execute(text(sql), params).mappings().all()
    return [dict(r) for r in rows]


# ===============================================
#   TACHES
# ===============================================
# backend/app/api/refs.py
@router.get("/taches/", response_model=List[TacheOut])
def list_taches(
    centre_id: Optional[int] = Query(None),
    poste_id: Optional[int] = Query(None),
    categorie_id: Optional[int] = Query(None),
    region_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    print(f"centre_id: {centre_id}, poste_id: {poste_id}")
    sql = """
        SELECT
            t.id,
            t.nom_tache,
            t.phase,
            t.unite_mesure,
            t.moyenne_min,
            t.centre_poste_id
        FROM dbo.taches t
        INNER JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
        INNER JOIN dbo.centres c ON c.id = cp.centre_id
        WHERE 1=1
    """
    params = {}
    if centre_id is not None:
        sql += " AND cp.centre_id = :centre_id"
        params["centre_id"] = centre_id
    if poste_id is not None:
        sql += " AND cp.poste_id = :poste_id"
        params["poste_id"] = poste_id
    if categorie_id is not None:
        sql += " AND c.categorie_id = :categorie_id"
        params["categorie_id"] = categorie_id
    if region_id is not None:
        sql += " AND c.region_id = :region_id"
        params["region_id"] = region_id
    sql += " ORDER BY t.nom_tache"
    rows = db.execute(text(sql), params).mappings().all()