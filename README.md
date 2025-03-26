# SecureShare - Secure File Sharing Platform

SecureShare is a modern, secure file sharing platform built with TypeScript, React, and Express. It provides a robust solution for secure file storage, sharing, and team collaboration with advanced security features.

## Features

### 1. User Authentication & Security
- Secure user registration and login
- JWT-based authentication
- Multi-Factor Authentication (MFA) support
- Account lockout protection
- Session management
- Role-based access control (Admin/User)

### 2. File Management
- Secure file upload and storage
- File encryption at rest
- File organization with folders
- File sharing capabilities
- Trash management (soft delete)
- File restoration from trash
- Permanent file deletion
- File size tracking
- File type detection

### 3. Team Collaboration
- Team member management
- Role-based team access (read/write/admin)
- Team file sharing
- Team activity tracking
- Team folder creation and management
- Shared file access control

### 4. Activity Tracking
- User activity logging
- Team activity monitoring
- File access tracking
- Login attempt monitoring
- Admin activity dashboard

### 5. Admin Features
- User management
- Activity log monitoring
- Team member management
- System overview dashboard

### 6. Security Features
- File encryption using AES-256-GCM
- Secure file storage
- Protected API endpoints
- Rate limiting
- Input validation
- XSS protection
- CSRF protection

## Project Screenshot
![App Screenshot](Screenshot%202025-03-26%20141514.png)



## Tech Stack

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- Shadcn UI components
- React Router for navigation
- Axios for API calls

### Backend
- Node.js with Express
- TypeScript
- JWT for authentication
- File system operations
- In-memory storage (can be extended to database)

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Suhani2305/SecureShare.git
cd SecureShare
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=3000
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
SecureShare/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── utils/        # Utility functions
│   └── public/           # Static assets
├── server/               # Backend Express application
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   ├── storage/         # Storage implementation
│   └── utils/           # Utility functions
└── uploads/             # File upload directory
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/mfa/setup` - Setup MFA
- `POST /api/mfa/verify` - Verify MFA token

### Files
- `GET /api/files` - Get user's files
- `POST /api/files` - Upload file
- `DELETE /api/files/:id` - Delete file
- `GET /api/files/team` - Get team files
- `POST /api/files/:id/share` - Share file

### Team
- `GET /api/team/members` - Get team members
- `POST /api/team/members` - Add team member
- `DELETE /api/team/members/:id` - Remove team member
- `GET /api/team/files` - Get team files
- `POST /api/team/files/folder` - Create team folder
- `GET /api/team/activity` - Get team activity

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/activity-logs` - Get all activity logs

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/) 
