# ✅ Backend Adapté - Support Volumes Matriciels

## 🎯 Modifications Backend Complètes

Cette documentation décrit les modifications apportées au backend pour supporter le nouveau format matriciel de volumes.

---

## 📊 Nouveau Schéma - VolumeMatriciel

### **Fichier** : `backend/app/schemas/direction_sim.py`

```python
class VolumeMatriciel(BaseModel):
    """
    Format matriciel pour les volumes (nouveau format)
    Basé sur Flux × Sens × Segment
    """
    centre_id: Optional[int] = None
    centre_label: Optional[str] = None
    flux_id: Optional[int] = None  # 1=Amana, 2=CO, 3=CR, 4=E-Barkia, 5=LRH, null pour guichet
    sens_id: int  # 1=Arrivée, 2=Guichet, 3=Départ
    segment_id: int  # 1=GLOBAL, 2=PART, 3=PRO, 4=DIST, 5=AXES, 6=DÉPÔT, 7=RÉCUP
    volume: float = 0
```

---

## 🔄 DirectionSimRequest Modifié

```python
class DirectionSimRequest(BaseModel):
    direction_id: int
    mode: str = Field("actuel", pattern="^(actuel|recommande|database|data_driven)$")
    volumes: Optional[List[CentreVolume]] = []  # Ancien format (compatibilité)
    volumes_matriciels: Optional[List[VolumeMatriciel]] = []  # Nouveau format matriciel
    global_params: GlobalParams = GlobalParams()
```

**Support des deux formats** :
- `volumes` : Ancien format (sacs, colis, courrier_ordinaire, etc.)
- `volumes_matriciels` : Nouveau format (flux_id, sens_id, segment_id, volume)

---

## 🔧 Service - direction_v2_service.py

### **Fonction 1 : convert_volumes_matriciels_to_classic**

```python
def convert_volumes_matriciels_to_classic(volumes_matriciels: List) -> Dict[str, float]:
    """
    Convertit volumes matriciels en format classique
    """
    result = {
        "sacs": 0.0,
        "colis": 0.0,
        "courrier_ordinaire": 0.0,
        "courrier_recommande": 0.0,
        "ebarkia": 0.0,
        "lrh": 0.0,
        "amana": 0.0,
        "colis_amana_par_sac": 5.0,
        "courriers_par_sac": 4500.0,
        "colis_par_collecte": 1.0
    }
    
    # Mapping flux_id -> clé
    flux_mapping = {
        1: "amana",
        2: "courrier_ordinaire",  # CO
        3: "courrier_recommande",  # CR
        4: "ebarkia",
        5: "lrh"
    }
    
    for vol in volumes_matriciels:
        # Guichet (sens_id = 2)
        if vol.sens_id == 2:
            if vol.segment_id == 6:  # DÉPÔT
                result["sacs"] += vol.volume
            elif vol.segment_id == 7:  # RÉCUP
                result["colis"] += vol.volume
        
        # Flux (sens_id = 1 ou 3)
        elif vol.flux_id and vol.flux_id in flux_mapping:
            key = flux_mapping[vol.flux_id]
            result[key] += vol.volume
    
    return result
```

**Logique de conversion** :
- **Guichet** (sens_id=2) :
  - DÉPÔT (segment_id=6) → `sacs`
  - RÉCUP (segment_id=7) → `colis`
- **Flux** (sens_id=1 ou 3) :
  - Amana (flux_id=1) → `amana`
  - CO (flux_id=2) → `courrier_ordinaire`
  - CR (flux_id=3) → `courrier_recommande`
  - E-Barkia (flux_id=4) → `ebarkia`
  - LRH (flux_id=5) → `lrh`

---

### **Fonction 2 : process_direction_simulation_v2_clean**

#### **Étape 4b : Traitement volumes matriciels**

```python
# 4b. Traiter volumes matriciels (nouveau format)
if request.volumes_matriciels:
    print(f"🔹 [V2] Traitement de {len(request.volumes_matriciels)} volumes matriciels")
    
    for vol_mat in request.volumes_matriciels:
        cid = None
        if vol_mat.centre_id and vol_mat.centre_id in centres_map:
            cid = vol_mat.centre_id
        elif vol_mat.centre_label:
            norm = normalize_string(vol_mat.centre_label)
            cid = label_to_id.get(norm)
        
        if cid:
            if cid not in matched_volumes_matriciels:
                matched_volumes_matriciels[cid] = []
            matched_volumes_matriciels[cid].append(vol_mat)
    
    print(f"🔹 [V2] Volumes matriciels groupés pour {len(matched_volumes_matriciels)} centres")
```

**Résultat** : `matched_volumes_matriciels` = Dict[centre_id, List[VolumeMatriciel]]

---

#### **Étape 6 : Boucle de simulation - Priorité des volumes**

```python
for cid in centre_ids:
    # A. Volumes
    vol_import = matched_volumes.get(cid)
    vol_matriciels = matched_volumes_matriciels.get(cid)
    vol_ref = ref_volumes_map.get(cid)
    
    # Priorité 1: Volumes matriciels (nouveau format)
    if vol_matriciels:
        print(f"🔹 Centre {cid}: Utilisation volumes matriciels ({len(vol_matriciels)} entrées)")
        raw_v = convert_volumes_matriciels_to_classic(vol_matriciels)
    
    # Priorité 2: Volumes classiques (ancien format Excel)
    elif vol_import:
        raw_v = { ... }  # Format classique
    
    # Priorité 3: Volumes de référence (DB)
    elif vol_ref:
        raw_v = { ... }  # Depuis DB
    
    # Priorité 4: Zéro
    else:
        raw_v = { ... }  # Tout à zéro
```

**Ordre de priorité** :
1. ✅ Volumes matriciels (nouveau format Excel)
2. ✅ Volumes classiques (ancien format Excel)
3. ✅ Volumes de référence (base de données)
4. ✅ Zéro (pas de données)

---

## 🔄 Flux de Données Complet

### **Frontend → Backend**

```javascript
// Frontend envoie
{
  direction_id: 5,
  mode: "data_driven",
  volumes_matriciels: [
    {
      centre_id: 12,
      centre_label: "Centre Casablanca",
      flux_id: 1,
      sens_id: 1,
      segment_id: 1,
      volume: 100
    },
    {
      centre_id: 12,
      centre_label: "Centre Casablanca",
      flux_id: 2,
      sens_id: 1,
      segment_id: 2,
      volume: 50
    },
    // ... autres volumes
  ],
  global_params: {
    productivite: 100,
    heures_par_jour: 7.5,
    idle_minutes: 30
  }
}
```

---

### **Backend - Traitement**

```python
# 1. Réception
request.volumes_matriciels  # Liste de VolumeMatriciel

# 2. Groupement par centre
matched_volumes_matriciels = {
    12: [VolumeMatriciel(...), VolumeMatriciel(...), ...],
    13: [VolumeMatriciel(...), ...],
}

# 3. Conversion pour chaque centre
for cid in centre_ids:
    vol_matriciels = matched_volumes_matriciels.get(cid)
    if vol_matriciels:
        raw_v = convert_volumes_matriciels_to_classic(vol_matriciels)
        # raw_v = {
        #     "sacs": 150,
        #     "colis": 80,
        #     "courrier_ordinaire": 50,
        #     "amana": 100,
        #     ...
        # }

# 4. Simulation
sim_res = calculer_simulation(
    taches=c_tasks,
    volumes=volumes_input_dict,
    productivite=100,
    ...
)

# 5. Retour
return DirectionSimResponse(
    centres=[...],
    kpis={...},
    ...
)
```

---

## 📊 Exemple Concret

### **Données Importées**

```
Centre Casablanca:
  Flux Arrivée:
    - Amana GLOBAL: 100
    - CO PART: 50
  Guichet:
    - DÉPÔT: 150
    - RÉCUP: 80
  Flux Départ:
    - Amana GLOBAL: 90
```

### **Conversion**

```python
volumes_matriciels = [
    VolumeMatriciel(centre_id=12, flux_id=1, sens_id=1, segment_id=1, volume=100),  # Amana Arrivée GLOBAL
    VolumeMatriciel(centre_id=12, flux_id=2, sens_id=1, segment_id=2, volume=50),   # CO Arrivée PART
    VolumeMatriciel(centre_id=12, sens_id=2, segment_id=6, volume=150),             # Guichet DÉPÔT
    VolumeMatriciel(centre_id=12, sens_id=2, segment_id=7, volume=80),              # Guichet RÉCUP
    VolumeMatriciel(centre_id=12, flux_id=1, sens_id=3, segment_id=1, volume=90),   # Amana Départ GLOBAL
]

# Après conversion
raw_v = {
    "sacs": 150,                    # Guichet DÉPÔT
    "colis": 80,                    # Guichet RÉCUP
    "amana": 190,                   # 100 (Arrivée) + 90 (Départ)
    "courrier_ordinaire": 50,       # CO Arrivée
    "courrier_recommande": 0,
    "ebarkia": 0,
    "lrh": 0,
    "colis_amana_par_sac": 5.0,
    "courriers_par_sac": 4500.0,
    "colis_par_collecte": 1.0
}
```

### **Simulation**

```python
# Le moteur reçoit raw_v et calcule:
sim_res = calculer_simulation(...)
# → etp_calcule = 2.46
# → total_heures = 18.45
```

---

## ✅ Avantages

1. **Compatibilité** : Support ancien et nouveau format
2. **Flexibilité** : Priorité automatique (matriciel > classique > DB > zéro)
3. **Simplicité** : Conversion transparente pour le moteur
4. **Traçabilité** : Logs détaillés à chaque étape
5. **Robustesse** : Gestion des centres non trouvés

---

## 🐛 Logs de Débogage

```python
# Lors du traitement
🔹 [V2] Traitement de 25 volumes matriciels
🔹 [V2] Volumes matriciels groupés pour 3 centres
🔹 Centre 12: Utilisation volumes matriciels (8 entrées)
📊 Volumes matriciels convertis: {'sacs': 150, 'colis': 80, ...}
```

---

## 🚀 Prochaines Étapes

1. ✅ **Tests** : Tester avec fichier Excel réel
2. ✅ **Validation** : Vérifier résultats de simulation
3. ✅ **Optimisation** : Affiner logique de conversion si nécessaire
4. ✅ **Documentation** : Mettre à jour guide utilisateur

---

**© 2026 TAWAZOON RH - Barid Al-Maghrib**
