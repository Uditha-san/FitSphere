"""FitSphere Modular Monolith Domain Modules.

This directory is the container for business domains (e.g. auth, users, workouts, etc.).
Each domain module should follow the layered architecture:
  - router.py     : API endpoints, route handlers, input validation
  - service.py    : Domain business logic & workflow orchestration
  - repository.py : Database queries & persistence operations
  - models.py     : SQLAlchemy database models
  - schemas.py    : Pydantic request and response schemas

Business domains will be introduced when features are implemented.
"""
