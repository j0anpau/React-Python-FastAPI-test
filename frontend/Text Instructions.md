# React + TypeScript + Vite

prerequisites: 

cd frontend && npm install      # instala todo lo de package.json
cd backend  && pip install -r requirements.txt  # instala todo lo del venv



In 2 terminals:

# 1. terminal  - for backend:
> cd backend
>source venv/bin/activate

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



