from app.core.db import engine
from sqlalchemy import inspect

def check_table():
    inspector = inspect(engine)
    schemas = inspector.get_schema_names()
    print(f"Schemas: {schemas}")
    
    table_name = "attached_sites"
    schema = "dbo"
    
    if table_name in inspector.get_table_names(schema=schema):
        print(f"Table {schema}.{table_name} exists.")
        columns = inspector.get_columns(table_name, schema=schema)
        for col in columns:
            print(f"  Col: {col['name']} ({col['type']})")
    else:
        print(f"Table {schema}.{table_name} NOT found in schema {schema}.")
        # Check in default schema
        if table_name in inspector.get_table_names():
            print(f"Table {table_name} found in default schema.")
        else:
            print(f"Table {table_name} NOT found anywhere.")

if __name__ == "__main__":
    check_table()
