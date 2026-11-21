from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import csv
import os

app = FastAPI()

# Разрешаем фронтенду обращаться к серверу (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

CSV_FILE = "users.csv"

class UserRegister(BaseModel):
    email: str
    nickname: str
    password: str

@app.post("/register")
async def register(user: UserRegister):
    # Проверяем, занят ли email
    if os.path.exists(CSV_FILE):
        with open(CSV_FILE, mode="r", encoding="utf-8") as f:
            reader = csv.reader(f)
            next(reader, None)  # пропускаем заголовки
            for row in reader:
                if len(row) > 1 and row[1].lower() == user.email.lower():
                    raise HTTPException(status_code=400, detail="Этот email уже зарегистрирован")

    # Записываем в CSV (БЕЗ хеширования)
    file_exists = os.path.isfile(CSV_FILE)
    with open(CSV_FILE, mode="a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists or os.path.getsize(CSV_FILE) == 0:
            writer.writerow(["created_at", "email", "nickname", "password"])
        writer.writerow([
            datetime.now().isoformat(),
            user.email,
            user.nickname,
            user.password  # Пароль в открытом виде
        ])
        
    return {"message": "АККАУНТ СОЗДАН", "status": "OK"}

@app.post("/login")
async def login(email: str, password: str):
    if not os.path.exists(CSV_FILE):
        raise HTTPException(status_code=400, detail="Пользователь не найден")
    
    with open(CSV_FILE, mode="r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader, None)  # пропускаем заголовки
        for row in reader:
            if len(row) >= 4:
                if row[1].lower() == email.lower() and row[3] == password:
                    return {"message": "ВХОД ВЫПОЛНЕН", "nickname": row[2], "status": "OK"}
    
    raise HTTPException(status_code=400, detail="Неверный email или пароль")