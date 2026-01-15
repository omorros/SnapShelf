# SnapShelf

> Mobile grocery tracker with fast item scanning, expiry reminders, and recipe recommendations to reduce food waste.

![Status](https://img.shields.io/badge/status-active-success.svg)
![Python](https://img.shields.io/badge/python-3.10+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg)
![React Native](https://img.shields.io/badge/React_Native-Expo-black.svg)

## Overview

SnapShelf is a full-stack mobile application that helps users track their food inventory, predict expiration dates, and make informed consumption decisions to reduce food waste. The system leverages AI for intelligent food recognition and data entry while maintaining strict user control over all trusted data.

### Key Principles

- **AI as Assistant, Not Authority**: All AI outputs require explicit user confirmation
- **User Trust First**: Clear separation between AI-suggested (draft) and user-confirmed (inventory) data
- **Backend-Driven Architecture**: All business logic resides in the API; clients remain thin
- **Production-Ready**: Built for real-world deployment with academic rigor

## Features

### Intelligent Food Ingestion
- **Barcode Scanning**: Real-time barcode detection with automatic product lookup via OpenFoodFacts API
- **Image Recognition**: GPT-4o Vision-powered food item identification from photos
- **Manual Entry**: Traditional form-based input for maximum control

### Inventory Management
- **Smart Organization**: Automatic sorting by expiration date with visual indicators
- **Partial Consumption**: Track gradual consumption of items
- **Category-Based Filtering**: Organized by food categories with color coding
- **Expiry Predictions**: AI-assisted expiration date estimation with user override

### Security & Authentication
- **JWT-Based Auth**: Secure token-based authentication with 7-day expiration
- **Password Security**: bcrypt-hashed passwords
- **User Privacy**: Complete data isolation per user account

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT tokens, bcrypt password hashing
- **AI/ML**: OpenAI GPT-4o Vision API
- **External APIs**: OpenFoodFacts for barcode lookup

### Mobile Application
- **Framework**: React Native with Expo SDK
- **Navigation**: Expo Router (file-based routing)
- **Camera**: expo-camera for barcode scanning
- **Storage**: expo-secure-store for token management

### DevOps & Testing
- **Testing**: pytest with comprehensive test coverage
- **API Documentation**: Auto-generated OpenAPI (Swagger) docs
- **Development**: Hot-reload enabled for both backend and mobile

## Architecture

### Data Flow

```
┌─────────────────┐
│  Mobile Client  │
│  (React Native) │
└────────┬────────┘
         │ JWT Auth
         ▼
┌─────────────────┐
│   FastAPI API   │
│   (Backend)     │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────────┐ ┌──────────┐
│ PostgreSQL │ │ OpenAI & │
│     DB     │ │ External │
│            │ │   APIs   │
└────────────┘ └──────────┘
```

### Core Data Models

#### DraftItem (AI-Generated)
Temporary items created by AI ingestion, awaiting user confirmation.
- Nullable fields (quantity, expiry_date, etc.)
- Includes confidence scores
- Source tracking (image/barcode/manual)

#### InventoryItem (User-Confirmed)
Trusted inventory data after user review and confirmation.
- All fields required
- Used for analytics and predictions
- Immutable source of truth

### API Structure

```
/auth
  POST /register          # User registration
  POST /login             # User login (returns JWT)

/api/draft-items
  GET  /                  # List draft items
  POST /                  # Create draft item
  POST /{id}/confirm      # Confirm draft → inventory
  DELETE /{id}            # Delete draft

/api/inventory
  GET  /                  # List inventory items
  GET  /{id}              # Get specific item
  PUT  /{id}              # Update item
  PATCH /{id}/quantity    # Update quantity only
  DELETE /{id}            # Delete item

/api/ingest
  POST /image             # Process image with GPT-4o Vision
  GET  /barcode/{code}    # Lookup barcode product info

/api/expiry
  POST /predict           # Predict expiration date
```

## Getting Started

### Prerequisites

- Python 3.10 or higher
- PostgreSQL database
- Node.js 16+ and npm
- OpenAI API key
- Expo CLI (for mobile development)

### Backend Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd SnapShelf-backend
```

2. Create and activate virtual environment:
```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

Required environment variables:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/snapshelf
SECRET_KEY=your-secret-key-here
OPENAI_API_KEY=sk-...
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

5. Run database migrations:
```bash
# If using Alembic
alembic upgrade head
```

6. Start the development server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### Mobile App Setup

1. Navigate to mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Configure API endpoint:
```typescript
// mobile/services/api.ts
const API_BASE_URL = 'http://YOUR_IP:8000';  // Update with your machine's IP
```

4. Start Expo development server:
```bash
npx expo start
```

5. Run on device:
- Install Expo Go app on your mobile device
- Scan the QR code from the terminal
- Ensure your device is on the same network as your development machine

## Project Structure

```
SnapShelf-backend/
├── app/
│   ├── core/
│   │   ├── config.py              # Configuration management
│   │   ├── database.py            # Database session handling
│   │   └── security.py            # Authentication & hashing
│   ├── models/
│   │   ├── user.py                # User model
│   │   ├── draft_item.py          # Draft item model
│   │   └── inventory_item.py      # Inventory item model
│   ├── schemas/
│   │   ├── auth.py                # Auth request/response schemas
│   │   ├── draft_item.py          # Draft item schemas
│   │   └── inventory_item.py      # Inventory item schemas
│   ├── routers/
│   │   ├── auth.py                # Authentication endpoints
│   │   ├── draft_items.py         # Draft item CRUD
│   │   ├── inventory_items.py     # Inventory CRUD
│   │   ├── ingestion.py           # Image/barcode ingestion
│   │   └── expiry_prediction.py   # Expiry prediction
│   ├── services/
│   │   ├── ingestion/
│   │   │   ├── barcode_ingestion.py
│   │   │   ├── image_ingestion.py
│   │   │   ├── gpt4o_vision.py
│   │   │   └── product_lookup.py
│   │   └── expiry_prediction/
│   │       ├── service.py
│   │       └── strategies/
│   └── main.py                    # Application entry point
├── mobile/
│   ├── app/
│   │   ├── (auth)/               # Authentication screens
│   │   ├── (tabs)/               # Main app tabs
│   │   └── add-item.tsx          # Add item screen
│   ├── services/
│   │   ├── api.ts                # API client
│   │   └── auth.tsx              # Auth context
│   └── types/
│       └── index.ts              # TypeScript definitions
├── tests/
│   ├── test_expiry_prediction.py
│   ├── test_barcode_endpoint.py
│   └── test_image_ingestion.py
├── .env                          # Environment configuration
├── requirements.txt              # Python dependencies
└── README.md                     # This file
```

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_expiry_prediction.py -v
```

### API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Code Style

The project follows:
- **Python**: PEP 8 style guide
- **JavaScript/TypeScript**: ESLint + Prettier
- **Commits**: Conventional Commits specification

## Deployment

### Backend Deployment

The FastAPI backend can be deployed to any platform supporting Python web applications:
- **Railway**: One-click deployment
- **Heroku**: With Postgres add-on
- **AWS**: EC2 + RDS
- **DigitalOcean**: App Platform

Ensure environment variables are properly configured in your deployment platform.

### Mobile App Deployment

```bash
cd mobile

# Build for production
eas build --platform android
eas build --platform ios

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

## Contributing

This project is part of a university final-year Software Engineering project. Contributions are currently limited to project collaborators.

### Development Workflow

1. Create a feature branch from `main`
2. Implement changes with appropriate tests
3. Ensure all tests pass: `pytest`
4. Submit pull request with detailed description

## License

This project is proprietary software developed for academic and commercial purposes.

## Acknowledgments

- **OpenFoodFacts**: Open database for product information
- **OpenAI**: GPT-4o Vision API for image recognition
- **FastAPI**: Modern web framework for building APIs
- **Expo**: React Native development platform

## Contact

For questions or support, please contact the development team.

---

**Note**: This is an active development project. Features and documentation are continuously updated.
