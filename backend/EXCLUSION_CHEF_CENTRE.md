# ✅ EXCLUSION: Chef de Centre

## 🎯 Modification

Exclusion automatique des tâches associées au poste **"CHEF DE CENTRE COURRIER COLIS DE BAM CATEGORIE C"**.

## 🔧 Code ajouté

```python
    # 🚫 EXCLUSION : CHEF DE CENTRE 🚫
    try:
        # Navigation sécurisée: Tache -> CentrePoste -> Poste -> Label
        cp = getattr(tache, 'centre_poste', None)
        p = getattr(cp, 'poste', None) if cp else None
        p_label = str(getattr(p, 'label', '') or '').strip().upper()
        
        if p_label == "CHEF DE CENTRE COURRIER COLIS DE BAM CATEGORIE C":
             return 0.0, 0.0, 1.0, "EXCLU (Chef de Centre)"
    except Exception:
        pass
```

## 📊 Résultat impact

- **Toutes les tâches** liées à ce poste auront un volume calculé de **0**.
- Le chemin de calcul (Path) affichera : `"EXCLU (Chef de Centre)"`.
- Ces tâches n'impacteront plus le total ETP du centre.

**Fichier modifié**: `backend/app/services/simulation_data_driven.py` (Ligne ~126)
