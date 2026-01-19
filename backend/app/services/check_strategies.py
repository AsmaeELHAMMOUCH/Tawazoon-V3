import sys
import os
sys.path.append(r"c:\Users\Aelhammouch\simulateur-rh-V2\backend")

try:
    print("Testing imports...")
    from app.services.strategies.base import VolumeContext
    print("✅ VolumeContext imported")
    
    from app.services.strategies.factory import StrategyFactory
    print("✅ StrategyFactory imported")
    
    from app.services.strategies.plateforme import PlateformeStrategy
    print("✅ PlateformeStrategy imported")
    
    from app.services.strategies.legacy_logic import calculer_volume_standard_logic
    print("✅ legacy_logic imported")
    
    # Try initializing VolumeContext (mock)
    class MockVol:
         volumes_flux = []
    
    ctx = VolumeContext(MockVol())
    print("✅ VolumeContext initialized")
    
    # Check Factory
    strat = StrategyFactory.get_strategy(2064, None)
    print(f"✅ Factory(2064) -> {strat.strategy_name}")
    
    strat8 = StrategyFactory.get_strategy(999, 8)
    print(f"✅ Factory(Cat8) -> {strat8.strategy_name}")
    
    strat_std = StrategyFactory.get_strategy(999, 1)
    print(f"✅ Factory(Std) -> {strat_std.strategy_name}")

    print("ALL TESTS PASSED")
except Exception as e:
    print(f"❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
