
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app.core.db import SessionLocal
from app.models.db_models import Flux, VolumeSens, VolumeSegment

def check():
    db = SessionLocal()
    with open('ref_codes_output.txt', 'w') as f:
        try:
            fluxes = db.query(Flux).all()
            senses = db.query(VolumeSens).all()
            segments = db.query(VolumeSegment).all()
            
            f.write("FLUXES:\n")
            for fl in fluxes:
                f.write(f"  ID: {fl.id}, Code: {repr(fl.code)}\n")
                
            f.write("\nSENSES:\n")
            for s in senses:
                f.write(f"  ID: {s.id}, Code: {repr(s.code)}\n")
                
            f.write("\nSEGMENTS:\n")
            for seg in segments:
                f.write(f"  ID: {seg.id}, Code: {repr(seg.code)}\n")
        finally:
            db.close()

if __name__ == "__main__":
    check()
