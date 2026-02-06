# ℹ️ Logique de Calcul : Temps Mort

## ❓ Question
Comment le "Temps mort" impacte-t-il le calcul ?

## 💡 Réponse

Le Temps Mort réduit le temps de travail effectif disponible par jour pour chaque agent.

### 1. Calcul des Heures Nettes
Le système soustrait le temps mort (saisi en minutes) de la durée standard de travail journalière (généralement 8 heures).

$$
\text{Heures Net/Jour} = \text{Heures Standard} - \left( \frac{\text{Temps Mort (min)}}{60} \right)
$$

### 2. Impact sur l'Effectif (ETP)
L'effectif nécessaire (ETP Calculé) est obtenu en divisant la charge totale de travail par ces heures nettes.

$$
\text{ETP} = \frac{\text{Total Heures Travail}}{\text{Heures Net/Jour}}
$$

### 📉 Conséquence
- Si le **Temps Mort augmente** ⬆️
- Les **Heures Net/Jour diminuent** ⬇️
- Donc l'**Effectif Nécessaire (ETP) augmente** ⬆️ (car chaque agent travaille moins de temps effectif).

### 💻 Code Correspondant
`backend/app/services/simulation_data_driven.py` (Lignes ~1658 & 1747)

```python
heures_net_jour = max(0.0, heures_par_jour - (idle_minutes / 60.0))
# ...
fte_calcule = total_heures / heures_net_jour
```
