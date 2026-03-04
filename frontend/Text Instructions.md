# React + TypeScript + Vite

In 2 terminals:

# 1. terminal  - for backend:


> uvicorn main:app --reload --port 8000

Ready to go!



# 2. terminal  - for frontend: 


> npm start 

Ready to go!



// to see database works: 

> sqlite3 scenarios.db


inside sqlite3:
> .tables

> .schema grid_scenarios

> SELECT * FROM grid_scenarios

> SELECT year, grid_ef, transmission_loss FROM grid_scenarios ORDER BY year;



