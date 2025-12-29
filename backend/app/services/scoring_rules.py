from typing import List, Dict, Any
import math

class ScoringService:
    @staticmethod
    def get_config() -> List[Dict[str, Any]]:
        """
        Returns the hardcoded configuration for scoring rules.
        In a real app, this could be fetched from DB.
        """
        return [
            {
                "key": "courrier_ordinaire",
                "label": "Courrier Ordinaire",
                "unit": "Courrier Ordinaire/an",
                "weight": 0.15,
                "tiers": [
                    {"min": 0, "max": 50000, "points": 1},
                    {"min": 50001, "max": 200000, "points": 3},
                    {"min": 200001, "max": 1000000, "points": 6},
                    {"min": 1000001, "max": float('inf'), "points": 10},
                ]
            },
            {
                "key": "courrier_recommande",
                "label": "Courrier Recommandé",
                "unit": "Courriers Recommandés/an",
                "weight": 0.10,
                "tiers": [
                    {"min": 0, "max": 10000, "points": 1},
                    {"min": 10001, "max": 50000, "points": 3},
                    {"min": 50001, "max": 100000, "points": 7},
                    {"min": 100001, "max": float('inf'), "points": 10},
                ]
            },
          
            {
                "key": "amana",
                "label": "Amana",
                "unit": "Colis/an",
                "weight": 0.15,
                "tiers": [
                    {"min": 0, "max": 1000, "points": 1},
                    {"min": 1001, "max": 5000, "points": 4},
                    {"min": 5001, "max": 20000, "points": 7},
                    {"min": 20001, "max": float('inf'), "points": 10},
                ]
            },
            {
                "key": "ebarkia",
                "label": "E-Barkia",
                "unit": "E-Barkia/an",
                "weight": 0.10,
                "tiers": [
                    {"min": 0, "max": 500, "points": 1},
                    {"min": 501, "max": 2000, "points": 5},
                    {"min": 2001, "max": float('inf'), "points": 10},
                ]
            },
            {
                "key": "lrh",
                "label": "LRH",
                "unit": "LRH/an",
                "weight": 0.10,
                "tiers": [
                    {"min": 0, "max": 100, "points": 1},
                    {"min": 101, "max": 1000, "points": 5},
                    {"min": 1001, "max": float('inf'), "points": 10},
                ]
            },
            {
                "key": "effectif_global",
                "label": "Effectif Global",
                "unit": "Effectif Global",
                "weight": 0.20,
                "tiers": [
                    {"min": 0, "max": 2, "points": 1},
                    {"min": 2.01, "max": 6, "points": 4},
                    {"min": 6.01, "max": 12, "points": 7},
                    {"min": 12.01, "max": float('inf'), "points": 10},
                ]
            }
        ]

    @staticmethod
    def get_class_thresholds():   # a fixer 
        return {
            "A": {"min": 8.5},
            "B": {"min": 6.0},
            "C": {"min": 3.5},
            "D": {"min": 0.0}
        }

    @staticmethod
    def calculate_score(data: Dict[str, float]) -> Dict[str, Any]:
        """
        Engine logic to calculate score for a single entity (centre).
        """
        config = ScoringService.get_config()
        details = []
        global_score = 0.0

        for item in config:
            key = item['key']
            val = float(data.get(key, 0))
            
            # Find Tier
            # Sort tiers by min just in case
            sorted_tiers = sorted(item['tiers'], key=lambda t: t['min'])
            
            matched_tier = sorted_tiers[0]
            for tier in sorted_tiers:
                if tier['min'] <= val <= tier['max']:
                    matched_tier = tier
                    break
            
            # Fallback if value > all max (should be covered by float('inf') but safe check)
            if val > sorted_tiers[-1]['max']:
                matched_tier = sorted_tiers[-1]

            points = matched_tier['points']
            weight = item['weight']
            score = points * weight
            
            global_score += score
            
            max_str = "+" if matched_tier['max'] == float('inf') else f"{int(matched_tier['max']):,}".replace(',', ' ')
            min_str = f"{int(matched_tier['min']):,}".replace(',', ' ')
            
            details.append({
                "key": key,
                "label": item['label'],
                "value": val,
                "unit": item['unit'],
                "tier_range": f"[{min_str} - {max_str}]",
                "points": points,
                "weight": weight,
                "score": score
            })

        # Determine Class
        thresholds = ScoringService.get_class_thresholds()
        simulated_class = "Classe D" # Default
        if global_score >= thresholds["A"]["min"]:
            simulated_class = "Classe A"
        elif global_score >= thresholds["B"]["min"]:
            simulated_class = "Classe B"
        elif global_score >= thresholds["C"]["min"]:
            simulated_class = "Classe C"
            
        # Top Contributors
        top_contributors = sorted(details, key=lambda x: x['score'], reverse=True)[:3]
        
        return {
            "global_score": global_score,
            "simulated_class": simulated_class,
            "details": details,
            "top_contributors": top_contributors
        }

    @staticmethod
    def determine_impact(current: str, simulated: str) -> str:
        # Map class to rank
        ranks = {
            "Classe A": 4, "A": 4,
            "Classe B": 3, "B": 3,
            "Classe C": 2, "C": 2,
            "Classe D": 1, "D": 1,
            "SANS": 0, "None": 0, None: 0
        }
        
        # Cleanup current label
        curr_key = "SANS"
        if current:
            if "A" in current: curr_key = "Classe A"
            elif "B" in current: curr_key = "Classe B"
            elif "C" in current: curr_key = "Classe C"
            elif "D" in current: curr_key = "Classe D"
            
        r_curr = ranks.get(curr_key, 0)
        r_sim = ranks.get(simulated, 1)
        
        if r_sim > r_curr:
            return "Promotion"
        elif r_sim < r_curr:
            return "Reclassement"
        else:
            return "Stable"
