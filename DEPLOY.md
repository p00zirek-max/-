# Развёртывание Кинотабель

Фронтенд размещается на **GitHub Pages**, API — на **Google Cloud Functions**.

---

## Предварительные требования

1. **GitHub аккаунт** с репозиторием проекта
2. **Google Cloud проект** с включёнными API:
   - Google Sheets API (уже используется)
   - Cloud Functions API
   - Cloud Build API (нужен для деплоя Functions)
3. **Файл `credentials.json`** — ключ сервисного аккаунта Google (тот же, что используется для Google Sheets)
4. **gcloud CLI** — [инструкция по установке](https://cloud.google.com/sdk/docs/install)
5. **Node.js 20+**

---

## Шаг 1: Подготовка Google Cloud

```bash
# Войти в Google Cloud
gcloud auth login

# Установить проект
gcloud config set project ВАШ_PROJECT_ID

# Включить необходимые API
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sheets.googleapis.com
```

---

## Шаг 2: Деплой API (Google Cloud Functions)

```bash
# Из корня проекта:
chmod +x scripts/deploy-api.sh
./scripts/deploy-api.sh
```

Скрипт автоматически:
- Соберёт shared-пакет и серверный TypeScript
- Подготовит пакет для Cloud Functions
- Загрузит функцию в Google Cloud

Опциональные параметры:
```bash
./scripts/deploy-api.sh --project my-project-id --region europe-west1 --memory 512MB
```

После деплоя скрипт выведет URL вашего API, например:
```
https://europe-west1-my-project.cloudfunctions.net/kinotabel-api
```

**Проверьте работу:**
```bash
curl https://europe-west1-ВАШ_PROJECT.cloudfunctions.net/kinotabel-api/api/auth
```

---

## Шаг 3: Настройка GitHub Pages

### 3.1 Включить Pages в настройках репозитория

1. Откройте Settings → Pages
2. Source: **GitHub Actions**

### 3.2 Установить переменную с URL API

1. Откройте Settings → Secrets and variables → Actions → **Variables**
2. Создайте переменную:
   - **Name:** `VITE_API_URL`
   - **Value:** URL вашей Cloud Function (без `/api` в конце)
     Например: `https://europe-west1-my-project.cloudfunctions.net/kinotabel-api`

### 3.3 Запустить деплой

Фронтенд деплоится автоматически при `git push` в ветку `main`.

Можно также запустить вручную:
1. Actions → "Deploy Frontend to GitHub Pages" → Run workflow

После деплоя сайт будет доступен по адресу:
```
https://ВАШ_ЛОГИН.github.io/-/
```

---

## Шаг 4: Проверка

1. Откройте сайт на GitHub Pages
2. Откройте DevTools → Network
3. Убедитесь, что API-запросы идут на Cloud Functions URL
4. Попробуйте войти через персональный токен

---

## Обновление

### Обновить фронтенд
```bash
git add .
git commit -m "Описание изменений"
git push origin main
# GitHub Actions автоматически пересоберёт и задеплоит
```

### Обновить API
```bash
# Внести изменения в server/ или packages/shared/
./scripts/deploy-api.sh
```

---

## Переменные окружения

### Cloud Function (устанавливаются автоматически через deploy-api.sh)
| Переменная | Описание |
|---|---|
| `GOOGLE_CREDENTIALS_JSON` | JSON-ключ сервисного аккаунта |
| `DB_SPREADSHEET_ID` | ID Google-таблицы (базы данных) |

### GitHub Actions (настраиваются в Settings → Variables)
| Переменная | Описание |
|---|---|
| `VITE_API_URL` | URL Cloud Function (без `/api`) |

### Локальная разработка
| Переменная | Описание |
|---|---|
| `VITE_API_URL` | Не устанавливать — Vite проксирует `/api` на `localhost:3000` |

---

## Структура деплоя

```
GitHub Pages (статика)              Google Cloud Functions (API)
┌──────────────────────┐           ┌──────────────────────────────┐
│  client/dist/        │  ──API──▶ │  server/dist/cloud-function  │
│  - index.html        │  запросы  │  - /api/auth                 │
│  - assets/           │           │  - /api/shifts               │
│  - ...               │           │  - /api/employees            │
└──────────────────────┘           │  - /api/extras               │
  https://user.github.io/-/        │  - /api/locations            │
                                   │  - /api/timing               │
                                   │  - /api/reports              │
                                   │  - /api/dashboard            │
                                   │  - /api/export               │
                                   └──────────────────────────────┘
                                     https://region-project.cloudfunctions.net/kinotabel-api
```

---

## Устранение проблем

### CORS ошибки
Cloud Function настроена принимать запросы с `*.github.io` и `localhost`. Если вы используете свой домен, добавьте его в массив `ALLOWED_ORIGINS` в `server/src/cloud-function.ts`.

### 429 Too Many Requests
API имеет лимит 100 запросов/минуту. При массовых операциях подождите минуту.

### Cloud Function не отвечает
```bash
# Проверить логи
gcloud functions logs read kinotabel-api --region europe-west1 --limit 50
```

### GitHub Pages показывает 404
Убедитесь, что в Settings → Pages установлен Source: GitHub Actions (не ветка).
