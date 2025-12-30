# backend/app/api/__init__.py
from .refs import router as refs_router
# from .simulate import router as simulate_router  # Renamed to .bak
from .auth import router as auth_router
from .choixActivite import router as activite_router
from .simuler_centre_par_type import router as simuler_centre_par_type_router
