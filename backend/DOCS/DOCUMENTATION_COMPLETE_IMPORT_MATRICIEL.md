# 📊 DOCUMENTATION COMPLÈTE - SYSTÈME D'IMPORT MATRICIEL

**Version** : 2.0  
**Date** : 07 Janvier 2026  
**Auteur** : TAWAZOON RH - Barid Al-Maghrib

---

## 📑 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Format Matriciel](#format-matriciel)
4. [Frontend - Composants](#frontend---composants)
5. [Backend - Services](#backend---services)
6. [Workflow Complet](#workflow-complet)
7. [Guide Utilisateur](#guide-utilisateur)
8. [Guide Développeur](#guide-développeur)
9. [Tests et Validation](#tests-et-validation)
10. [Dépannage](#dépannage)

---

## 🎯 VUE D'ENSEMBLE

### Objectif

Permettre l'import de volumes pour **plusieurs centres simultanément** via un fichier Excel au **format matriciel** (Flux × Sens × Segment), avec génération automatique d'un template pré-rempli par direction et lancement automatique de la simulation.

### Principes Clés

1. **Pré-remplissage** : Les noms de centres sont automatiquement remplis selon la direction sélectionnée
2. **Format Matriciel** : Structure identique à l'interface utilisateur (matrices 5×5)
3. **Multi-centres** : Import de plusieurs centres en une seule opération
4. **Simulation Automatique** : Lancement immédiat après validation de l'import
5. **Compatibilité** : Support de l'ancien format pour rétrocompatibilité

### Avantages

✅ **Gain de temps** : Pas besoin de saisir les noms de centres  
✅ **Zéro erreur** : Noms exacts pré-remplis  
✅ **Simplicité** : Focus sur les volumes uniquement  
✅ **Personnalisé** : Template adapté à chaque direction  
✅ **Sécurisé** : Seuls les centres de la direction sont listés  
✅ **Robuste** : Gestion des centres non trouvés  

---

## 🏗️ ARCHITECTURE

### Vue Globale

```
┌─────────────────────────────────────────────────────────────┐
│                        UTILISATEUR                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   VUE DIRECTION (Frontend)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Sélection Direction                               │   │
│  │ 2. Téléchargement Template (centres pré-remplis)     │   │
│  │ 3. Import Fichier Excel                              │   │
│  │ 4. Validation & Transformation                       │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ POST /api/simulation/direction
                       │ { volumes_matriciels: [...] }
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   API BACKEND (FastAPI)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Réception volumes_matriciels                      │   │
│  │ 2. Groupement par centre                             │   │
│  │ 3. Conversion en format classique                    │   │
│  │ 4. Simulation pour chaque centre                     │   │
│  │ 5. Agrégation des résultats                          │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ DirectionSimResponse
                       │ { centres: [...], kpis: {...} }
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   AFFICHAGE RÉSULTATS                        │
│  - Tableau des centres avec ETP calculé                     │
│  - KPIs agrégés de la direction                             │
│  - Graphiques et visualisations                             │
└─────────────────────────────────────────────────────────────┘
```

### Stack Technique

**Frontend** :
- React 18
- XLSX (SheetJS) pour génération/lecture Excel
- Lucide React pour icônes
- TailwindCSS pour styling

**Backend** :
- FastAPI (Python 3.10+)
- SQLAlchemy pour ORM
- Pydantic pour validation
- SQL Server pour base de données

---

## 📐 FORMAT MATRICIEL

### Structure du Template Excel

Le template contient **2 feuilles** :

#### **Feuille 1 : Import Volumes**

```
┌─────────────────────────────────────────────────────────────┐
│ IMPORT VOLUMES - CENTRES DE LA DIRECTION                    │
│ Remplissez les volumes pour chaque centre ci-dessous        │
│ Les centres sont pré-remplis avec les centres de votre      │
│ direction                                                    │
└─────────────────────────────────────────────────────────────┘

=== CENTRE 1 ===
Nom du Centre: Centre Casablanca

A) FLUX ARRIVÉE
┌─────────────┬────────┬────────┬─────┬───────┬──────┐
│ FLUX\SEGMENT│ GLOBAL │ PART.  │ PRO │ DIST. │ AXES │
├─────────────┼────────┼────────┼─────┼───────┼──────┤
│ Amana       │   100  │   50   │  30 │   15  │   5  │
│ CO          │   200  │  100   │  60 │   30  │  10  │
│ CR          │    50  │   25   │  15 │    8  │   2  │
│ E-Barkia    │    30  │   15   │  10 │    4  │   1  │
│ LRH         │    20  │   10   │   6 │    3  │   1  │
└─────────────┴────────┴────────┴─────┴───────┴──────┘

B) GUICHET
┌───────────┬───────┬────────┐
│ OPÉRATION │ DÉPÔT │ RÉCUP. │
├───────────┼───────┼────────┤
│ Volume    │  150  │   80   │
└───────────┴───────┴────────┘

C) FLUX DÉPART
┌─────────────┬────────┬────────┬─────┬───────┬──────┐
│ FLUX\SEGMENT│ GLOBAL │ PART.  │ PRO │ DIST. │ AXES │
├─────────────┼────────┼────────┼─────┼───────┼──────┤
│ Amana       │    90  │   45   │  27 │   13  │   5  │
│ CO          │   180  │   90   │  54 │   27  │   9  │
│ CR          │    45  │   22   │  13 │    7  │   3  │
│ E-Barkia    │    25  │   12   │   8 │    4  │   1  │
│ LRH         │    15  │    8   │   5 │    2  │   0  │
└─────────────┴────────┴────────┴─────┴───────┴──────┘


=== CENTRE 2 ===
Nom du Centre: Centre Rabat
[Même structure A, B, C...]


=== CENTRE 3 ===
Nom du Centre: Centre Tanger
[Même structure A, B, C...]
```

#### **Feuille 2 : Guide**

Contient :
- Instructions de remplissage
- Règles de saisie
- Mapping des segments
- Exemples

---

### Mapping des IDs

#### **Flux**
| Nom      | ID  | Description                    |
|----------|-----|--------------------------------|
| Amana    | 1   | Flux Amana                     |
| CO       | 2   | Courrier Ordinaire             |
| CR       | 3   | Courrier Recommandé            |
| E-Barkia | 4   | E-Barkia                       |
| LRH      | 5   | LRH (Lettres Recommandées...)  |

#### **Sens**
| Nom     | ID  | Description                    |
|---------|-----|--------------------------------|
| Arrivée | 1   | Flux entrant                   |
| Guichet | 2   | Opérations guichet             |
| Départ  | 3   | Flux sortant                   |

#### **Segments**
| Nom    | ID  | Description                    |
|--------|-----|--------------------------------|
| GLOBAL | 1   | Volume global non segmenté     |
| PART.  | 2   | Segment Particuliers           |
| PRO    | 3   | Segment Professionnels         |
| DIST.  | 4   | Segment Distribution           |
| AXES   | 5   | Segment Axes stratégiques      |
| DÉPÔT  | 6   | Opération dépôt (guichet)      |
| RÉCUP. | 7   | Opération récupération (guichet)|

---

## 💻 FRONTEND - COMPOSANTS

### 1. VueDirection.jsx

#### **Fonction : handleDownloadTemplate**

**Rôle** : Génère le template Excel avec les centres de la direction pré-remplis

```javascript
const handleDownloadTemplate = () => {
  try {
    const wb = XLSX.utils.book_new();
    
    // Titre
    const templateData = [
      ["IMPORT VOLUMES - CENTRES DE LA DIRECTION"],
      ["Remplissez les volumes pour chaque centre ci-dessous"],
      ["Les centres sont pré-remplis avec les centres de votre direction"],
      [],
    ];
    
    // Pour chaque centre de la direction
    centres.forEach((centre, index) => {
      if (index > 0) {
        templateData.push([]);
        templateData.push([]);
      }
      
      templateData.push([`=== CENTRE ${index + 1} ===`]);
      templateData.push(["Nom du Centre:", centre.label]);
      templateData.push([]);
      
      // Section A : FLUX ARRIVÉE
      templateData.push(["A) FLUX ARRIVÉE"]);
      templateData.push(["FLUX \\ SEGMENT", "GLOBAL", "PART.", "PRO", "DIST.", "AXES"]);
      templateData.push(["Amana", "", "", "", "", ""]);
      templateData.push(["CO", "", "", "", "", ""]);
      templateData.push(["CR", "", "", "", "", ""]);
      templateData.push(["E-Barkia", "", "", "", "", ""]);
      templateData.push(["LRH", "", "", "", "", ""]);
      templateData.push([]);
      
      // Section B : GUICHET
      templateData.push(["B) GUICHET"]);
      templateData.push(["OPÉRATION", "DÉPÔT", "RÉCUP."]);
      templateData.push(["Volume", "", ""]);
      templateData.push([]);
      
      // Section C : FLUX DÉPART
      templateData.push(["C) FLUX DÉPART"]);
      templateData.push(["FLUX \\ SEGMENT", "GLOBAL", "PART.", "PRO", "DIST.", "AXES"]);
      templateData.push(["Amana", "", "", "", "", ""]);
      templateData.push(["CO", "", "", "", "", ""]);
      templateData.push(["CR", "", "", "", "", ""]);
      templateData.push(["E-Barkia", "", "", "", "", ""]);
      templateData.push(["LRH", "", "", "", "", ""]);
    });
    
    // Créer feuille + guide
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 20 }, { wch: 12 }, { wch: 12 }, 
      { wch: 12 }, { wch: 12 }, { wch: 12 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, "Import Volumes");
    
    // Feuille Guide (instructions)
    const guideData = [
      ["GUIDE DE REMPLISSAGE"],
      [],
      ["1. CENTRES PRÉ-REMPLIS"],
      ["", "Les centres de votre direction sont déjà listés."],
      ["", "Vous n'avez qu'à remplir les volumes pour chaque centre."],
      // ... suite du guide
    ];
    
    const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
    XLSX.utils.book_append_sheet(wb, wsGuide, "Guide");
    
    // Télécharger
    const directionLabel = directions.find(d => d.id === selectedDirection)?.label || "Direction";
    XLSX.writeFile(wb, `Template_Volumes_${directionLabel}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
  } catch (error) {
    console.error('Erreur génération template:', error);
  }
};
```

**Résultat** : Fichier `Template_Volumes_Direction_Nord_2026-01-07.xlsx`

---

#### **Fonction : onValidate (ImportModal)**

**Rôle** : Transforme les données importées et lance la simulation

```javascript
onValidate={(parsedCentres) => {
  console.log("Données importées:", parsedCentres);
  
  // parsedCentres = [
  //   {
  //     nom_centre: "Centre Casablanca",
  //     volumes: [
  //       { flux_id: 1, sens_id: 1, segment_id: 1, volume: 100 },
  //       ...
  //     ]
  //   },
  //   ...
  // ]
  
  // Transformer pour l'API
  const volumesData = parsedCentres.flatMap(centreData => {
    // Trouver le centre correspondant
    const centre = centres.find(c => 
      c.label === centreData.nom_centre || 
      c.nom === centreData.nom_centre
    );
    
    if (!centre) {
      console.warn(`Centre non trouvé: ${centreData.nom_centre}`);
      return [];
    }
    
    // Ajouter centre_id à chaque volume
    return centreData.volumes.map(vol => ({
      centre_id: centre.id,
      centre_label: centre.label,
      flux_id: vol.flux_id,
      sens_id: vol.sens_id,
      segment_id: vol.segment_id,
      volume: vol.volume
    }));
  });
  
  console.log("Volumes transformés:", volumesData);
  
  // Lancer simulation
  if (volumesData.length > 0) {
    runSim("data_driven", volumesData);
  }
  
  setImportModalOpen(false);
}}
```

**Entrée** : Centres avec volumes matriciels  
**Sortie** : Volumes avec IDs + simulation lancée

---

#### **Fonction : runSim**

**Rôle** : Envoie la requête au backend avec détection automatique du format

```javascript
const runSim = async (modeOverride, volumesOverride) => {
  if (!selectedDirection) return;

  const activeMode = modeOverride || simMode;
  const activeVolumes = volumesOverride || lastVolumes;

  setSimMode(activeMode);
  if (volumesOverride) setLastVolumes(activeVolumes);

  const payload = {
    direction_id: Number(selectedDirection),
    mode: activeMode,
    global_params: {
      productivite: toNumber(params.productivite, 100),
      heures_par_jour: toNumber(params.heuresParJour, 7.5),
      idle_minutes: toNumber(params.idleMinutes, 0),
      taux_complexite: toNumber(params.tauxComplexite, 0),
      nature_geo: toNumber(params.natureGeo, 0)
    },
    // Détection automatique du format
    ...(activeVolumes.length > 0 && activeVolumes[0].flux_id !== undefined
      ? { volumes_matriciels: activeVolumes }  // Nouveau format
      : { volumes: activeVolumes })             // Ancien format
  };

  console.log("Payload envoyé:", payload);

  await actions.runSimulation(payload);
};
```

**Avantage** : Support transparent des deux formats

---

### 2. DirectionVolumesCard.jsx

#### **Composant ImportModal**

**Rôle** : Parse le fichier Excel au format matriciel

```javascript
const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setFileName(file.name);
  const reader = new FileReader();
  
  reader.onload = (evt) => {
    try {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      
      // Lire en array of arrays
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      
      // Trouver tous les centres
      const centres = [];
      let currentCentre = null;
      
      const fluxMap = {
        "Amana": 1, "CO": 2, "CR": 3, "E-Barkia": 4, "LRH": 5
      };
      
      const segmentMap = {
        "GLOBAL": 1, "PART.": 2, "PRO": 3, "DIST.": 4, "AXES": 5,
        "DÉPÔT": 6, "RÉCUP.": 7
      };
      
      // Parcourir le fichier
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        
        // Nouveau centre ?
        if (row[0] && row[0].toString().includes("Nom du Centre")) {
          if (currentCentre && currentCentre.volumes.length > 0) {
            centres.push(currentCentre);
          }
          
          currentCentre = {
            nom_centre: row[1] || "",
            volumes: []
          };
        }
        
        // Parser sections A, B, C
        if (currentCentre) {
          // FLUX ARRIVÉE
          if (row[0] && row[0].toString().includes("FLUX ARRIVÉE")) {
            const headerRow = rawData[i + 1];
            
            for (let j = 0; j < 5; j++) {
              const fluxRow = rawData[i + 2 + j];
              const fluxId = fluxMap[fluxRow[0]];
              
              if (fluxId) {
                for (let k = 1; k <= 5; k++) {
                  const volume = parseFloat(fluxRow[k]) || 0;
                  if (volume > 0) {
                    const segmentId = segmentMap[headerRow[k]];
                    if (segmentId) {
                      currentCentre.volumes.push({
                        flux_id: fluxId,
                        sens_id: 1, // Arrivée
                        segment_id: segmentId,
                        volume: volume
                      });
                    }
                  }
                }
              }
            }
          }
          
          // GUICHET
          if (row[0] && row[0].toString().includes("GUICHET") && !row[0].includes("FLUX")) {
            const valueRow = rawData[i + 2];
            if (valueRow) {
              const depotVolume = parseFloat(valueRow[1]) || 0;
              if (depotVolume > 0) {
                currentCentre.volumes.push({
                  flux_id: null,
                  sens_id: 2, // Guichet
                  segment_id: 6, // DÉPÔT
                  volume: depotVolume
                });
              }
              
              const recupVolume = parseFloat(valueRow[2]) || 0;
              if (recupVolume > 0) {
                currentCentre.volumes.push({
                  flux_id: null,
                  sens_id: 2,
                  segment_id: 7, // RÉCUP
                  volume: recupVolume
                });
              }
            }
          }
          
          // FLUX DÉPART (même logique que Arrivée avec sens_id=3)
          // ...
        }
      }
      
      // Ajouter dernier centre
      if (currentCentre && currentCentre.volumes.length > 0) {
        centres.push(currentCentre);
      }
      
      // Validation
      if (centres.length === 0) {
        setErrors(["Aucun centre trouvé"]);
        return;
      }
      
      setErrors([]);
      setFileData(centres);
      setStep(2);
      
    } catch (err) {
      console.error("Erreur lecture:", err);
      setErrors(["Erreur de lecture du fichier Excel"]);
    }
  };
  
  reader.readAsBinaryString(file);
};
```

**Résultat** : Array de centres avec leurs volumes matriciels

---

## 🔧 BACKEND - SERVICES

### 1. Schémas Pydantic

#### **VolumeMatriciel**

```python
# backend/app/schemas/direction_sim.py

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

#### **DirectionSimRequest**

```python
class DirectionSimRequest(BaseModel):
    direction_id: int
    mode: str = Field("actuel", pattern="^(actuel|recommande|database|data_driven)$")
    volumes: Optional[List[CentreVolume]] = []  # Ancien format (compatibilité)
    volumes_matriciels: Optional[List[VolumeMatriciel]] = []  # Nouveau format
    global_params: GlobalParams = GlobalParams()
```

---

### 2. Service de Simulation

#### **Fonction : convert_volumes_matriciels_to_classic**

```python
# backend/app/services/direction_v2_service.py

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
    
    flux_mapping = {
        1: "amana",
        2: "courrier_ordinaire",
        3: "courrier_recommande",
        4: "ebarkia",
        5: "lrh"
    }
    
    for vol in volumes_matriciels:
        # Guichet
        if vol.sens_id == 2:
            if vol.segment_id == 6:  # DÉPÔT
                result["sacs"] += vol.volume
            elif vol.segment_id == 7:  # RÉCUP
                result["colis"] += vol.volume
        
        # Flux
        elif vol.flux_id and vol.flux_id in flux_mapping:
            key = flux_mapping[vol.flux_id]
            result[key] += vol.volume
    
    print(f"📊 Volumes matriciels convertis: {result}")
    return result
```

**Logique** :
- Guichet DÉPÔT → `sacs`
- Guichet RÉCUP → `colis`
- Flux Amana → `amana`
- Flux CO → `courrier_ordinaire`
- Flux CR → `courrier_recommande`
- Flux E-Barkia → `ebarkia`
- Flux LRH → `lrh`

---

#### **Fonction : process_direction_simulation_v2_clean**

**Modifications clés** :

```python
# Étape 4b : Traiter volumes matriciels
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

# Étape 6 : Boucle de simulation
for cid in centre_ids:
    vol_import = matched_volumes.get(cid)
    vol_matriciels = matched_volumes_matriciels.get(cid)
    vol_ref = ref_volumes_map.get(cid)
    
    # Priorité 1: Volumes matriciels
    if vol_matriciels:
        print(f"🔹 Centre {cid}: Utilisation volumes matriciels ({len(vol_matriciels)} entrées)")
        raw_v = convert_volumes_matriciels_to_classic(vol_matriciels)
    
    # Priorité 2: Volumes classiques
    elif vol_import:
        raw_v = { ... }
    
    # Priorité 3: DB
    elif vol_ref:
        raw_v = { ... }
    
    # Priorité 4: Zéro
    else:
        raw_v = { ... }
    
    # Simulation
    sim_res = calculer_simulation(
        taches=c_tasks,
        volumes=volumes_input_dict,
        productivite=global_p.productivite,
        ...
    )
```

---

## 🔄 WORKFLOW COMPLET

### Étape 1 : Sélection Direction

```
Utilisateur → Sélectionne "Direction Nord"
Frontend → Charge les centres de la direction
```

### Étape 2 : Téléchargement Template

```
Utilisateur → Clic "Modèle"
Frontend → handleDownloadTemplate()
  ├─ Récupère centres de la direction
  ├─ Génère Excel avec centres pré-remplis
  └─ Télécharge: Template_Volumes_Direction_Nord_2026-01-07.xlsx
```

### Étape 3 : Remplissage

```
Utilisateur → Ouvre Excel
  ├─ Voit Centre 1: Centre Casablanca (pré-rempli)
  ├─ Voit Centre 2: Centre Rabat (pré-rempli)
  ├─ Voit Centre 3: Centre Tanger (pré-rempli)
  └─ Remplit uniquement les volumes (matrices 5×5)
```

### Étape 4 : Import

```
Utilisateur → Clic "Importer" + Sélectionne fichier
Frontend → ImportModal.handleFileUpload()
  ├─ Parse Excel (XLSX.read)
  ├─ Détecte centres (recherche "Nom du Centre:")
  ├─ Parse sections A, B, C pour chaque centre
  └─ Produit: [{ nom_centre, volumes: [...] }]
```

### Étape 5 : Validation

```
Frontend → onValidate(parsedCentres)
  ├─ Match centres par nom
  │  └─ Trouve centre.id via centre.label
  ├─ Transforme en volumesData
  │  └─ Ajoute centre_id à chaque volume
  └─ Lance runSim("data_driven", volumesData)
```

### Étape 6 : Envoi Backend

```
Frontend → runSim()
  ├─ Détecte format (flux_id présent ?)
  ├─ Construit payload
  │  └─ { volumes_matriciels: [...] }
  └─ POST /api/simulation/direction
```

### Étape 7 : Traitement Backend

```
Backend → process_direction_simulation_v2_clean()
  ├─ Reçoit volumes_matriciels
  ├─ Groupe par centre_id
  │  └─ matched_volumes_matriciels[cid] = [vol1, vol2, ...]
  ├─ Pour chaque centre:
  │  ├─ Convertit volumes matriciels → format classique
  │  │  └─ convert_volumes_matriciels_to_classic()
  │  ├─ Lance simulation
  │  │  └─ calculer_simulation(taches, volumes, ...)
  │  └─ Stocke résultats (etp_calcule, heures, ...)
  └─ Agrège et retourne DirectionSimResponse
```

### Étape 8 : Affichage

```
Frontend → Reçoit DirectionSimResponse
  ├─ Mise à jour tableau centres
  │  └─ Affiche ETP calculé pour chaque centre
  ├─ Mise à jour KPIs direction
  │  └─ Total ETP, heures, écarts
  └─ Mise à jour graphiques
```

---

## 📖 GUIDE UTILISATEUR

### Prérequis

- Accès à la Vue Direction
- Direction sélectionnée
- Microsoft Excel ou compatible

### Procédure Complète

#### **1. Accéder à la Vue Direction**

1. Ouvrir l'application TAWAZOON RH
2. Naviguer vers "Vue Direction"
3. Sélectionner la direction souhaitée dans le menu déroulant

#### **2. Télécharger le Template**

1. Cliquer sur le bouton **"Modèle"** 📊
2. Le fichier `Template_Volumes_Direction_XXX_YYYY-MM-DD.xlsx` se télécharge
3. Ouvrir le fichier dans Excel

#### **3. Remplir le Template**

**⚠️ IMPORTANT** :
- ✅ **NE PAS** modifier les noms de centres
- ✅ **NE PAS** modifier la structure du tableau
- ✅ Saisir uniquement des nombres
- ✅ Laisser vide si volume = 0

**Pour chaque centre** :

**Section A : FLUX ARRIVÉE**
- Remplir la matrice 5×5 (Flux × Segment)
- Exemple : Amana GLOBAL = 100

**Section B : GUICHET**
- Remplir DÉPÔT (volume de dépôts)
- Remplir RÉCUP. (volume de récupérations)

**Section C : FLUX DÉPART**
- Remplir la matrice 5×5 (même structure que Arrivée)

#### **4. Importer le Fichier**

1. Cliquer sur le bouton **"Importer"** ⬆️
2. Sélectionner le fichier Excel rempli
3. Vérifier la prévisualisation :
   ```
   ✓ Prêt à importer
   3 centre(s) détecté(s)
     ├─ Centre Casablanca (25 volumes)
     ├─ Centre Rabat (30 volumes)
     └─ Centre Tanger (20 volumes)
   ```
4. Cliquer sur **"Importer"**

#### **5. Consulter les Résultats**

La simulation se lance automatiquement. Les résultats s'affichent :
- Tableau des centres avec ETP calculé
- KPIs de la direction
- Graphiques de répartition

---

### Exemples de Remplissage

#### **Exemple 1 : Centre avec volumes moyens**

```
Centre Casablanca

A) FLUX ARRIVÉE
  Amana GLOBAL: 100
  CO PART: 50
  CR PRO: 30

B) GUICHET
  DÉPÔT: 150
  RÉCUP: 80

C) FLUX DÉPART
  Amana GLOBAL: 90
  CO PART: 45
```

#### **Exemple 2 : Centre avec volumes élevés**

```
Centre Rabat

A) FLUX ARRIVÉE
  Amana GLOBAL: 200
  Amana PART: 100
  CO GLOBAL: 150
  CO PART: 80

B) GUICHET
  DÉPÔT: 300
  RÉCUP: 150

C) FLUX DÉPART
  Amana GLOBAL: 180
  CO GLOBAL: 140
```

---

### Erreurs Courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| "Aucun centre trouvé" | Nom de centre modifié | Utiliser le nom exact du template |
| "Certains centres n'ont pas de nom" | Cellule "Nom du Centre" vide | Vérifier que tous les centres ont un nom |
| "Erreur de lecture" | Structure modifiée | Retélécharger le template |
| Centre ignoré | Nom incorrect | Vérifier l'orthographe exacte |

---

## 👨‍💻 GUIDE DÉVELOPPEUR

### Structure des Fichiers

```
simulateur-rh-V2/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── views/
│       │   │   └── VueDirection.jsx          # Vue principale
│       │   └── direction/
│       │       ├── DirectionVolumesCard.jsx  # Composant import
│       │       └── DirectionCentresTable.jsx # Tableau résultats
│       └── lib/
│           └── api.js                        # Appels API
│
└── backend/
    ├── app/
    │   ├── api/
    │   │   └── directions.py                 # Endpoints API
    │   ├── schemas/
    │   │   └── direction_sim.py              # Schémas Pydantic
    │   └── services/
    │       └── direction_v2_service.py       # Logique métier
    └── docs/
        ├── Adaptation_Import_Matriciel_Direction.md
        ├── Backend_Volumes_Matriciels.md
        └── Import_Multi_Centres.md
```

---

### Ajouter un Nouveau Flux

#### **1. Frontend - Mapping**

```javascript
// DirectionVolumesCard.jsx - handleFileUpload

const fluxMap = {
  "Amana": 1,
  "CO": 2,
  "CR": 3,
  "E-Barkia": 4,
  "LRH": 5,
  "NOUVEAU_FLUX": 6  // ← Ajouter ici
};
```

#### **2. Frontend - Template**

```javascript
// VueDirection.jsx - handleDownloadTemplate

templateData.push(["Amana", "", "", "", "", ""]);
templateData.push(["CO", "", "", "", "", ""]);
templateData.push(["CR", "", "", "", "", ""]);
templateData.push(["E-Barkia", "", "", "", "", ""]);
templateData.push(["LRH", "", "", "", "", ""]);
templateData.push(["NOUVEAU_FLUX", "", "", "", "", ""]);  // ← Ajouter ici
```

#### **3. Backend - Conversion**

```python
# direction_v2_service.py - convert_volumes_matriciels_to_classic

flux_mapping = {
    1: "amana",
    2: "courrier_ordinaire",
    3: "courrier_recommande",
    4: "ebarkia",
    5: "lrh",
    6: "nouveau_flux"  # ← Ajouter ici
}

result = {
    "sacs": 0.0,
    "colis": 0.0,
    "courrier_ordinaire": 0.0,
    "courrier_recommande": 0.0,
    "ebarkia": 0.0,
    "lrh": 0.0,
    "nouveau_flux": 0.0,  # ← Ajouter ici
    # ...
}
```

---

### Ajouter un Nouveau Segment

Même logique que pour les flux, mais dans `segmentMap` :

```javascript
const segmentMap = {
  "GLOBAL": 1,
  "PART.": 2,
  "PRO": 3,
  "DIST.": 4,
  "AXES": 5,
  "DÉPÔT": 6,
  "RÉCUP.": 7,
  "NOUVEAU_SEGMENT": 8  // ← Ajouter ici
};
```

---

### Logs de Débogage

#### **Frontend**

```javascript
// VueDirection.jsx
console.log("Centres disponibles:", centres);
console.log("Données importées:", parsedCentres);
console.log("Volumes transformés:", volumesData);
console.log("Payload envoyé:", payload);
```

#### **Backend**

```python
# direction_v2_service.py
print(f"🔹 [V2] Traitement de {len(request.volumes_matriciels)} volumes matriciels")
print(f"🔹 [V2] Volumes matriciels groupés pour {len(matched_volumes_matriciels)} centres")
print(f"🔹 Centre {cid}: Utilisation volumes matriciels ({len(vol_matriciels)} entrées)")
print(f"📊 Volumes matriciels convertis: {result}")
```

---

## 🧪 TESTS ET VALIDATION

### Tests Unitaires

#### **Test 1 : Génération Template**

```javascript
describe('handleDownloadTemplate', () => {
  it('devrait générer un template avec les centres de la direction', () => {
    const centres = [
      { id: 1, label: "Centre A" },
      { id: 2, label: "Centre B" }
    ];
    
    const template = generateTemplate(centres);
    
    expect(template).toContain("Centre A");
    expect(template).toContain("Centre B");
    expect(template).toContain("A) FLUX ARRIVÉE");
    expect(template).toContain("B) GUICHET");
    expect(template).toContain("C) FLUX DÉPART");
  });
});
```

#### **Test 2 : Parsing Excel**

```javascript
describe('handleFileUpload', () => {
  it('devrait parser correctement un fichier Excel matriciel', () => {
    const mockExcelData = [
      ["Nom du Centre:", "Centre Test"],
      [],
      ["A) FLUX ARRIVÉE"],
      ["FLUX \\ SEGMENT", "GLOBAL", "PART.", "PRO", "DIST.", "AXES"],
      ["Amana", "100", "50", "30", "15", "5"],
      // ...
    ];
    
    const result = parseExcelData(mockExcelData);
    
    expect(result).toHaveLength(1);
    expect(result[0].nom_centre).toBe("Centre Test");
    expect(result[0].volumes).toContainEqual({
      flux_id: 1,
      sens_id: 1,
      segment_id: 1,
      volume: 100
    });
  });
});
```

#### **Test 3 : Conversion Backend**

```python
def test_convert_volumes_matriciels():
    volumes = [
        VolumeMatriciel(flux_id=1, sens_id=1, segment_id=1, volume=100),
        VolumeMatriciel(sens_id=2, segment_id=6, volume=150),
        VolumeMatriciel(sens_id=2, segment_id=7, volume=80),
    ]
    
    result = convert_volumes_matriciels_to_classic(volumes)
    
    assert result["amana"] == 100
    assert result["sacs"] == 150
    assert result["colis"] == 80
```

---

### Tests d'Intégration

#### **Test E2E : Workflow Complet**

```javascript
describe('Import Matriciel E2E', () => {
  it('devrait permettre un import complet avec simulation', async () => {
    // 1. Sélectionner direction
    await selectDirection("Direction Nord");
    
    // 2. Télécharger template
    const template = await downloadTemplate();
    expect(template).toBeDefined();
    
    // 3. Simuler remplissage
    const filledTemplate = fillTemplate(template, mockVolumes);
    
    // 4. Importer
    const importResult = await importFile(filledTemplate);
    expect(importResult.centres).toHaveLength(3);
    
    // 5. Vérifier simulation lancée
    await waitFor(() => {
      expect(screen.getByText(/ETP Calculé/)).toBeInTheDocument();
    });
    
    // 6. Vérifier résultats
    const centres = screen.getAllByRole('row');
    expect(centres).toHaveLength(4); // Header + 3 centres
  });
});
```

---

### Scénarios de Test

| # | Scénario | Données | Résultat Attendu |
|---|----------|---------|------------------|
| 1 | Import 1 centre, volumes complets | Centre A avec toutes matrices remplies | Simulation OK, ETP > 0 |
| 2 | Import 3 centres, volumes partiels | 3 centres, certaines cellules vides | Simulation OK, volumes vides = 0 |
| 3 | Import avec nom incorrect | Centre "Test" (n'existe pas) | Centre ignoré, warning console |
| 4 | Import fichier vide | Aucune donnée | Erreur "Aucun centre trouvé" |
| 5 | Import structure modifiée | Colonnes supprimées | Erreur "Erreur de lecture" |
| 6 | Import volumes négatifs | Volumes < 0 | Volumes traités comme 0 |
| 7 | Import très grands volumes | Volumes > 1000000 | Simulation OK, résultats cohérents |

---

## 🔧 DÉPANNAGE

### Problème : Template vide (pas de centres)

**Symptômes** :
- Le template téléchargé ne contient que "Centre Exemple"
- Aucun centre de la direction n'est listé

**Causes** :
1. Variable `centres` vide ou undefined
2. Direction non sélectionnée
3. Centres non chargés

**Solutions** :
```javascript
// Vérifier dans la console
console.log("Centres disponibles:", centres);
console.log("Nombre de centres:", centres?.length);

// Si centres est vide, vérifier le chargement
useEffect(() => {
  if (selectedDirection) {
    actions.loadCentres(selectedDirection);
  }
}, [selectedDirection]);
```

---

### Problème : Centre non trouvé lors de l'import

**Symptômes** :
- Message "Centre non trouvé: XXX" dans la console
- Centre ignoré lors de la simulation

**Causes** :
1. Nom de centre modifié dans Excel
2. Orthographe incorrecte
3. Espaces ou caractères spéciaux

**Solutions** :
1. Vérifier l'orthographe exacte
2. Ne pas modifier les noms dans le template
3. Retélécharger le template si nécessaire

```javascript
// Vérification dans la console
console.log("Nom recherché:", centreData.nom_centre);
console.log("Centres disponibles:", centres.map(c => c.label));
```

---

### Problème : Simulation non lancée

**Symptômes** :
- Import réussi mais pas de résultats
- Tableau des centres vide

**Causes** :
1. Aucun volume valide
2. Erreur dans la transformation
3. Erreur backend

**Solutions** :
```javascript
// Vérifier les volumes transformés
console.log("Volumes transformés:", volumesData);
console.log("Nombre de volumes:", volumesData.length);

// Vérifier le payload
console.log("Payload envoyé:", payload);

// Vérifier la réponse backend
console.log("Réponse backend:", response);
```

---

### Problème : Erreur de lecture Excel

**Symptômes** :
- Message "Erreur de lecture du fichier Excel"
- Import échoue

**Causes** :
1. Structure du fichier modifiée
2. Format de fichier incorrect (.xls au lieu de .xlsx)
3. Fichier corrompu

**Solutions** :
1. Retélécharger le template
2. Ne pas modifier la structure
3. Vérifier le format (.xlsx)
4. Utiliser Excel ou LibreOffice

---

### Problème : Résultats incohérents

**Symptômes** :
- ETP calculé = 0 alors que volumes > 0
- Heures calculées aberrantes

**Causes** :
1. Conversion incorrecte
2. Tâches non chargées
3. Paramètres de simulation incorrects

**Solutions** :
```python
# Vérifier la conversion backend
print(f"📊 Volumes matriciels convertis: {result}")

# Vérifier les tâches
print(f"Nombre de tâches: {len(c_tasks)}")

# Vérifier les paramètres
print(f"Productivité: {global_p.productivite}")
print(f"Heures par jour: {global_p.heures_par_jour}")
```

---

## 📊 MÉTRIQUES ET PERFORMANCE

### Temps de Traitement

| Opération | Temps Moyen | Temps Max |
|-----------|-------------|-----------|
| Génération template | < 1s | 2s |
| Parsing Excel (3 centres) | < 2s | 5s |
| Transformation données | < 0.5s | 1s |
| Simulation backend (3 centres) | 2-5s | 10s |
| **Total** | **5-8s** | **18s** |

### Limites

| Ressource | Limite | Notes |
|-----------|--------|-------|
| Centres par import | 50 | Recommandé : 10-20 |
| Volumes par centre | 75 | 3 sections × 25 cellules |
| Taille fichier Excel | 5 MB | Largement suffisant |
| Temps simulation | 30s | Timeout backend |

---

## 📝 CHANGELOG

### Version 2.0 (07/01/2026)

**Nouvelles fonctionnalités** :
- ✅ Format matriciel (Flux × Sens × Segment)
- ✅ Template pré-rempli par direction
- ✅ Import multi-centres
- ✅ Simulation automatique
- ✅ Support ancien format (compatibilité)

**Améliorations** :
- ✅ Logs détaillés frontend/backend
- ✅ Gestion erreurs robuste
- ✅ Documentation complète
- ✅ Tests unitaires

**Corrections** :
- ✅ Matching centres par nom
- ✅ Conversion volumes matriciels
- ✅ Priorité des sources de données

---

## 🔮 ÉVOLUTIONS FUTURES

### Court Terme

1. **Validation avancée** :
   - Vérifier cohérence des volumes
   - Alertes sur valeurs aberrantes
   - Suggestions de correction

2. **Export résultats** :
   - Export Excel des résultats
   - Comparaison avant/après
   - Historique des imports

3. **Interface améliorée** :
   - Prévisualisation graphique
   - Édition inline des volumes
   - Drag & drop pour import

### Moyen Terme

1. **Import incrémental** :
   - Mise à jour partielle
   - Fusion avec données existantes
   - Gestion des conflits

2. **Templates personnalisés** :
   - Templates par type de centre
   - Templates avec valeurs par défaut
   - Templates multi-directions

3. **Validation métier** :
   - Règles de cohérence
   - Seuils min/max
   - Alertes automatiques

### Long Terme

1. **IA et Prédictions** :
   - Suggestions de volumes
   - Détection d'anomalies
   - Prévisions basées sur historique

2. **Intégration ERP** :
   - Import automatique depuis ERP
   - Synchronisation bidirectionnelle
   - API externe

3. **Mobile** :
   - Application mobile
   - Import depuis mobile
   - Notifications

---

## 📞 SUPPORT

### Contacts

- **Équipe Technique** : dev@tawazoon-rh.ma
- **Support Utilisateur** : support@tawazoon-rh.ma
- **Documentation** : docs.tawazoon-rh.ma

### Ressources

- [Guide Utilisateur PDF](./guides/guide_utilisateur.pdf)
- [Guide Développeur PDF](./guides/guide_developpeur.pdf)
- [Vidéos Tutoriels](./videos/)
- [FAQ](./faq.md)

---

## 📄 LICENCE

© 2026 TAWAZOON RH - Barid Al-Maghrib  
Tous droits réservés.

---

**FIN DE LA DOCUMENTATION**

*Dernière mise à jour : 07 Janvier 2026*
