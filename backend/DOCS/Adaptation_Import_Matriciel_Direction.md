# 🎯 Adaptation Import Matriciel - Vue Direction

## 📋 Résumé des Modifications

Cette documentation décrit les modifications apportées pour permettre l'import de volumes au format matriciel (Flux × Sens × Segment) et lancer automatiquement la simulation pour plusieurs centres.

---

## 🔄 Workflow Complet

### **1️⃣ Utilisateur**
```
1. Sélectionner Direction
2. Télécharger Template (centres pré-remplis)
3. Remplir les volumes dans les matrices
4. Importer le fichier Excel
5. → Simulation automatique pour tous les centres
```

---

## 📊 Frontend - VueDirection.jsx

### **Modification 1 : handleDownloadTemplate**

✅ **Génération du template avec centres pré-remplis**

```javascript
const handleDownloadTemplate = () => {
  // Génère un template Excel avec:
  // - Tous les centres de la direction
  // - Structure matricielle (Flux × Segment)
  // - 3 sections par centre: Flux Arrivée, Guichet, Flux Départ
  
  centres.forEach((centre, index) => {
    templateData.push(["Nom du Centre:", centre.label]);
    // Sections A, B, C...
  });
}
```

**Résultat** : `Template_Volumes_Direction_Nord_2026-01-07.xlsx`

---

### **Modification 2 : onValidate (ImportModal)**

✅ **Transformation des données importées**

```javascript
onValidate={(parsedCentres) => {
  // parsedCentres = [
  //   {
  //     nom_centre: "Centre Casablanca",
  //     volumes: [
  //       { flux_id: 1, sens_id: 1, segment_id: 1, volume: 100 },
  //       ...
  //     ]
  //   }
  // ]
  
  // Transformer en format API
  const volumesData = parsedCentres.flatMap(centreData => {
    const centre = centres.find(c => c.label === centreData.nom_centre);
    
    return centreData.volumes.map(vol => ({
      centre_id: centre.id,
      centre_label: centre.label,
      flux_id: vol.flux_id,
      sens_id: vol.sens_id,
      segment_id: vol.segment_id,
      volume: vol.volume
    }));
  });
  
  // Lancer simulation
  runSim("data_driven", volumesData);
}}
```

**Entrée** : Centres avec volumes matriciels
**Sortie** : Volumes avec IDs de centres + simulation automatique

---

### **Modification 3 : runSim**

✅ **Détection automatique du format**

```javascript
const runSim = async (modeOverride, volumesOverride) => {
  const payload = {
    direction_id: Number(selectedDirection),
    mode: activeMode,
    global_params: { ... },
    
    // Détection automatique du format
    ...(activeVolumes[0].flux_id !== undefined
      ? { volumes_matriciels: activeVolumes }  // Nouveau format
      : { volumes: activeVolumes })             // Ancien format
  };
  
  await actions.runSimulation(payload);
};
```

**Avantage** : Support des deux formats (compatibilité)

---

## 🔧 Backend - Schémas

### **Modification 1 : Nouveau schéma VolumeMatriciel**

📄 `backend/app/schemas/direction_sim.py`

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

### **Modification 2 : DirectionSimRequest**

```python
class DirectionSimRequest(BaseModel):
    direction_id: int
    mode: str = Field("actuel", pattern="^(actuel|recommande|database|data_driven)$")
    volumes: Optional[List[CentreVolume]] = []  # Ancien format (compatibilité)
    volumes_matriciels: Optional[List[VolumeMatriciel]] = []  # Nouveau format
    global_params: GlobalParams = GlobalParams()
```

**Support des deux formats** :
- `volumes` : Ancien format (sacs, colis, etc.)
- `volumes_matriciels` : Nouveau format (flux_id, sens_id, segment_id)

---

## 📦 Composants - DirectionVolumesCard

### **Modification : Ajout de props centres**

```javascript
export default function DirectionVolumesCard({
    onSimulate,
    loading,
    lastImportStatus,
    centres = []  // ✅ Nouveau prop
}) {
  const handleDownloadTemplate = () => {
    // Génère template avec centres pré-remplis
  };
}
```

---

## 🗺️ Mapping des Données

### **Flux**
| Nom      | ID |
|----------|-----|
| Amana    | 1   |
| CO       | 2   |
| CR       | 3   |
| E-Barkia | 4   |
| LRH      | 5   |

### **Sens**
| Nom     | ID |
|---------|-----|
| Arrivée | 1   |
| Guichet | 2   |
| Départ  | 3   |

### **Segments**
| Nom    | ID |
|--------|-----|
| GLOBAL | 1   |
| PART.  | 2   |
| PRO    | 3   |
| DIST.  | 4   |
| AXES   | 5   |
| DÉPÔT  | 6   |
| RÉCUP. | 7   |

---

## 🔄 Flux de Données Complet

```
1. TÉLÉCHARGEMENT TEMPLATE
   Frontend → handleDownloadTemplate()
   → Génère Excel avec centres pré-remplis
   
2. REMPLISSAGE PAR L'UTILISATEUR
   Excel → Matrices de volumes remplies
   
3. IMPORT
   Excel → ImportModal → handleFileUpload()
   → Parse format matriciel
   → Extrait: [{ nom_centre, volumes: [...] }]
   
4. VALIDATION
   ImportModal → onValidate(parsedCentres)
   → Match centres par nom
   → Transforme en volumesData avec centre_id
   
5. SIMULATION
   onValidate → runSim("data_driven", volumesData)
   → Détecte format matriciel (flux_id présent)
   → Envoie { volumes_matriciels: [...] }
   
6. BACKEND
   API → DirectionSimRequest
   → Reçoit volumes_matriciels
   → Process simulation
   → Retourne résultats
   
7. AFFICHAGE
   Frontend → Mise à jour des centres
   → Affichage des résultats
```

---

## ✅ Avantages

1. **Pré-remplissage** : Noms de centres automatiques
2. **Zéro erreur** : Impossible de se tromper de nom
3. **Multi-centres** : Import de plusieurs centres en une fois
4. **Simulation auto** : Lancement automatique après import
5. **Compatibilité** : Support ancien et nouveau format
6. **Simplicité** : Focus sur les volumes uniquement

---

## 🧪 Tests

### **Test 1 : Import Simple**
```
1. Sélectionner Direction Nord
2. Télécharger template
3. Remplir volumes pour Centre Casablanca
4. Importer
5. ✅ Vérifier simulation lancée
```

### **Test 2 : Import Multi-Centres**
```
1. Sélectionner Direction Sud
2. Télécharger template (3 centres)
3. Remplir volumes pour les 3 centres
4. Importer
5. ✅ Vérifier simulation pour les 3 centres
```

### **Test 3 : Centre Non Trouvé**
```
1. Modifier nom de centre dans Excel
2. Importer
3. ✅ Vérifier warning dans console
4. ✅ Autres centres simulés normalement
```

---

## 🐛 Débogage

### **Console Logs Ajoutés**

```javascript
// handleDownloadTemplate
console.log("Centres disponibles:", centres);
console.log("Nombre de centres:", centres?.length);

// onValidate
console.log("Données importées:", parsedCentres);
console.log("Volumes transformés:", volumesData);

// runSim
console.log("Payload envoyé au backend:", payload);
```

### **Vérifications**

1. **Template vide** → Vérifier que `centres` est rempli
2. **Centre non trouvé** → Vérifier orthographe exacte
3. **Simulation non lancée** → Vérifier console pour erreurs
4. **Format incorrect** → Vérifier structure parsedCentres

---

## 📝 Prochaines Étapes

1. ✅ **Backend** : Adapter service pour traiter `volumes_matriciels`
2. ✅ **Calcul** : Convertir volumes matriciels en heures nécessaires
3. ✅ **Agrégation** : Calculer ETP par centre
4. ✅ **Retour** : Renvoyer résultats au frontend

---

**© 2026 TAWAZOON RH - Barid Al-Maghrib**
