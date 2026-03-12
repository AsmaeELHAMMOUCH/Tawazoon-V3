import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.bandoeng_engine import (
    minus_group, plus_group, apply_factors, resolve_phase_multipliers,
    BandoengParameters
)

def test_helpers():
    print("--- Testing Helpers ---")
    
    # Test minus_group: (1 - 0.2 - 0.1) = 0.7
    m = minus_group(0.2, 0.1)
    if abs(m - 0.7) < 0.001:
        print("[OK] minus_group(0.2, 0.1) = 0.7")
    else:
        print(f"[FAIL] minus_group(0.2, 0.1) = {m}")

    # Test plus_group: (1 + 0.1 + 0.1) = 1.2
    p = plus_group(0.1, 0.1)
    if abs(p - 1.2) < 0.001:
        print("[OK] plus_group(0.1, 0.1) = 1.2")
    else:
        print(f"[FAIL] plus_group(0.1, 0.1) = {p}")

    # Test apply_factors: 10 * 0.5 * 0.8 = 4.0
    f = apply_factors(10.0, [0.5, 0.8])
    if abs(f - 4.0) < 0.001:
        print("[OK] apply_factors(10, [0.5, 0.8]) = 4.0")
    else:
        print(f"[FAIL] apply_factors(10, [0.5, 0.8]) = {f}")

def test_resolver():
    print("\n--- Testing Resolver (User Rules) ---")
    params = BandoengParameters()
    params.coeff_circ = 1.2
    params.coeff_geo = 1.1
    params.pct_collecte = 50.0 # 0.5
    params.pct_marche_ordinaire = 20.0 # 0.2
    params.amana_pct_crbt = 30.0 # 0.3
    params.amana_pct_hors_crbt = 70.0 # 0.7
    
    # Rule 1: circul_geo => plus_group(1.2, 1.1) = 3.3
    factors = resolve_phase_multipliers("circul_geo", "amana", params)
    if factors == [3.3]:
        print("[OK] Rule 1: circul_geo = [3.3]")
    else:
        print(f"[FAIL] Rule 1: circul_geo = {factors}")

    # Rule 2: crbt_circul_geo => [3.3, 0.3]
    factors = resolve_phase_multipliers("crbt_circul_geo", "amana", params)
    if factors == [3.3, 0.3]:
        print("[OK] Rule 2: crbt_circul_geo = [3.3, 0.3]")
    else:
        print(f"[FAIL] Rule 2: crbt_circul_geo = {factors}")

    # Rule 3: hcrbt_circul_geo => [3.3, 0.7]
    factors = resolve_phase_multipliers("hcrbt_circul_geo", "amana", params)
    if factors == [3.3, 0.7]:
        print("[OK] Rule 3: hcrbt_circul_geo = [3.3, 0.7]")
    else:
        print(f"[FAIL] Rule 3: hcrbt_circul_geo = {factors}")

    # Rule 4: march_collect => minus_group(0.2, 0.5) = 0.3
    factors = resolve_phase_multipliers("march_collect", "amana", params)
    if len(factors) == 1 and abs(factors[0] - 0.3) < 0.001:
        print("[OK] Rule 4: march_collect = [0.3]")
    else:
        print(f"[FAIL] Rule 4: march_collect = {factors}")

    # Rule 5: v_master
    params.pct_vague_master = 15.0
    factors = resolve_phase_multipliers("v_master", "amana", params)
    if factors == [0.15]:
        print("[OK] Rule 5: v_master = [0.15]")
    else:
        print(f"[FAIL] Rule 5: v_master = {factors}")

    # Rule 6: b_postale
    params.pct_boite_postale = 25.0
    factors = resolve_phase_multipliers("b_postale", "amana", params)
    if factors == [0.25]:
        print("[OK] Rule 6: b_postale = [0.25]")
    else:
        print(f"[FAIL] Rule 6: b_postale = {factors}")

    # Rule 7: collect
    factors = resolve_phase_multipliers("collect", "amana", params)
    if factors == [0.5]:
        print("[OK] Rule 7: collect = [0.5]")
    else:
        print(f"[FAIL] Rule 7: collect = {factors}")

    # Rule 8: march
    factors = resolve_phase_multipliers("march", "amana", params)
    if factors == [0.2]:
        print("[OK] Rule 8: march = [0.2]")
    else:
        print(f"[FAIL] Rule 8: march = {factors}")

    # Rule 9: retour_crbt
    params.pct_retour = 10.0
    factors = resolve_phase_multipliers("retour_crbt", "amana", params)
    if factors == [0.1, 0.3]:
        print("[OK] Rule 9: retour_crbt = [0.1, 0.3]")
    else:
        print(f"[FAIL] Rule 9: retour_crbt = {factors}")

if __name__ == "__main__":
    test_helpers()
    test_resolver()
