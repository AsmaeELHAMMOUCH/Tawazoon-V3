# ℹ️ Impact de la Productivité sur les Heures

## observation
Vous avez remarqué que changer la productivité augmente les "Heures/Jour", ce qui impacte ensuite le calcul avec Temps Mort.

## 🔍 Explication Technique

C'est le comportement programmé dans l'interface (Frontend).

### Logique Actuelle (`ProductivityParamsCard.jsx`)

Lorsque vous modifiez la **Productivité** :
1. Le système scalabilise automatiquement les **Heures de Travail Journalières**.
   
   $$ \text{Heures/Jour} = 8 \text{h} \times \frac{\text{Productivité}}{100} $$

   *Exemple :* 
   - Productivité 100% → 8h / jour
   - Productivité 120% → 9.6h / jour

2. Ensuite, le **Temps Mort** est soustrait de ce nouveau total.
   
   $$ \text{Heures Nettes} = \text{Heures/Jour (Ajusté)} - \text{Temps Mort} $$

   *Exemple (Prod 120%, Temps Mort 30min) :*
   - 9.6h - 0.5h = **9.1h** de travail effectif.

### ✅ Conclusion
Ce comportement est **normal** selon le code actuel : une productivité supérieure est interprétée comme une capacité à produire l'équivalent de plus d'heures de travail dans la même journée.
