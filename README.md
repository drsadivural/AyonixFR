# Ayonix Face Recognition System

A professional, visually rich biometric face recognition system with advanced AI capabilities, bilingual support, and real-time face detection.

![Ayonix Face Recognition](https://img.shields.io/badge/Face-Recognition-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)

## 🎯 Features

### Core Biometric Features
- **Face Enrollment**: Capture faces via webcam, photo upload, or mobile device
- **Real-time Face Detection**: Detect multiple faces with 3D landmark visualization
- **1:N Face Matching**: Verify faces against entire enrolled database
- **Confidence Scoring**: Configurable matching thresholds (0-100%)
- **Face Tracking**: Smooth bounding box tracking with landmark points

### AI & Intelligence
- **Bilingual LLM Chat Assistant**: Conversational AI in English and Japanese
- **Voice Transcription**: Speech-to-text using Whisper API (English/Japanese)
- **Context-Aware Responses**: AI understands current page and recent activity
- **Voice Commands**: Hands-free enrollment and verification queries

### Dashboard & Analytics
- **KPI Metrics**: Total enrollees, verifications, success rates
- **Trend Charts**: Enrollment trends and verification distribution
- **Event Timeline**: Comprehensive activity logging
- **Recognition History**: Per-enrollee verification records

### Management
- **Enrollee CRUD**: Full management of registered faces
- **Settings Panel**: Configure LLM, voice, and recognition parameters
- **Multi-Camera Support**: Webcam, external camera, mobile integration
- **S3 Storage**: Secure cloud storage with automatic cleanup

## 🏗️ Architecture

### Technology Stack

**Frontend**
- React 19 with TypeScript
- Tailwind CSS 4 with custom Ayonix Blue theme
- tRPC for type-safe API calls
- Recharts for data visualization
- Wouter for routing
- Shadcn/ui components

**Backend**
- Node.js 22 with Express
- tRPC 11 for end-to-end type safety
- Face-api.js for face detection and recognition
- Drizzle ORM with MySQL
- S3 for file storage

**AI Integration**
- OpenAI/Gemini/Claude for LLM chat
- Whisper API for voice transcription
- Custom face embedding extraction
- Euclidean distance matching algorithm

## 🚀 Getting Started

### Prerequisites
- Node.js 22+
- MySQL database
- S3-compatible storage
- (Optional) LLM API key
- (Optional) Whisper API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/drsadivural/AyonixFR.git
cd AyonixFR
```

2. Install dependencies:
```bash
pnpm install
```

3. Configure environment variables:
```bash
# Copy .env.example to .env and fill in your values
DATABASE_URL=mysql://user:password@host:port/database
# Add other required environment variables
```

4. Push database schema:
```bash
pnpm db:push
```

5. Start development server:
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## 📖 Usage

### Enrolling a Face

1. Navigate to **Enrollment** page
2. Select enrollment method (Camera, Photo Upload, or Mobile)
3. Capture or upload a clear face image
4. Fill in personal information (Name and Surname required)
5. Click **Complete Enrollment**

### Verifying a Face

1. Navigate to **Verification** page
2. Click **Start Camera**
3. Click **Verify Face** when person is in frame
4. View match results with confidence scores

### Using AI Chat Assistant

1. Click the chat icon (bottom-right corner)
2. Select language (English or 日本語)
3. Type your question or click microphone for voice input
4. Get context-aware responses about system usage

### Configuring Settings

Navigate to **Settings** and configure:

**LLM Settings**
- Provider (OpenAI, Gemini, Claude, etc.)
- API Key and Model
- System Prompt for custom behavior

**Voice Settings**
- Language (English/Japanese)
- Voice Engine (Whisper, Google, Azure)
- Input sensitivity and output speed

**Face Recognition**
- Match Threshold (higher = stricter)
- Minimum Face Size
- Multi-face matching toggle

## 🗄️ Database Schema

### Tables

**users**: Authentication and user management
**enrollees**: Registered faces with embeddings
**recognition_logs**: Verification attempt history
**events**: System activity timeline
**settings**: Per-user configuration

## 🔒 Security

- Face embeddings stored as 128-dimensional vectors
- S3 images with non-enumerable paths
- Session-based authentication
- API keys stored securely in environment variables
- HTTPS-only in production

## 🧪 Testing

Run the test suite:
```bash
pnpm test
```

Tests cover:
- Enrollee CRUD operations
- Analytics calculations
- Settings management
- Event logging
- Authentication flows

## 📊 Performance

- Face detection: ~100-200ms per frame
- Face matching: ~50ms per enrollee
- Database queries: <100ms average
- Real-time video processing at 30fps

## 🎨 Design

The application features an elegant **Ayonix Blue** theme with:
- Professional color palette
- Smooth animations and transitions
- Responsive layout (mobile, tablet, desktop)
- Card-based UI with hover effects
- Custom scrollbars and loading states

## 🌐 Internationalization

Full bilingual support:
- **English**: Default language
- **日本語 (Japanese)**: Complete UI and voice support

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 👤 Author

**Dr. Sadi Vural**
- Email: drsadivural@gmail.com
- GitHub: [@drsadivural](https://github.com/drsadivural)

## 🙏 Acknowledgments

- Face-api.js for face detection models
- Manus platform for hosting infrastructure
- OpenAI for LLM capabilities
- Shadcn/ui for component library

## 📞 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Email: drsadivural@gmail.com

---

**Built with ❤️ using modern web technologies**
